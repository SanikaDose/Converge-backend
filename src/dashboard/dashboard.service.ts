import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DashboardBaseline } from "../entities/dashboard-baseline.entity";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import { Ticket } from "../entities/ticket.entity";
import { phaseSummaries, projectStatusFromPhases, summarize, type PlainPhase, type PlainTask } from "../utils/business-logic";
import { todayISO } from "../utils/date-utils";
import type { DashboardBaselineInterface } from "./interface/dashboard.interface";

/**
 * Entity -> wire shape. `capturedAt` is a timestamptz column (a Date in
 * TypeORM) but the API contract is an ISO string — returning the entity
 * directly meant the declared return type and what JSON actually put on
 * the wire disagreed.
 */
function toBaselineResponse(row: DashboardBaseline): DashboardBaselineInterface {
  return {
    activeProjects: row.activeProjects,
    completedProjects: row.completedProjects,
    avgCompletionPct: row.avgCompletionPct,
    delayedTasks: row.delayedTasks,
    totalTickets: row.totalTickets,
    openTickets: row.openTickets,
    resolvedTickets: row.resolvedTickets,
    ticketResolutionPct: row.ticketResolutionPct,
    capturedAt: row.capturedAt instanceof Date ? row.capturedAt.toISOString() : String(row.capturedAt),
  };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(DashboardBaseline) private readonly baselineRepo: Repository<DashboardBaseline>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Phase) private readonly phaseRepo: Repository<Phase>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}

  /**
   * Captured lazily, once — a real snapshot of portfolio stats "at the
   * start of this backend's data" rather than a fabricated number, so the
   * dashboard's "vs last month" trend captions are a genuine diff. Persisted
   * (unlike the frontend's original in-memory version) so it survives a
   * backend restart instead of resetting every time.
   */
  async getBaseline(): Promise<DashboardBaselineInterface> {
    const existing = await this.baselineRepo.findOneBy({ id: 1 });
    if (existing) return toBaselineResponse(existing);

    const today = todayISO();
    // Same two-query shape as ProjectsService.findAllIndex: the per-project
    // fetches used to sit inside the loop, so this cost 1 + 2N round trips.
    const projects = await this.projectRepo.find();
    const projectIds = projects.map(p => p.id);
    const [allPhases, allTasks] = projectIds.length
      ? await Promise.all([
          this.phaseRepo.find({ where: { projectId: In(projectIds) } }),
          this.taskRepo.find({ where: { projectId: In(projectIds) } }),
        ])
      : [[], []];

    const phasesByProject = new Map<string, typeof allPhases>();
    for (const p of allPhases) (phasesByProject.get(p.projectId) ?? phasesByProject.set(p.projectId, []).get(p.projectId)!).push(p);
    const tasksByProject = new Map<string, typeof allTasks>();
    for (const t of allTasks) (tasksByProject.get(t.projectId) ?? tasksByProject.set(t.projectId, []).get(t.projectId)!).push(t);

    let completedProjects = 0;
    let pctSum = 0;
    let delayedTasks = 0;

    for (const project of projects) {
      const phases = phasesByProject.get(project.id) ?? [];
      const tasks = tasksByProject.get(project.id) ?? [];
      const plainPhases: PlainPhase[] = phases.map(p => ({ id: p.id, name: p.name, critical: p.critical, order: p.order, notRequired: !!p.notRequired }));
      const plainTasks: PlainTask[] = tasks.map(t => ({
        id: t.id, phaseId: t.phaseId, order: t.order, name: t.name, description: t.description,
        assignedTo: t.assignedTo, assignees: t.assignees && t.assignees.length ? t.assignees : (t.assignedTo ? [t.assignedTo] : []),
        priority: t.priority, dependencies: t.dependencies, dayOffset: t.dayOffset,
        duration: t.duration, plannedStart: t.plannedStart, plannedFinish: t.plannedFinish,
        actualStart: t.actualStart, actualFinish: t.actualFinish, status: t.status, history: t.history,
      }));
      const s = summarize(plainTasks, today);
      const phaseRows = phaseSummaries(plainPhases, plainTasks, today, project.startDate);
      projectStatusFromPhases(phaseRows); // computed for parity; bucket itself isn't needed for the baseline
      if (s.total > 0 && s.completed === s.total) completedProjects += 1;
      pctSum += s.pct;
      delayedTasks += s.delayed;
    }

    const tickets = await this.ticketRepo.find();
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress").length;
    const resolvedTickets = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
    const ticketResolutionPct = totalTickets ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

    const baseline = this.baselineRepo.create({
      id: 1,
      activeProjects: projects.length,
      completedProjects,
      avgCompletionPct: projects.length ? Math.round(pctSum / projects.length) : 0,
      delayedTasks,
      totalTickets, openTickets, resolvedTickets, ticketResolutionPct,
      capturedAt: new Date(),
    });
    return toBaselineResponse(await this.baselineRepo.save(baseline));
  }
}
