import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, IsNull, Repository } from "typeorm";
import { PhaseTemplate } from "../entities/phase-template.entity";
import { TaskTemplate } from "../entities/task-template.entity";
import { ProjectTemplate } from "../entities/project-template.entity";
import { TEMPLATE, newId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import { templateMessages } from "../constants/messages";
import type { TemplatePhase } from "../utils/types";
import type { AddTaskTemplateDto } from "./dto/add-task-template.dto";
import type { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import type { AddPhaseTemplateDto } from "./dto/add-phase-template.dto";
import type { UpdatePhaseTemplateDto } from "./dto/update-phase-template.dto";
import type { CreateProjectTemplateDto } from "./dto/create-project-template.dto";
import type { UpdateProjectTemplateDto } from "./dto/update-project-template.dto";
import type { PhaseTemplateResponse, ProjectTemplateSummary } from "./interface/project-template.interface";

/**
 * Owns the named project templates — each a reusable set of phases + tasks a
 * new project is generated from. The app ships one default ("Standard"),
 * seeded from the in-code TEMPLATE; admins can add more (blank or duplicated)
 * and edit their phases + tasks. `getForBuild(templateId)` is what
 * projects/seed consume to create a project; the scheduling math (computePlanned)
 * is unchanged and lives elsewhere. Editing a template never touches existing
 * projects — a project's phases/tasks are its own snapshot taken at creation.
 */
@Injectable()
export class ProjectTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(ProjectTemplatesService.name);

  constructor(
    @InjectRepository(ProjectTemplate) private readonly templateRepo: Repository<ProjectTemplate>,
    @InjectRepository(PhaseTemplate) private readonly phaseRepo: Repository<PhaseTemplate>,
    @InjectRepository(TaskTemplate) private readonly taskRepo: Repository<TaskTemplate>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  /**
   * Ensure a default template exists and every phase belongs to one. Idempotent:
   * - No templates yet → create "Standard" (default). If phases already exist
   *   (older single-template data), adopt them; otherwise seed the in-code TEMPLATE.
   * - Templates exist → just backfill any orphan phases onto the default.
   */
  async ensureSeeded(): Promise<void> {
    let def = await this.templateRepo.findOne({ where: { isDefault: true } });
    if (!def) {
      const any = await this.templateRepo.count();
      if (any === 0) {
        def = await this.templateRepo.save(this.templateRepo.create({
          id: newId(), name: "Standard", description: "The default Converge project template.",
          isDefault: true, order: 0, createdAt: todayISO(),
        }));
        this.logger.log("Created default project template: Standard.");
      } else {
        // Templates exist but none is flagged default — promote the first.
        def = (await this.templateRepo.find({ order: { order: "ASC" } }))[0];
        def.isDefault = true;
        await this.templateRepo.save(def);
      }
    }

    const phaseCount = await this.phaseRepo.count();
    if (phaseCount === 0) {
      await this.seedInCodeTemplate(def.id);
    } else {
      // Adopt any phases created before templates existed (template_id NULL).
      await this.phaseRepo.update({ templateId: IsNull() }, { templateId: def.id });
    }
  }

  /** Seed the in-code TEMPLATE's phases + tasks under a given template. */
  private async seedInCodeTemplate(templateId: string): Promise<void> {
    const phases: PhaseTemplate[] = [];
    const tasks: TaskTemplate[] = [];
    TEMPLATE.forEach((p, pi) => {
      const phaseId = newId();
      phases.push(this.phaseRepo.create({
        id: phaseId, templateId, name: p.phase, order: pi, critical: p.critical, discipline: p.discipline ?? null,
        weekStart: p.weekStart, durationWeeks: p.durationWeeks,
      }));
      p.tasks.forEach(([name, dayOffset, duration, description], ti) => {
        tasks.push(this.taskRepo.create({
          id: newId(), phaseTemplateId: phaseId, name, description: description ?? "",
          dayOffset, duration, criticalPoints: [], order: ti,
        }));
      });
    });
    await this.phaseRepo.save(phases);
    await this.taskRepo.save(tasks);
    this.logger.log(`Seeded project template: ${phases.length} phases, ${tasks.length} tasks.`);
  }

  /** The id of the default template (needed as a fallback for legacy callers). */
  private async defaultTemplateId(): Promise<string> {
    const def = await this.templateRepo.findOne({ where: { isDefault: true } });
    if (def) return def.id;
    const first = (await this.templateRepo.find({ order: { order: "ASC" } }))[0];
    if (!first) throw new NotFoundException(templateMessages.templateNotFound);
    return first.id;
  }

  /* -------------------------------------------------- template groups (list) */

  /** All templates, with phase/task counts, ordered (default first). */
  async listTemplates(): Promise<ProjectTemplateSummary[]> {
    const [templates, phases, tasks] = await Promise.all([
      this.templateRepo.find({ order: { order: "ASC" } }),
      this.phaseRepo.find({ select: { id: true, templateId: true } }),
      this.taskRepo.find({ select: { id: true, phaseTemplateId: true } }),
    ]);
    const phaseTemplateById = new Map(phases.map(p => [p.id, p.templateId]));
    const phaseCount = new Map<string, number>();
    for (const p of phases) if (p.templateId) phaseCount.set(p.templateId, (phaseCount.get(p.templateId) ?? 0) + 1);
    const taskCount = new Map<string, number>();
    for (const t of tasks) {
      const tid = phaseTemplateById.get(t.phaseTemplateId);
      if (tid) taskCount.set(tid, (taskCount.get(tid) ?? 0) + 1);
    }
    return templates.map(t => ({
      id: t.id, name: t.name, description: t.description ?? "", isDefault: t.isDefault, order: t.order,
      phaseCount: phaseCount.get(t.id) ?? 0, taskCount: taskCount.get(t.id) ?? 0,
    }));
  }

  async createTemplate(dto: CreateProjectTemplateDto): Promise<ProjectTemplateSummary[]> {
    const name = dto.name.trim();
    const clash = await this.templateRepo
      .createQueryBuilder("t")
      .where("LOWER(TRIM(t.name)) = LOWER(TRIM(:name))", { name })
      .getExists();
    if (clash) throw new ConflictException(templateMessages.duplicateTemplateName);

    const maxOrder = (await this.templateRepo.find({ order: { order: "DESC" }, take: 1 }))[0]?.order ?? -1;
    const templateId = newId();

    await this.dataSource.transaction(async (manager) => {
      await manager.save(manager.create(ProjectTemplate, {
        id: templateId, name, description: dto.description?.trim() ?? "",
        isDefault: false, order: maxOrder + 1, createdAt: todayISO(),
      }));

      // Duplicate the source template's phases + tasks (fresh ids) if asked.
      if (dto.sourceTemplateId) {
        const src = await manager.findOne(ProjectTemplate, { where: { id: dto.sourceTemplateId } });
        if (!src) throw new NotFoundException(templateMessages.templateNotFound);
        const srcPhases = await manager.find(PhaseTemplate, { where: { templateId: src.id }, order: { order: "ASC" } });
        const srcPhaseIds = srcPhases.map(p => p.id);
        const srcTasks = srcPhaseIds.length
          ? await manager.find(TaskTemplate, { where: { phaseTemplateId: In(srcPhaseIds) }, order: { order: "ASC" } })
          : [];
        const tasksByPhase = new Map<string, TaskTemplate[]>();
        for (const t of srcTasks) {
          const b = tasksByPhase.get(t.phaseTemplateId); if (b) b.push(t); else tasksByPhase.set(t.phaseTemplateId, [t]);
        }
        for (const ph of srcPhases) {
          const newPhaseId = newId();
          await manager.save(manager.create(PhaseTemplate, {
            id: newPhaseId, templateId, name: ph.name, order: ph.order, critical: ph.critical, discipline: ph.discipline,
            weekStart: ph.weekStart, durationWeeks: ph.durationWeeks,
          }));
          const copies = (tasksByPhase.get(ph.id) ?? []).map(t => manager.create(TaskTemplate, {
            id: newId(), phaseTemplateId: newPhaseId, name: t.name, description: t.description ?? "",
            dayOffset: t.dayOffset, duration: t.duration, criticalPoints: t.criticalPoints ?? [], order: t.order,
          }));
          if (copies.length) await manager.save(copies);
        }
      }
    });

    return this.listTemplates();
  }

  async updateTemplate(id: string, dto: UpdateProjectTemplateDto): Promise<ProjectTemplateSummary[]> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException(templateMessages.templateNotFound);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.templateRepo
        .createQueryBuilder("t")
        .where("LOWER(TRIM(t.name)) = LOWER(TRIM(:name)) AND t.id <> :id", { name, id })
        .getExists();
      if (clash) throw new ConflictException(templateMessages.duplicateTemplateName);
      template.name = name;
    }
    if (dto.description !== undefined) template.description = dto.description;
    await this.templateRepo.save(template);
    return this.listTemplates();
  }

  async deleteTemplate(id: string): Promise<ProjectTemplateSummary[]> {
    const template = await this.templateRepo.findOneBy({ id });
    if (!template) throw new NotFoundException(templateMessages.templateNotFound);
    if (template.isDefault) throw new BadRequestException(templateMessages.cannotDeleteDefault);
    const total = await this.templateRepo.count();
    if (total <= 1) throw new BadRequestException(templateMessages.cannotDeleteLast);
    // Phases (and their tasks, via CASCADE) go with the template.
    await this.templateRepo.delete({ id });
    return this.listTemplates();
  }

  /* --------------------------------------------- a single template's phases */

  /** Grouped phases + tasks for one template (default when id omitted). */
  async getTemplate(templateId?: string): Promise<PhaseTemplateResponse[]> {
    const id = templateId ?? (await this.defaultTemplateId());
    const phases = await this.phaseRepo.find({ where: { templateId: id }, order: { order: "ASC" } });
    const phaseIds = phases.map(p => p.id);
    const tasks = phaseIds.length
      ? await this.taskRepo.find({ where: { phaseTemplateId: In(phaseIds) }, order: { order: "ASC" } })
      : [];
    const tasksByPhase = new Map<string, TaskTemplate[]>();
    for (const t of tasks) {
      const bucket = tasksByPhase.get(t.phaseTemplateId);
      if (bucket) bucket.push(t); else tasksByPhase.set(t.phaseTemplateId, [t]);
    }
    return phases.map(p => ({
      id: p.id, name: p.name, order: p.order, critical: p.critical, discipline: p.discipline,
      weekStart: p.weekStart, durationWeeks: p.durationWeeks,
      tasks: (tasksByPhase.get(p.id) ?? []).map(t => ({
        id: t.id, name: t.name, description: t.description ?? "", dayOffset: t.dayOffset, duration: t.duration,
        criticalPoints: t.criticalPoints ?? [], order: t.order,
      })),
    }));
  }

  /** The template in the shape the project builder expects (TemplatePhase[]). */
  async getForBuild(templateId?: string): Promise<TemplatePhase[]> {
    const grouped = await this.getTemplate(templateId);
    return grouped.map(p => ({
      phase: p.name,
      critical: p.critical,
      discipline: p.discipline ?? undefined,
      weekStart: p.weekStart,
      durationWeeks: p.durationWeeks,
      tasks: p.tasks.map(t => [t.name, t.dayOffset, t.duration, t.description, t.criticalPoints] as [string, number, number, string, string[]]),
    }));
  }

  /* ---------------------------------------------------------------- phases */

  async addPhase(templateId: string, dto: AddPhaseTemplateDto): Promise<PhaseTemplateResponse[]> {
    const template = await this.templateRepo.findOneBy({ id: templateId });
    if (!template) throw new NotFoundException(templateMessages.templateNotFound);
    const siblings = await this.phaseRepo.find({ where: { templateId }, select: { order: true } });
    const nextOrder = siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
    await this.phaseRepo.save(this.phaseRepo.create({
      id: newId(), templateId, name: dto.name, order: nextOrder,
      critical: dto.critical ?? false, discipline: dto.discipline ?? null,
      weekStart: dto.weekStart ?? 1, durationWeeks: dto.durationWeeks ?? 1,
    }));
    return this.getTemplate(templateId);
  }

  async updatePhase(phaseId: string, dto: UpdatePhaseTemplateDto): Promise<PhaseTemplateResponse[]> {
    const phase = await this.phaseRepo.findOneBy({ id: phaseId });
    if (!phase) throw new NotFoundException(templateMessages.phaseNotFound);
    if (dto.name !== undefined) phase.name = dto.name;
    if (dto.critical !== undefined) phase.critical = dto.critical;
    if (dto.discipline !== undefined) phase.discipline = dto.discipline;
    if (dto.weekStart !== undefined) phase.weekStart = dto.weekStart;
    if (dto.durationWeeks !== undefined) phase.durationWeeks = dto.durationWeeks;
    await this.phaseRepo.save(phase);
    return this.getTemplate(phase.templateId ?? undefined);
  }

  async deletePhase(phaseId: string): Promise<PhaseTemplateResponse[]> {
    const phase = await this.phaseRepo.findOneBy({ id: phaseId });
    if (!phase) throw new NotFoundException(templateMessages.phaseNotFound);
    const templateId = phase.templateId ?? undefined;
    // Tasks go with the phase via CASCADE.
    await this.phaseRepo.delete({ id: phaseId });
    return this.getTemplate(templateId);
  }

  /* ----------------------------------------------------------------- tasks */

  /** Resolve the template a phase belongs to, for returning the right group. */
  private async templateIdOfPhase(phaseId: string): Promise<string | undefined> {
    const phase = await this.phaseRepo.findOne({ where: { id: phaseId }, select: { templateId: true } });
    return phase?.templateId ?? undefined;
  }

  async addTask(phaseId: string, dto: AddTaskTemplateDto): Promise<PhaseTemplateResponse[]> {
    const phase = await this.phaseRepo.findOneBy({ id: phaseId });
    if (!phase) throw new NotFoundException(templateMessages.phaseNotFound);
    const siblings = await this.taskRepo.find({ where: { phaseTemplateId: phaseId }, select: { order: true } });
    const nextOrder = siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
    await this.taskRepo.save(this.taskRepo.create({
      id: newId(), phaseTemplateId: phaseId, name: dto.name, description: dto.description ?? "",
      dayOffset: dto.dayOffset ?? 0, duration: dto.duration ?? 1,
      criticalPoints: dto.criticalPoints ?? [], order: nextOrder,
    }));
    return this.getTemplate(phase.templateId ?? undefined);
  }

  /**
   * Renumber a phase's tasks to the given order. The incoming list must be
   * exactly this phase's task ids — no adds, drops, or foreign ids — so the
   * `order` column stays a clean 0..n-1 sequence with no gaps or duplicates.
   */
  async reorderTasks(phaseId: string, taskIds: string[]): Promise<PhaseTemplateResponse[]> {
    const phase = await this.phaseRepo.findOneBy({ id: phaseId });
    if (!phase) throw new NotFoundException(templateMessages.phaseNotFound);

    const tasks = await this.taskRepo.find({ where: { phaseTemplateId: phaseId } });
    const known = new Set(tasks.map(t => t.id));
    const unique = new Set(taskIds);
    if (taskIds.length !== tasks.length || unique.size !== taskIds.length || !taskIds.every(id => known.has(id))) {
      throw new BadRequestException(templateMessages.reorderMismatch);
    }

    const orderById = new Map(taskIds.map((id, i) => [id, i]));
    for (const t of tasks) t.order = orderById.get(t.id)!;
    await this.taskRepo.save(tasks);
    return this.getTemplate(phase.templateId ?? undefined);
  }

  async updateTask(taskId: string, dto: UpdateTaskTemplateDto): Promise<PhaseTemplateResponse[]> {
    const task = await this.taskRepo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException(templateMessages.taskNotFound);
    if (dto.name !== undefined) task.name = dto.name;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dayOffset !== undefined) task.dayOffset = dto.dayOffset;
    if (dto.duration !== undefined) task.duration = dto.duration;
    if (dto.criticalPoints !== undefined) task.criticalPoints = dto.criticalPoints;
    if (dto.order !== undefined) task.order = dto.order;
    await this.taskRepo.save(task);
    return this.getTemplate(await this.templateIdOfPhase(task.phaseTemplateId));
  }

  async deleteTask(taskId: string): Promise<PhaseTemplateResponse[]> {
    const task = await this.taskRepo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException(templateMessages.taskNotFound);
    const templateId = await this.templateIdOfPhase(task.phaseTemplateId);
    await this.taskRepo.delete({ id: taskId });
    return this.getTemplate(templateId);
  }
}
