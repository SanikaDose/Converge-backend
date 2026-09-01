import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PhaseTemplate } from "../entities/phase-template.entity";
import { TaskTemplate } from "../entities/task-template.entity";
import { TEMPLATE, newId } from "../utils/template";
import { templateMessages } from "../constants/messages";
import type { TemplatePhase } from "../utils/types";
import type { AddTaskTemplateDto } from "./dto/add-task-template.dto";
import type { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import type { PhaseTemplateResponse } from "./interface/project-template.interface";

/**
 * Owns the master project template — the phases and their default tasks a
 * new project is generated from. Data now, not hardcode: seeded once from
 * the in-code TEMPLATE, then editable by admins. `getForBuild()` is what
 * projects/seed consume to create a project; the scheduling math that turns
 * these into dated tasks (computePlanned) is unchanged and lives elsewhere.
 */
@Injectable()
export class ProjectTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(ProjectTemplatesService.name);

  constructor(
    @InjectRepository(PhaseTemplate) private readonly phaseRepo: Repository<PhaseTemplate>,
    @InjectRepository(TaskTemplate) private readonly taskRepo: Repository<TaskTemplate>,
  ) {}

  /**
   * The template is essential data — new projects are generated from it — so
   * it's seeded on every boot if missing, independent of SEED_ON_BOOT (which
   * gates demo data). Idempotent, so it's safe to always run.
   */
  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  /**
   * First-run seed: copy the in-code TEMPLATE into the two tables if they're
   * empty. Idempotent — once seeded it never runs again, so admin edits are
   * never overwritten (unlike the org directory, which is reconciled).
   */
  async ensureSeeded(): Promise<void> {
    const count = await this.phaseRepo.count();
    if (count > 0) return;

    const phases: PhaseTemplate[] = [];
    const tasks: TaskTemplate[] = [];
    TEMPLATE.forEach((p, pi) => {
      const phaseId = newId();
      phases.push(this.phaseRepo.create({
        id: phaseId, name: p.phase, order: pi, critical: p.critical, discipline: p.discipline ?? null,
      }));
      p.tasks.forEach(([name, dayOffset, duration, description], ti) => {
        tasks.push(this.taskRepo.create({ id: newId(), phaseTemplateId: phaseId, name, description: description ?? "", dayOffset, duration, order: ti }));
      });
    });
    await this.phaseRepo.save(phases);
    await this.taskRepo.save(tasks);
    this.logger.log(`Seeded project template: ${phases.length} phases, ${tasks.length} tasks.`);
  }



  // 
  /** Grouped phases + tasks, ordered — for the API (create form + admin screen). */
  async getTemplate(): Promise<PhaseTemplateResponse[]> {
    const [phases, tasks] = await Promise.all([
      this.phaseRepo.find({ order: { order: "ASC" } }),
      this.taskRepo.find({ order: { order: "ASC" } }),
    ]);
    const tasksByPhase = new Map<string, TaskTemplate[]>();
    for (const t of tasks) {
      const bucket = tasksByPhase.get(t.phaseTemplateId);
      if (bucket) bucket.push(t); else tasksByPhase.set(t.phaseTemplateId, [t]);
    }
    return phases.map(p => ({
      id: p.id, name: p.name, order: p.order, critical: p.critical, discipline: p.discipline,
      tasks: (tasksByPhase.get(p.id) ?? []).map(t => ({
        id: t.id, name: t.name, description: t.description ?? "", dayOffset: t.dayOffset, duration: t.duration, order: t.order,
      })),
    }));
  }

  /** The template in the shape the project builder expects (TemplatePhase[]). */
  async getForBuild(): Promise<TemplatePhase[]> {
    const grouped = await this.getTemplate();
    return grouped.map(p => ({
      phase: p.name,
      critical: p.critical,
      discipline: p.discipline ?? undefined,
      tasks: p.tasks.map(t => [t.name, t.dayOffset, t.duration, t.description] as [string, number, number, string]),
    }));
  }

  async addTask(phaseId: string, dto: AddTaskTemplateDto): Promise<PhaseTemplateResponse[]> {
    const phase = await this.phaseRepo.findOneBy({ id: phaseId });
    if (!phase) throw new NotFoundException(templateMessages.phaseNotFound);
    const siblings = await this.taskRepo.find({ where: { phaseTemplateId: phaseId }, select: { order: true } });
    const nextOrder = siblings.length ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
    await this.taskRepo.save(this.taskRepo.create({
      id: newId(), phaseTemplateId: phaseId, name: dto.name, description: dto.description ?? "", dayOffset: dto.dayOffset, duration: dto.duration, order: nextOrder,
    }));
    return this.getTemplate();
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
    return this.getTemplate();
  }

  async updateTask(taskId: string, dto: UpdateTaskTemplateDto): Promise<PhaseTemplateResponse[]> {
    const task = await this.taskRepo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException(templateMessages.taskNotFound);
    if (dto.name !== undefined) task.name = dto.name;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dayOffset !== undefined) task.dayOffset = dto.dayOffset;
    if (dto.duration !== undefined) task.duration = dto.duration;
    if (dto.order !== undefined) task.order = dto.order;
    await this.taskRepo.save(task);
    return this.getTemplate();
  }

  async deleteTask(taskId: string): Promise<PhaseTemplateResponse[]> {
    const result = await this.taskRepo.delete({ id: taskId });
    if (!result.affected) throw new NotFoundException(templateMessages.taskNotFound);
    return this.getTemplate();
  }
}
