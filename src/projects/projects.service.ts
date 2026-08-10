import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import {
  buildProjectPhases, buildTasks, phaseSummaries, projectStatusFromPhases, summarize,
  type PlainPhase, type PlainTask,
} from "../common/business-logic";
import { todayISO, DEFAULT_WEEK_OFF } from "../common/date-utils";
import { genId } from "../common/template";
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
  ) {}

  async findAllIndex() {
    const projects = await this.projectRepo.find({ order: { createdAt: "DESC" } });
    const today = todayISO();
    return Promise.all(projects.map(async (project) => {
      const [phases, tasks] = await Promise.all([
        this.phaseRepo.find({ where: { projectId: project.id } }),
        this.taskRepo.find({ where: { projectId: project.id } }),
      ]);
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
    }));
  }

  async findOneDetail(id: string) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) throw new NotFoundException("Project not found.");
    const [phases, tasks] = await Promise.all([
      this.phaseRepo.find({ where: { projectId: id }, order: { order: "ASC" } }),
      this.taskRepo.find({ where: { projectId: id }, order: { order: "ASC" } }),
    ]);
    return { id: project.id, meta: toMeta(project), phases: phases.map(toPlainPhase), tasks: tasks.map(toPlainTask) };
  }

  async create(dto: CreateProjectDto) {
    const weekOff = dto.weekOff && dto.weekOff.length ? dto.weekOff.slice(0, 2) : DEFAULT_WEEK_OFF;
    const id = genId("proj");
    const plainPhases = buildProjectPhases();
    const plainTasks = buildTasks(dto.startDate, plainPhases, weekOff);

    const project = this.projectRepo.create({
      id, name: dto.name, type: dto.type, customer: dto.customer, location: dto.location || null,
      ownerId: dto.owner || null, startDate: dto.startDate, endDate: dto.endDate, createdAt: todayISO(), weekOff,
    });
    await this.projectRepo.save(project);
    await this.phaseRepo.save(plainPhases.map(p => this.phaseRepo.create({ ...p, projectId: id })));
    await this.taskRepo.save(plainTasks.map(t => this.taskRepo.create({ ...t, projectId: id, dependencies: t.dependencies, history: t.history })));

    return this.findOneDetail(id);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) throw new NotFoundException("Project not found.");

    if (dto.meta) {
      if (dto.meta.name !== undefined) project.name = dto.meta.name;
      if (dto.meta.type !== undefined) project.type = dto.meta.type;
      if (dto.meta.customer !== undefined) project.customer = dto.meta.customer;
      if (dto.meta.location !== undefined) project.location = dto.meta.location;
      if (dto.meta.owner !== undefined) project.ownerId = dto.meta.owner;
      if (dto.meta.startDate !== undefined) project.startDate = dto.meta.startDate;
      if (dto.meta.endDate !== undefined) project.endDate = dto.meta.endDate;
      if (dto.meta.weekOff !== undefined) project.weekOff = dto.meta.weekOff;
      await this.projectRepo.save(project);
    }

    if (dto.phases) {
      await this.syncPhases(id, dto.phases);
    }
    if (dto.tasks) {
      await this.syncTasks(id, dto.tasks);
    }

    return this.findOneDetail(id);
  }

  // Full-sync semantics: the frontend always PATCHes the complete
  // phases/tasks arrays it holds in React state (add/delete/reorder/edit
  // all go through this same path — see ProjectDetail.tsx), so "replace
  // wholesale" is the correct merge strategy, not a partial diff.
  private async syncPhases(projectId: string, incoming: UpdateProjectDto["phases"]) {
    if (!incoming) return;
    const existing = await this.phaseRepo.find({ where: { projectId } });
    const incomingIds = new Set(incoming.map(p => p.id));
    const toDelete = existing.filter(p => !incomingIds.has(p.id)).map(p => p.id);
    if (toDelete.length) await this.phaseRepo.delete({ id: In(toDelete) });
    await this.phaseRepo.save(incoming.map(p => this.phaseRepo.create({ ...p, projectId })));
  }

  private async syncTasks(projectId: string, incoming: NonNullable<UpdateProjectDto["tasks"]>) {
    const existing = await this.taskRepo.find({ where: { projectId } });
    const incomingIds = new Set(incoming.map(t => t.id));
    const toDelete = existing.filter(t => !incomingIds.has(t.id)).map(t => t.id);
    if (toDelete.length) await this.taskRepo.delete({ id: In(toDelete) });
    await this.taskRepo.save(incoming.map(t => this.taskRepo.create({
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
