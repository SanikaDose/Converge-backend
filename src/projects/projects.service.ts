import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import {
  buildProjectPhases, buildTasks, phaseSummaries, projectStatusFromPhases, summarize,
  type PlainPhase, type PlainTask,
} from "../utils/business-logic";
import { todayISO, DEFAULT_WEEK_OFF } from "../utils/date-utils";
import { newId } from "../utils/template";
import { ProjectTemplatesService } from "../project-templates/project-templates.service";
import { projectMessages } from "../constants/messages";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";

function toPlainPhase(p: Phase): PlainPhase {
  return { id: p.id, name: p.name, critical: p.critical, order: p.order, notRequired: !!p.notRequired };
}

// Legacy rows predate `assignees`; fall back to the single `assignedTo`.
function resolveAssignees(t: Pick<Task, "assignees" | "assignedTo">): string[] {
  if (t.assignees && t.assignees.length) return t.assignees;
  return t.assignedTo ? [t.assignedTo] : [];
}

function toPlainTask(t: Task): PlainTask {
  const assignees = resolveAssignees(t);
  return {
    id: t.id, phaseId: t.phaseId, order: t.order, name: t.name, description: t.description,
    assignedTo: t.assignedTo, assignees, priority: t.priority, dependencies: t.dependencies,
    dayOffset: t.dayOffset, duration: t.duration, plannedStart: t.plannedStart, plannedFinish: t.plannedFinish,
    actualStart: t.actualStart, actualFinish: t.actualFinish, status: t.status, history: t.history,
    achievement: t.achievement, pendingChange: t.pendingChange, checklist: t.checklist ?? [],
  };
}

function toTaskLite(tasks: Task[]) {
  return tasks.map(t => ({ phaseId: t.phaseId, name: t.name, plannedFinish: t.plannedFinish, actualFinish: t.actualFinish, status: t.status }));
}

// Trimmed task shape for the Kanban board: only the fields a card, the
// overdue/late math, and the complete-blocked-by-checklist gate read. Omitting
// the heavy jsonb (history/dependencies/pendingChange) keeps the board payload
// small; a drag reloads the project's full detail before saving.
function toBoardTask(t: Task) {
  const assignees = resolveAssignees(t);
  return {
    id: t.id, phaseId: t.phaseId, name: t.name, status: t.status, priority: t.priority,
    assignees, plannedStart: t.plannedStart, plannedFinish: t.plannedFinish, actualFinish: t.actualFinish,
    achievement: t.achievement ?? null, checklist: t.checklist ?? [],
  };
}
function toPhasesLite(phases: Phase[]) {
  return phases.map(p => ({ id: p.id, critical: p.critical, name: p.name, notRequired: !!p.notRequired }));
}

/** Bucket rows by a key, preserving the order the query returned them in. */
function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

function toMeta(project: Project) {
  return {
    name: project.name, type: project.type, customer: project.customer, location: project.location,
    owner: project.ownerId, startDate: project.startDate, endDate: project.endDate,
    createdAt: project.createdAt, updatedAt: project.updatedAt ? project.updatedAt.toISOString() : null,
    financialYear: project.financialYear, warranty: project.warranty ?? null, weekOff: project.weekOff,
    relatedRepositories: project.relatedRepositories ?? [],
    charter: project.charter ?? null,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Phase) private readonly phaseRepo: Repository<Phase>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly templates: ProjectTemplatesService,
  ) { }

  /**
   * Portfolio index: every project with its computed stats. Loads all phases
   * and tasks in two `In(ids)` queries and groups them in memory, rather than
   * one query per project.
   */
  async findAllIndex() {
    const projects = await this.projectRepo.find({ order: { createdAt: "DESC" } });
    if (!projects.length) return [];

    const projectIds = projects.map(p => p.id);
    const [allPhases, allTasks] = await Promise.all([
      this.phaseRepo.find({ where: { projectId: In(projectIds) }, order: { order: "ASC" } }),
      // The index only needs stats + taskLite, so skip the heavy jsonb columns.
      this.taskRepo.find({
        where: { projectId: In(projectIds) },
        order: { order: "ASC" },
        select: {
          id: true, projectId: true, phaseId: true, name: true, status: true,
          plannedStart: true, plannedFinish: true, actualStart: true, actualFinish: true,
        },
      }),
    ]);

    const phasesByProject = groupBy(allPhases, p => p.projectId);
    const tasksByProject = groupBy(allTasks, t => t.projectId);

    const today = todayISO();
    return projects.map((project) => {
      const phases = phasesByProject.get(project.id) ?? [];
      const tasks = tasksByProject.get(project.id) ?? [];
      return this.buildIndexRow(project, phases, tasks, phases.map(toPlainPhase), tasks.map(toPlainTask), today);
    });
  }

  /**
   * Bulk fetch for the Kanban board: the project index plus every project's
   * board-shaped details, in one request built from three queries. This
   * replaces the old `1 + N` fan-out (one detail request per project). The
   * task query and mappers are trimmed to what the board renders — the index
   * to id/name/type (its only use is the filter dropdown), the tasks to
   * `toBoardTask`. A drag reloads the one project's full detail before saving.
   */
  async findAllBoard() {
    const projects = await this.projectRepo.find({ order: { createdAt: "DESC" } });
    if (!projects.length) return { index: [], details: [] };

    const projectIds = projects.map(p => p.id);
    const [allPhases, allTasks] = await Promise.all([
      this.phaseRepo.find({ where: { projectId: In(projectIds) }, order: { order: "ASC" } }),
      this.taskRepo.find({
        where: { projectId: In(projectIds) },
        order: { order: "ASC" },
        // assignedTo is selected only to back-fill assignees for legacy rows.
        select: {
          id: true, projectId: true, phaseId: true, name: true, status: true, priority: true,
          assignedTo: true, assignees: true, plannedStart: true, plannedFinish: true,
          actualStart: true, actualFinish: true, achievement: true, checklist: true,
        },
      }),
    ]);

    const phasesByProject = groupBy(allPhases, p => p.projectId);
    const tasksByProject = groupBy(allTasks, t => t.projectId);

    const index = projects.map(p => ({ id: p.id, name: p.name, type: p.type }));
    const details = projects.map((project) => ({
      id: project.id,
      meta: { name: project.name, type: project.type, weekOff: project.weekOff },
      phases: (phasesByProject.get(project.id) ?? []).map(p => ({ id: p.id, name: p.name, notRequired: !!p.notRequired })),
      tasks: (tasksByProject.get(project.id) ?? []).map(toBoardTask),
    }));

    return { index, details };
  }

  /** Compute one index row (stats + lite arrays) from loaded phase/task rows. */
  private buildIndexRow(
    project: Project, phases: Phase[], tasks: Task[],
    plainPhases: PlainPhase[], plainTasks: PlainTask[], today: string,
  ) {
    // Totals exclude not-required phases; summarize excludes not-required tasks.
    const notRequiredPhaseIds = new Set(plainPhases.filter(p => p.notRequired).map(p => p.id));
    const countableTasks = plainTasks.filter(t => !notRequiredPhaseIds.has(t.phaseId));
    const s = summarize(countableTasks, today);
    const phaseRows = phaseSummaries(plainPhases, plainTasks, today, project.startDate);
    const bucket = projectStatusFromPhases(phaseRows);
    return {
      id: project.id, name: project.name, type: project.type, customer: project.customer,
      location: project.location,
      owner: project.ownerId, startDate: project.startDate, endDate: project.endDate,
      updatedAt: project.updatedAt ? project.updatedAt.toISOString() : null,
      financialYear: project.financialYear,
      pct: s.pct, completed: s.completed, total: s.total, delayed: s.delayed, plannedEnd: s.plannedEnd,
      bucket, taskLite: toTaskLite(tasks), phasesLite: toPhasesLite(phases),
    };
  }

  async findOneDetail(id: string) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) throw new NotFoundException(projectMessages.notFound);
    const [phases, tasks] = await Promise.all([
      this.phaseRepo.find({ where: { projectId: id }, order: { order: "ASC" } }),
      this.taskRepo.find({ where: { projectId: id }, order: { order: "ASC" } }),
    ]);
    return { id: project.id, meta: toMeta(project), phases: phases.map(toPlainPhase), tasks: tasks.map(toPlainTask) };
  }

  async create(dto: CreateProjectDto) {
    // Reject a duplicate name (case- and whitespace-insensitive).
    const duplicate = await this.projectRepo
      .createQueryBuilder("p")
      .where("LOWER(TRIM(p.name)) = LOWER(TRIM(:name))", { name: dto.name })
      .getExists();
    if (duplicate) throw new ConflictException(projectMessages.duplicateName);

    const weekOff = dto.weekOff && dto.weekOff.length ? dto.weekOff.slice(0, 2) : DEFAULT_WEEK_OFF;
    const disciplines = dto.disciplines ?? [];
    const id = newId();
    // Phases/tasks are generated from the (admin-editable) DB template, filtered
    // by discipline, and scheduled by buildTasks. This is a one-time snapshot —
    // later template edits never touch an existing project.
    const template = await this.templates.getForBuild(dto.templateId);
    const plainPhases = buildProjectPhases(template, disciplines);
    const plainTasks = buildTasks(dto.startDate, plainPhases, weekOff, template, disciplines);

    // Project + phases + tasks must all commit or none: a project without its
    // phases/tasks can't be rendered.
    await this.dataSource.transaction(async (manager) => {
      const project = manager.create(Project, {
        id,
        name: dto.name,
        type: dto.type,
        customer: dto.customer,
        location: dto.location || null,
        ownerId: dto.owner || null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        createdAt: todayISO(),
        updatedAt: new Date(),
        financialYear: dto.financialYear || null,
        weekOff,
        relatedRepositories: dto.relatedRepositories ?? [],
        // Charter is captured for Solution projects; Products send none.
        charter: dto.charter ?? null,
      });
      await manager.save(project);
      await manager.save(plainPhases.map(p => manager.create(Phase, { ...p, projectId: id })));
      await manager.save(plainTasks.map(t => manager.create(Task, { ...t, projectId: id, dependencies: t.dependencies, history: t.history })));
    });

    return this.findOneDetail(id);
  }

  async update(id: string, dto: UpdateProjectDto) {
    // Transactional because syncTasks/syncPhases DELETE the rows missing from
    // the payload before saving the rest — a mid-way failure would lose data.
    await this.dataSource.transaction(async (manager) => {
      const project = await manager.findOneBy(Project, { id });
      if (!project) throw new NotFoundException(projectMessages.notFound);

      if (dto.meta) {
        if (dto.meta.name !== undefined) project.name = dto.meta.name;
        if (dto.meta.type !== undefined) project.type = dto.meta.type;
        if (dto.meta.customer !== undefined) project.customer = dto.meta.customer;
        if (dto.meta.location !== undefined) project.location = dto.meta.location;
        if (dto.meta.owner !== undefined) project.ownerId = dto.meta.owner;
        if (dto.meta.startDate !== undefined) project.startDate = dto.meta.startDate;
        if (dto.meta.endDate !== undefined) project.endDate = dto.meta.endDate;
        if (dto.meta.financialYear !== undefined) project.financialYear = dto.meta.financialYear;
        if (dto.meta.warranty !== undefined) project.warranty = dto.meta.warranty;
        if (dto.meta.weekOff !== undefined) project.weekOff = dto.meta.weekOff;
        if (dto.meta.relatedRepositories !== undefined) {
            project.relatedRepositories = dto.meta.relatedRepositories;
        }
      }

      // Bump "last updated" on any change, including phase/task-only edits.
      project.updatedAt = new Date();
      await manager.save(project);

      if (dto.phases) await this.syncPhases(manager, id, dto.phases);
      if (dto.tasks) await this.syncTasks(manager, id, dto.tasks);
    });

    return this.findOneDetail(id);
  }

  // Phases/tasks cascade-delete via their project FK, so deleting the row is enough.
  async remove(id: string) {
    const result = await this.projectRepo.delete({ id });
    if (!result.affected) throw new NotFoundException(projectMessages.notFound);
    return { id };
  }

  // Full sync: the frontend PATCHes the complete phases/tasks arrays it holds
  // (add/delete/reorder/edit all go through here — see ProjectDetail.tsx), so we
  // replace wholesale — upsert everything present, delete anything missing.
  private async syncPhases(manager: EntityManager, projectId: string, incoming: UpdateProjectDto["phases"]) {
    if (!incoming) return;
    const existing = await manager.find(Phase, { where: { projectId }, select: { id: true } });
    const incomingIds = new Set(incoming.map(p => p.id));
    const toDelete = existing.filter(p => !incomingIds.has(p.id)).map(p => p.id);
    if (toDelete.length) await manager.delete(Phase, { id: In(toDelete) });
    await manager.save(incoming.map(p => manager.create(Phase, {
      id: p.id, projectId, name: p.name, critical: p.critical, order: p.order, notRequired: !!p.notRequired,
    })));
  }

  private async syncTasks(manager: EntityManager, projectId: string, incoming: NonNullable<UpdateProjectDto["tasks"]>) {
    const existing = await manager.find(Task, { where: { projectId }, select: { id: true } });
    const incomingIds = new Set(incoming.map(t => t.id));
    const toDelete = existing.filter(t => !incomingIds.has(t.id)).map(t => t.id);
    if (toDelete.length) await manager.delete(Task, { id: In(toDelete) });
    await manager.save(incoming.map(t => {
      // Owners live in `assignees`; `assignedTo` mirrors the first so its FK to
      // employees stays valid and single-avatar display keeps working.
      const assignees = Array.isArray(t.assignees) ? t.assignees.filter(Boolean) : (t.assignedTo ? [t.assignedTo] : []);
      const assignedTo = assignees[0] ?? null;
      return manager.create(Task, {
        id: t.id, phaseId: t.phaseId, projectId, order: t.order, name: t.name,
        description: t.description ?? "", assignedTo, assignees, priority: (t.priority as Task["priority"]) ?? "Medium",
        dependencies: t.dependencies ?? [], dayOffset: t.dayOffset, duration: t.duration,
        plannedStart: t.plannedStart, plannedFinish: t.plannedFinish,
        actualStart: t.actualStart ?? null, actualFinish: t.actualFinish ?? null,
        status: (t.status as Task["status"]) ?? "Not Started",
        pendingChange: (t.pendingChange as Task["pendingChange"]) ?? null,
        achievement: (t.achievement as Task["achievement"]) ?? null,
        history: (t.history as Task["history"]) ?? [],
        checklist: (t.checklist as Task["checklist"]) ?? [],
      });
    }));
  }
}
