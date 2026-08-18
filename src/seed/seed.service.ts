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
import { SEED_TEAMS } from "../utils/org-seed-data";
import { appRoleFor, buildSeedCredentials, DEFAULT_PASSWORD } from "../utils/credentials";
import * as bcrypt from "bcryptjs";
import { buildProjectPhases, buildTasks, computeAchievement, type PlainPhase, type PlainTask } from "../utils/business-logic";
import { addWorkingDays, DEFAULT_WEEK_OFF, todayISO } from "../utils/date-utils";
import { TEMPLATE, newId } from "../utils/template";
import type { HistoryEntry, WeekDay } from "../utils/types";

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
      // Both still run: the demo projects are seeded once, but the org
      // directory is a living list — people get added and roles change, and
      // an existing database would otherwise never see those edits.
      await this.ensureOrgDirectory();
      // Employees seeded before sign-in existed have no employeeCode/
      // passwordHash, and nobody could log in without a backfill.
      // Idempotent — only fills columns that are still null.
      await this.ensureCredentials();
      return;
    }
    await this.run();
  }

  /**
   * Reconciles the teams/employees tables against SEED_TEAMS on every boot,
   * so that file stays the single source of truth for the directory:
   * new teams and people are inserted, and existing rows have their name,
   * org role, app role, and team brought back in line.
   *
   * Safe to overwrite those four columns because nothing in the app edits
   * them — there's no employee-management UI. Sign-in columns
   * (employeeCode/passwordHash) are deliberately left alone here and
   * handled by ensureCredentials, which only ever fills blanks.
   *
   * Note this does NOT delete employees missing from SEED_TEAMS: they may
   * still be referenced as a task assignee, project owner, or ticket
   * assignee, and removing them would orphan that data.
   */
  async ensureOrgDirectory(): Promise<void> {
    // Read the whole directory once and diff in memory. Doing a findOneBy
    // per member meant one query each on every boot, and only a handful of
    // rows ever actually differ.
    const [existingTeams, existingEmployees] = await Promise.all([
      this.teamRepo.find(),
      this.employeeRepo.find(),
    ]);
    const teamById = new Map(existingTeams.map(t => [t.id, t]));
    const employeeById = new Map(existingEmployees.map(e => [e.id, e]));

    const teamsToSave: Team[] = [];
    const employeesToSave: Employee[] = [];
    let added = 0;

    for (const team of SEED_TEAMS) {
      const existingTeam = teamById.get(team.id);
      if (!existingTeam || existingTeam.name !== team.name) {
        teamsToSave.push(this.teamRepo.create({ id: team.id, name: team.name }));
      }

      for (const member of team.members) {
        const appRole = appRoleFor(member.role);
        const employee = employeeById.get(member.id);
        if (!employee) {
          employeesToSave.push(this.employeeRepo.create({
            id: member.id, name: member.name, role: member.role, teamId: team.id, appRole,
          }));
          added++;
          continue;
        }
        // `name` is deliberately NOT reconciled: it's the one field a user
        // can edit on their own profile, and overwriting it here would
        // silently revert that on the next restart. Role, app role, and team
        // stay organisation-controlled and are still kept in line.
        if (employee.role === member.role && employee.teamId === team.id
          && employee.appRole === appRole) continue;
        employee.role = member.role;
        employee.teamId = team.id;
        employee.appRole = appRole;
        employeesToSave.push(employee);
      }
    }

    // Teams first: employees carry a FK to them, so a brand-new team has to
    // exist before its members can be inserted.
    if (teamsToSave.length) await this.teamRepo.save(teamsToSave);
    if (employeesToSave.length) await this.employeeRepo.save(employeesToSave);

    const updated = employeesToSave.length - added;
    if (added || updated) this.logger.log(`Org directory synced — ${added} added, ${updated} updated.`);
  }

  /**
   * Gives every seeded employee a sign-in code, the shared dev password
   * hash, and an app role — filling only what's missing, so re-running
   * never clobbers a credential that's already set.
   */
  async ensureCredentials(): Promise<void> {
    const credentials = buildSeedCredentials();
    // Same one-read-then-diff shape as ensureOrgDirectory, for the same
    // reason. Steady state is zero writes, so this usually costs one SELECT.
    const employees = await this.employeeRepo.find();
    const employeeById = new Map(employees.map(e => [e.id, e]));

    const toSave: Employee[] = [];
    for (const cred of credentials) {
      const employee = employeeById.get(cred.id);
      if (!employee) continue;
      let dirty = false;
      if (!employee.employeeCode) { employee.employeeCode = cred.employeeCode; dirty = true; }
      if (!employee.appRole) { employee.appRole = cred.appRole; dirty = true; }
      // bcrypt is intentionally slow — only hash for rows that actually
      // need one, never once per employee per boot.
      if (!employee.passwordHash) { employee.passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10); dirty = true; }
      if (dirty) toSave.push(employee);
    }

    if (toSave.length) {
      await this.employeeRepo.save(toSave);
      this.logger.log(`Provisioned sign-in credentials for ${toSave.length} employee(s).`);
    }
  }

  async run(): Promise<void> {
    this.logger.log("Seeding organization directory + demo projects/tickets…");
    await this.seedOrg();
    await this.ensureCredentials();
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
    const phasesA = buildProjectPhases(TEMPLATE);
    const tasksA = buildTasks(startA, phasesA, weekOffA, TEMPLATE);
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
      id: newId(), changes: { duration: 2, plannedFinish: addWorkingDays(reqReview.plannedFinish, 1, weekOffA) },
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

    const id = newId();
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
    const phasesB = buildProjectPhases(TEMPLATE);
    const tasksB = buildTasks(startB, phasesB, weekOffB, TEMPLATE);
    simulateProgress(tasksB, today, weekOffB);

    const id = newId();
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
        id: newId(), seq: 1, title: "Camera trigger drift on Station 2",
        description: "Intermittent double-trigger under high ambient vibration.",
        projectId: projectAId, projectName: projectA!.name, phase: "05 · Vision Software",
        assignedTo: "krishna-kumbhar", priority: "High", status: "Open", createdAt: today,
      }),
      this.ticketRepo.create({
        id: newId(), seq: 2, title: "Backend API timeout under load",
        description: "Requests over ~50 req/s start timing out during the integration test rig.",
        projectId: projectAId, projectName: projectA!.name, phase: "04 · Software",
        assignedTo: "shubham-tanapure", priority: "Medium", status: "In Progress", createdAt: today,
      }),
      this.ticketRepo.create({
        id: newId(), seq: 3, title: "Kickoff meeting recording missing slide 4",
        description: "Recording cuts out during the scope walkthrough — re-share the deck separately.",
        projectId: projectAId, projectName: projectA!.name, phase: "01 · Project Initialization",
        assignedTo: null, priority: "Low", status: "Resolved", createdAt: today,
        resolvedAt: today,
      }),
      this.ticketRepo.create({
        id: newId(), seq: 4, title: "Palletizer gripper misalignment on SKU changeover",
        description: "Gripper offset drifts ~2mm after a SKU changeover — recalibration needed each shift.",
        projectId: projectBId, projectName: projectB!.name, phase: "06 · Automation",
        assignedTo: "sanket-chavhan", priority: "High", status: "Closed", createdAt: startB,
        resolvedAt: addWorkingDays(startB, 3),
      }),
    ]);
  }
}
