import { Injectable, NotFoundException } from "@nestjs/common";
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
import { projectMessages } from "../constants/messages";
import type { CreateProjectDto } from "./dto/create-project.dto";
import type { UpdateProjectDto } from "./dto/update-project.dto";

function toPlainPhase(p: Phase): PlainPhase {
  return { id: p.id, name: p.name, critical: p.critical, order: p.order };
}

function toPlainTask(t: Task): PlainTask {
  return {
    id: t.id, phaseId: t.phaseId, order: t.order, name: t.name, description: t.description,
    assignedTo: t.assignedTo, priority: t.priority, dependencies: t.dependencies,
    dayOffset: t.dayOffset, duration: t.duration, plannedStart: t.plannedStart, plannedFinish: t.plannedFinish,
    actualStart: t.actualStart, actualFinish: t.actualFinish, status: t.status, history: t.history,
    achievement: t.achievement, pendingChange: t.pendingChange, checklist: t.checklist ?? [],
  };
}

function toTaskLite(tasks: Task[]) {
  return tasks.map(t => ({ phaseId: t.phaseId, name: t.name, plannedFinish: t.plannedFinish, actualFinish: t.actualFinish, status: t.status }));
}
function toPhasesLite(phases: Phase[]) {
  return phases.map(p => ({ id: p.id, critical: p.critical, name: p.name }));
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
    createdAt: project.createdAt, weekOff: project.weekOff,
  };
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Phase) private readonly phaseRepo: Repository<Phase>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Fetches every project's phases and tasks in two queries and groups them
   * in memory, rather than querying per project.
   *
   * This was `1 + 2N` queries — the per-project fetches were inside a map,
   * so the parallel `Promise.all` hid the count without reducing it: 4
   * projects meant 9 round trips, 100 projects would mean 201. Grouping
   * client-side is cheap; the round trips are what cost.
   */
  async findAllIndex() {
    const projects = await this.projectRepo.find({ order: { createdAt: "DESC" } });
    if (!projects.length) return [];

    const projectIds = projects.map(p => p.id);
    const [allPhases, allTasks] = await Promise.all([
      this.phaseRepo.find({ where: { projectId: In(projectIds) }, order: { order: "ASC" } }),
      this.taskRepo.find({ where: { projectId: In(projectIds) }, order: { order: "ASC" } }),
    ]);

    const phasesByProject = groupBy(allPhases, p => p.projectId);
    const tasksByProject = groupBy(allTasks, t => t.projectId);

    const today = todayISO();
    return projects.map((project) => {
      const phases = phasesByProject.get(project.id) ?? [];
      const tasks = tasksByProject.get(project.id) ?? [];
      const plainTasks = tasks.map(toPlainTask);
      const s = summarize(plainTasks, today);
      const phaseRows = phaseSummaries(phases.map(toPlainPhase), plainTasks, today, project.startDate);
      const bucket = projectStatusFromPhases(phaseRows);
      return {
        id: project.id, name: project.name, type: project.type, customer: project.customer,
        owner: project.ownerId, startDate: project.startDate, endDate: project.endDate,
        pct: s.pct, completed: s.completed, total: s.total, delayed: s.delayed, plannedEnd: s.plannedEnd,
        bucket, taskLite: toTaskLite(tasks), phasesLite: toPhasesLite(phases),
      };
    });
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
    const weekOff = dto.weekOff && dto.weekOff.length ? dto.weekOff.slice(0, 2) : DEFAULT_WEEK_OFF;
    const id = newId();
    const plainPhases = buildProjectPhases();
    const plainTasks = buildTasks(dto.startDate, plainPhases, weekOff);

    // One transaction: a project row with phases but no tasks (or vice
    // versa) is not a state the app can render, so a partial failure must
    // roll the whole thing back rather than leave a broken project behind.
    await this.dataSource.transaction(async (manager) => {
      const project = manager.create(Project, {
        id, name: dto.name, type: dto.type, customer: dto.customer, location: dto.location || null,
        ownerId: dto.owner || null, startDate: dto.startDate, endDate: dto.endDate, createdAt: todayISO(), weekOff,
      });
      await manager.save(project);
      await manager.save(plainPhases.map(p => manager.create(Phase, { ...p, projectId: id })));
      await manager.save(plainTasks.map(t => manager.create(Task, { ...t, projectId: id, dependencies: t.dependencies, history: t.history })));
    });

    return this.findOneDetail(id);
  }

  async update(id: string, dto: UpdateProjectDto) {
    // Transactional for a sharper reason than create: syncTasks DELETEs the
    // rows missing from the payload before saving the rest. Outside a
    // transaction a failure between those two steps loses tasks
    // irrecoverably — there's no second copy to re-sync from.
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
        if (dto.meta.weekOff !== undefined) project.weekOff = dto.meta.weekOff;
        await manager.save(project);
      }

      if (dto.phases) await this.syncPhases(manager, id, dto.phases);
      if (dto.tasks) await this.syncTasks(manager, id, dto.tasks);
    });

    return this.findOneDetail(id);
  }

  // Phases/tasks cascade at the DB level (onDelete: "CASCADE" on their
  // project FK — see the entities), so removing the project row is enough.
  async remove(id: string) {
    // `delete` issues one statement and reports rows affected, so the
    // existence check comes free — the previous SELECT-then-DELETE pair
    // cost an extra round trip and could still race between the two.
    const result = await this.projectRepo.delete({ id });
    if (!result.affected) throw new NotFoundException(projectMessages.notFound);
    return { id };
  }

  // Full-sync semantics: the frontend always PATCHes the complete
  // phases/tasks arrays it holds in React state (add/delete/reorder/edit
  // all go through this same path — see ProjectDetail.tsx), so "replace
  // wholesale" is the correct merge strategy, not a partial diff.
  private async syncPhases(manager: EntityManager, projectId: string, incoming: UpdateProjectDto["phases"]) {
    if (!incoming) return;
    // Only the ids are needed to work out what to delete — selecting the
    // whole row to read one column is wasted I/O on every save.
    const existing = await manager.find(Phase, { where: { projectId }, select: { id: true } });
    const incomingIds = new Set(incoming.map(p => p.id));
    const toDelete = existing.filter(p => !incomingIds.has(p.id)).map(p => p.id);
    if (toDelete.length) await manager.delete(Phase, { id: In(toDelete) });
    await manager.save(incoming.map(p => manager.create(Phase, { ...p, projectId })));
  }

  private async syncTasks(manager: EntityManager, projectId: string, incoming: NonNullable<UpdateProjectDto["tasks"]>) {
    const existing = await manager.find(Task, { where: { projectId }, select: { id: true } });
    const incomingIds = new Set(incoming.map(t => t.id));
    const toDelete = existing.filter(t => !incomingIds.has(t.id)).map(t => t.id);
    if (toDelete.length) await manager.delete(Task, { id: In(toDelete) });
    await manager.save(incoming.map(t => manager.create(Task, {
      id: t.id, phaseId: t.phaseId, projectId, order: t.order, name: t.name,
      description: t.description ?? "", assignedTo: t.assignedTo ?? null, priority: (t.priority as Task["priority"]) ?? "Medium",
      dependencies: t.dependencies ?? [], dayOffset: t.dayOffset, duration: t.duration,
      plannedStart: t.plannedStart, plannedFinish: t.plannedFinish,
      actualStart: t.actualStart ?? null, actualFinish: t.actualFinish ?? null,
      status: (t.status as Task["status"]) ?? "Not Started",
      pendingChange: (t.pendingChange as Task["pendingChange"]) ?? null,
      achievement: (t.achievement as Task["achievement"]) ?? null,
      history: (t.history as Task["history"]) ?? [],
      checklist: (t.checklist as Task["checklist"]) ?? [],
    })));
  }
}
