import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Team } from "../entities/team.entity";
import { Employee } from "../entities/employee.entity";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import { Ticket } from "../entities/ticket.entity";
import { SEED_TEAMS } from "../common/org-seed-data";
import { buildProjectPhases, buildTasks, computeAchievement, type PlainPhase, type PlainTask } from "../common/business-logic";
import { addWorkingDays, DEFAULT_WEEK_OFF, todayISO } from "../common/date-utils";
import { genId } from "../common/template";
import type { HistoryEntry, WeekDay } from "../common/types";

const EMPLOYEE_CYCLE = SEED_TEAMS.flatMap(t => t.members.map(m => m.id));

function historyEntry(status: string): HistoryEntry {
  return { ts: new Date().toISOString(), field: "Status", from: "Not Started", to: status, editedBy: "Admin", reason: "" };
}

function findTask(tasks: PlainTask[], phases: PlainPhase[], phaseIndex: number, taskIndex: number): PlainTask {
  const phaseId = phases[phaseIndex].id;
  const task = tasks.filter(t => t.phaseId === phaseId)[taskIndex];
  if (!task) throw new Error(`Seed data: phase ${phaseIndex} task ${taskIndex} not found`);
  return task;
}

/**
 * Stamps a whole task list with a plausible in-flight snapshot as of
 * `today` — ported verbatim from converge_frontend/lib/mockDb.ts's
 * simulateProgress, see that file's comment for the exact rules (tasks
 * past their planned finish are mostly Completed, a ~1-in-6 left
 * in-flight so "Delayed" isn't always zero, tasks spanning today are
 * In Progress, two-out-of-three get a round-robin owner).
 */
function simulateProgress(tasks: PlainTask[], today: string, weekOff: WeekDay[]): void {
  tasks.forEach((t, i) => {
    if (i % 3 !== 0) t.assignedTo = EMPLOYEE_CYCLE[i % EMPLOYEE_CYCLE.length];

    if (t.plannedFinish < today) {
      if (i % 6 === 5) {
        t.status = "In Progress";
        t.actualStart = t.plannedStart;
        t.history = [historyEntry("In Progress")];
      } else {
        t.status = "Completed";
        t.actualStart = t.plannedStart;
        t.actualFinish = i % 4 === 0 ? addWorkingDays(t.plannedFinish, -2, weekOff) : t.plannedFinish;
        t.achievement = computeAchievement(t, weekOff);
        t.history = [historyEntry("Completed")];
      }
    } else if (t.plannedStart <= today) {
      t.status = "In Progress";
      t.actualStart = t.plannedStart;
      t.history = [historyEntry("In Progress")];
    }
  });
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Phase) private readonly phaseRepo: Repository<Phase>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>("SEED_ON_BOOT", "true") !== "true") return;
    const projectCount = await this.projectRepo.count();
    if (projectCount > 0) {
      this.logger.log("Projects table already has data — skipping seed.");
      return;
    }
    await this.run();
  }

  async run(): Promise<void> {
    this.logger.log("Seeding organization directory + demo projects/tickets…");
    await this.seedOrg();
    const idA = await this.seedProjectA();
    const idB = await this.seedProjectB();
    await this.seedTickets(idA, idB);
    this.logger.log("Seed complete.");
  }

  private async seedOrg(): Promise<void> {
    for (const team of SEED_TEAMS) {
      await this.teamRepo.save(this.teamRepo.create({ id: team.id, name: team.name }));
    }
    for (const team of SEED_TEAMS) {
      for (const member of team.members) {
        await this.employeeRepo.save(this.employeeRepo.create({ id: member.id, name: member.name, role: member.role, teamId: team.id }));
      }
    }
  }

  /**
   * Project A — TE Connectivity, early-stage Product. Started a few days
   * ago so only Project Initialization is naturally due; hand-curated
   * (not simulateProgress) so specific showcase states (Pending Approval,
   * an early-finish achievement) are guaranteed visible, exactly matching
   * the frontend's original seed data.
   */
  private async seedProjectA(): Promise<string> {
    const today = todayISO();
    const startA = addWorkingDays(today, -3);
    const weekOffA = DEFAULT_WEEK_OFF;
    const phasesA = buildProjectPhases();
    const tasksA = buildTasks(startA, phasesA, weekOffA);
    simulateProgress(tasksA, today, weekOffA);

    const kickoff = findTask(tasksA, phasesA, 0, 0);
    kickoff.assignedTo = "sanika-dose";
    kickoff.status = "Completed";
    kickoff.actualStart = kickoff.plannedStart;
    kickoff.actualFinish = kickoff.plannedStart;
    kickoff.history = [historyEntry("Completed")];

    const reqGathering = findTask(tasksA, phasesA, 0, 1);
    reqGathering.assignedTo = "viren-patil";
    reqGathering.status = "Completed";
    reqGathering.actualStart = reqGathering.plannedStart;
    reqGathering.actualFinish = addWorkingDays(reqGathering.plannedFinish, -1, weekOffA);
    reqGathering.history = [historyEntry("Completed")];
    reqGathering.achievement = computeAchievement(reqGathering, weekOffA);

    const planning = findTask(tasksA, phasesA, 0, 3);
    planning.assignedTo = "viren-patil";
    planning.status = "In Progress";
    planning.actualStart = planning.plannedStart;
    planning.history = [historyEntry("In Progress")];

    // Requirement Review — seeded straight into Pending Approval so the
    // approval-workflow UI (violet chip, dashed timeline border) has
    // something to show.
    const reqReview = findTask(tasksA, phasesA, 1, 0);
    reqReview.assignedTo = "prachi-jamgaonkar";
    reqReview.status = "Pending Approval";
    reqReview.pendingChange = {
      id: genId("chg"), changes: { duration: 2, plannedFinish: addWorkingDays(reqReview.plannedFinish, 1, weekOffA) },
      previousStatus: "Not Started" as const, requestedBy: "prachi-jamgaonkar", requestedByName: "Prachi Jamgaonkar",
      requestedAt: new Date().toISOString(), reason: "Customer added two extra interfaces to the spec — need an extra day to review.",
    };

    // PLC Program Development — started a day late but compressed to
    // still land on the original deadline (Outstanding Performance).
    const plcProgram = findTask(tasksA, phasesA, 5, 1);
    plcProgram.assignedTo = "bharat-vinchwekar";
    plcProgram.status = "Completed";
    plcProgram.actualStart = addWorkingDays(plcProgram.plannedStart, 1, weekOffA);
    plcProgram.actualFinish = plcProgram.plannedFinish;
    plcProgram.history = [historyEntry("Completed")];
    plcProgram.achievement = computeAchievement(plcProgram, weekOffA);

    const id = genId("proj");
    await this.projectRepo.save(this.projectRepo.create({
      id, name: "TE Connectivity — Robotic Connector Inspection Cell", type: "Product",
      customer: "TE Connectivity", ownerId: "viren-patil", startDate: startA,
      endDate: addWorkingDays(startA, 60), createdAt: today, weekOff: weekOffA,
    }));
    await this.phaseRepo.save(phasesA.map(p => this.phaseRepo.create({ ...p, projectId: id })));
    await this.taskRepo.save(tasksA.map(t => this.taskRepo.create({
      ...t, projectId: id, achievement: t.achievement ?? null, pendingChange: (t.pendingChange as Task["pendingChange"]) ?? null,
    })));
    return id;
  }

  /**
   * Project B — Vertex Robotics, well-underway Solution. Started ~35
   * working days ago (most of the plan is in the past) so simulateProgress
   * alone produces a realistic mostly-complete project with genuine
   * delays, without hand-authoring status for all 62 tasks.
   */
  private async seedProjectB(): Promise<string> {
    const today = todayISO();
    const startB = addWorkingDays(today, -35);
    const weekOffB: WeekDay[] = [5, 6]; // Fri + Sat — different work week, proves weekOff is per-project
    const phasesB = buildProjectPhases();
    const tasksB = buildTasks(startB, phasesB, weekOffB);
    simulateProgress(tasksB, today, weekOffB);

    const id = genId("proj");
    await this.projectRepo.save(this.projectRepo.create({
      id, name: "Vertex Robotics — Automated Palletizing Solution", type: "Solution",
      customer: "Vertex Robotics", ownerId: "bharat-vinchwekar", startDate: startB,
      endDate: addWorkingDays(startB, 45), createdAt: startB, weekOff: weekOffB,
    }));
    await this.phaseRepo.save(phasesB.map(p => this.phaseRepo.create({ ...p, projectId: id })));
    await this.taskRepo.save(tasksB.map(t => this.taskRepo.create({ ...t, projectId: id })));
    return id;
  }

  private async seedTickets(projectAId: string, projectBId: string): Promise<void> {
    const today = todayISO();
    const startB = addWorkingDays(today, -35);
    const projectA = await this.projectRepo.findOneBy({ id: projectAId });
    const projectB = await this.projectRepo.findOneBy({ id: projectBId });

    await this.ticketRepo.save([
      this.ticketRepo.create({
        id: genId("tkt"), seq: 1, title: "Camera trigger drift on Station 2",
        description: "Intermittent double-trigger under high ambient vibration.",
        projectId: projectAId, projectName: projectA!.name, phase: "05 · Vision Software",
        assignedTo: "krishna-kumbhar", priority: "High", status: "Open", createdAt: today,
      }),
      this.ticketRepo.create({
        id: genId("tkt"), seq: 2, title: "Backend API timeout under load",
        description: "Requests over ~50 req/s start timing out during the integration test rig.",
        projectId: projectAId, projectName: projectA!.name, phase: "04 · Software",
        assignedTo: "shubham-tanapure", priority: "Medium", status: "In Progress", createdAt: today,
      }),
      this.ticketRepo.create({
        id: genId("tkt"), seq: 3, title: "Kickoff meeting recording missing slide 4",
        description: "Recording cuts out during the scope walkthrough — re-share the deck separately.",
        projectId: projectAId, projectName: projectA!.name, phase: "01 · Project Initialization",
        assignedTo: null, priority: "Low", status: "Resolved", createdAt: today,
      }),
      this.ticketRepo.create({
        id: genId("tkt"), seq: 4, title: "Palletizer gripper misalignment on SKU changeover",
        description: "Gripper offset drifts ~2mm after a SKU changeover — recalibration needed each shift.",
        projectId: projectBId, projectName: projectB!.name, phase: "06 · Automation",
        assignedTo: "sanket-chavhan", priority: "High", status: "Closed", createdAt: startB,
      }),
    ]);
  }
}
