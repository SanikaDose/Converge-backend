/**
 * Business logic — ported from converge_frontend/lib/businessLogic.ts.
 * Operates on plain objects (not TypeORM entities) so it stays easy to
 * reason about and test in isolation; services adapt entities to/from
 * these shapes at the boundary.
 */
import { addWorkingDays, businessDaysBetween, todayISO } from "./date-utils";
import { TEMPLATE, newId } from "./template";
import type { Achievement, ChecklistItem, HistoryEntry, OrgRole, PendingChange, Priority, StatusColorKey, TaskStatus, WeekDay } from "./types";

export interface PlainPhase {
  id: string;
  name: string;
  critical: boolean;
  order: number;
}

export interface PlainTask {
  id: string;
  phaseId: string;
  order: number;
  name: string;
  description: string;
  assignedTo: string | null;
  priority: Priority;
  dependencies: string[];
  dayOffset: number;
  duration: number;
  plannedStart: string;
  plannedFinish: string;
  actualStart: string | null;
  actualFinish: string | null;
  status: TaskStatus;
  history: HistoryEntry[];
  achievement?: Achievement | null;
  pendingChange?: PendingChange | null;
  checklist?: ChecklistItem[];
}

/* ----------------------------- phases & tasks ----------------------------- */

export function buildProjectPhases(): PlainPhase[] {
  return TEMPLATE.map((p, i) => ({
    id: newId(),
    name: p.phase,
    critical: p.critical,
    order: i,
  }));
}

export function computePlanned(startDate: string, dayOffset: number, duration: number, weekOff: WeekDay[]): { plannedStart: string; plannedFinish: string } {
  const plannedStart = addWorkingDays(startDate, dayOffset, weekOff);
  const plannedFinish = addWorkingDays(plannedStart, Math.max(1, duration) - 1, weekOff);
  return { plannedStart, plannedFinish };
}

export function buildTasks(startDate: string, phases: PlainPhase[], weekOff: WeekDay[]): PlainTask[] {
  const tasks: PlainTask[] = [];
  TEMPLATE.forEach((p, pi) => {
    const phase = phases[pi];
    p.tasks.forEach(([name, offset, duration], ti) => {
      const { plannedStart, plannedFinish } = computePlanned(startDate, offset, duration, weekOff);
      tasks.push({
        id: newId(),
        phaseId: phase.id,
        order: ti,
        name,
        description: "",
        assignedTo: null,
        priority: "Medium",
        dependencies: [],
        dayOffset: offset,
        duration,
        plannedStart,
        plannedFinish,
        actualStart: null,
        actualFinish: null,
        status: "Not Started",
        history: [],
        achievement: null,
        pendingChange: null,
      });
    });
  });
  return tasks;
}

export function suggestedEndDate(startDate: string, weekOff: WeekDay[]): string {
  let maxOffsetPlusDuration = 0;
  TEMPLATE.forEach(p => p.tasks.forEach(([, offset, duration]) => {
    maxOffsetPlusDuration = Math.max(maxOffsetPlusDuration, offset + duration);
  }));
  return addWorkingDays(startDate, maxOffsetPlusDuration, weekOff);
}

/* ------------------------------ delay detection ------------------------------ */

export function isOverdue(task: { status: TaskStatus; plannedFinish: string }, today: string): boolean {
  return task.status !== "Completed" && today > task.plannedFinish;
}

export function overdueWorkingDays(task: { status: TaskStatus; plannedFinish: string }, today: string, weekOff: WeekDay[]): number {
  if (!isOverdue(task, today)) return 0;
  return businessDaysBetween(today, task.plannedFinish, weekOff);
}

export interface Summary {
  total: number;
  completed: number;
  delayed: number;
  plannedEnd: string;
  pct: number;
}

export function summarize(tasks: { status: TaskStatus; plannedFinish: string }[], today: string): Summary {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const delayed = tasks.filter(t => isOverdue(t, today)).length;
  const plannedEnd = tasks.reduce((max, t) => t.plannedFinish > max ? t.plannedFinish : max, tasks[0]?.plannedFinish || today);
  return { total, completed, delayed, plannedEnd, pct: total ? Math.round((completed / total) * 100) : 0 };
}

export interface PhaseSummaryRow extends Summary {
  id: string;
  name: string;
  critical: boolean;
  order: number;
  color: StatusColorKey;
  phaseStart: string | null;
  phaseEnd: string | null;
  weekStart: number | null;
  weekEnd: number | null;
}

export function phaseSummaries(phases: PlainPhase[], tasks: PlainTask[], today: string, projectStartDate: string): PhaseSummaryRow[] {
  return phases.slice().sort((a, b) => a.order - b.order).map((phase) => {
    const pts = tasks.filter(t => t.phaseId === phase.id);
    const s = summarize(pts, today);
    let color: StatusColorKey = "slate";
    if (s.total && s.completed === s.total) color = "green";
    else if (s.delayed > 0) color = "red";
    else if (pts.some(t => t.status !== "Not Started")) color = "amber";

    const phaseStart = pts.length ? pts.reduce((min, t) => t.plannedStart < min ? t.plannedStart : min, pts[0].plannedStart) : null;
    const phaseEnd = pts.length ? pts.reduce((max, t) => t.plannedFinish > max ? t.plannedFinish : max, pts[0].plannedFinish) : null;

    return {
      id: phase.id, name: phase.name, critical: phase.critical, order: phase.order,
      ...s, color, phaseStart, phaseEnd,
      weekStart: phaseStart ? Math.floor((new Date(phaseStart).getTime() - new Date(projectStartDate).getTime()) / 86400000 / 7) + 1 : null,
      weekEnd: phaseEnd ? Math.floor((new Date(phaseEnd).getTime() - new Date(projectStartDate).getTime()) / 86400000 / 7) + 1 : null,
    };
  });
}

export function projectStatusFromPhases(phaseRows: { critical: boolean; color: StatusColorKey; total: number; completed: number }[]) {
  const anyCriticalDelayed = phaseRows.some(p => p.critical && p.color === "red");
  if (anyCriticalDelayed) return "Delayed" as const;
  const allDone = phaseRows.length > 0 && phaseRows.every(p => p.total > 0 && p.completed === p.total);
  if (allDone) return "On Track" as const;
  const started = phaseRows.some(p => p.completed > 0 || p.color === "amber" || p.color === "red");
  return started ? ("In Progress" as const) : ("On Track" as const);
}

/* ---------------------------- achievement detection ---------------------------- */

export function computeAchievement(task: PlainTask, weekOff: WeekDay[]): Achievement | null {
  if (task.status !== "Completed" || !task.actualFinish) return null;
  const daysEarly = businessDaysBetween(task.plannedFinish, task.actualFinish, weekOff);
  if (daysEarly >= 2) return { label: `Completed ${daysEarly} Days Early`, days: daysEarly };
  if (daysEarly === 1) return { label: "Finished Before Deadline", days: 1 };
  if (task.actualStart) {
    const actualDuration = businessDaysBetween(task.actualFinish, task.actualStart, weekOff) + 1;
    if (actualDuration < task.duration) return { label: "Outstanding Performance", days: task.duration - actualDuration };
  }
  return null;
}

/* ------------------------------ team performance ------------------------------ */

export interface TeamPerformanceInput {
  id: string;
  name: string;
  role: OrgRole;
  team: string;
  teamId: string;
}

export interface TeamPerformanceRow extends TeamPerformanceInput {
  total: number;
  completed: number;
  pending: number;
  delayed: number;
  completionPct: number;
}

export function aggregateTeamPerformance(
  employees: TeamPerformanceInput[],
  allTasks: { assignedTo: string | null; status: TaskStatus; plannedFinish: string }[],
  today: string = todayISO(),
): TeamPerformanceRow[] {
  const byEmployee = new Map(employees.map(e => [e.id, { ...e, total: 0, completed: 0, pending: 0, delayed: 0 }]));
  allTasks.forEach(task => {
    if (!task.assignedTo || !byEmployee.has(task.assignedTo)) return;
    const row = byEmployee.get(task.assignedTo)!;
    row.total += 1;
    if (task.status === "Completed") row.completed += 1;
    else if (isOverdue(task, today)) row.delayed += 1;
    else row.pending += 1;
  });
  return Array.from(byEmployee.values()).map(row => ({
    ...row,
    completionPct: row.total ? Math.round((row.completed / row.total) * 100) : 0,
  }));
}
