/**
 * Domain types shared across entities/services — mirrors the shapes in
 * converge_frontend/lib/types.ts exactly, since the frontend deserializes
 * these API responses straight into its own identically-named types.
 * Kept framework-agnostic (no TypeORM/Nest imports) on purpose.
 */

export type TaskStatus = "Not Started" | "In Progress" | "Pending Approval" | "Delayed" | "Completed";
export type StatusColorKey = "green" | "amber" | "red" | "slate" | "violet";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type ProjectType = "Product" | "Solution";
export type ProjectBucket = "Delayed" | "In Progress" | "On Track";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type OrgRole = "Team Lead" | "Developer";
/** Application access role — distinct from OrgRole (the directory job title). */
export type AppRole = "Admin" | "Developer";

/** 0 = Sunday … 6 = Saturday, matching JS Date#getUTCDay(). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One "critical point" on a task's checklist. */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface HistoryEntry {
  ts: string;
  field: string;
  from: unknown;
  to: unknown;
  editedBy: string;
  reason: string;
  approvedBy?: string;
}

export interface PendingChange {
  id: string;
  changes: Record<string, unknown>;
  previousStatus: TaskStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
}

export interface Achievement {
  label: string;
  days: number;
}

export type TemplateTaskTuple = [name: string, dayOffset: number, duration: number];

export interface TemplatePhase {
  phase: string;
  critical: boolean;
  tasks: TemplateTaskTuple[];
}
