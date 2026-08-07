import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DashboardBaseline } from "../entities/dashboard-baseline.entity";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import { Ticket } from "../entities/ticket.entity";
import { phaseSummaries, projectStatusFromPhases, summarize, type PlainPhase, type PlainTask } from "../common/business-logic";
import { todayISO } from "../common/date-utils";

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
  async getBaseline(): Promise<DashboardBaseline> {
    const existing = await this.baselineRepo.findOneBy({ id: 1 });
    if (existing) return existing;

    const today = todayISO();
    const projects = await this.projectRepo.find();
    let completedProjects = 0;
    let pctSum = 0;
    let delayedTasks = 0;

    for (const project of projects) {
      const [phases, tasks] = await Promise.all([
        this.phaseRepo.find({ where: { projectId: project.id } }),
        this.taskRepo.find({ where: { projectId: project.id } }),
      ]);
      const plainPhases: PlainPhase[] = phases.map(p => ({ id: p.id, name: p.name, critical: p.critical, order: p.order }));
      const plainTasks: PlainTask[] = tasks.map(t => ({
        id: t.id, phaseId: t.phaseId, order: t.order, name: t.name, description: t.description,
        assignedTo: t.assignedTo, priority: t.priority, dependencies: t.dependencies, dayOffset: t.dayOffset,
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
    return this.baselineRepo.save(baseline);
  }
}
