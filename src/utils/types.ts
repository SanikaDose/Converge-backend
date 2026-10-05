/**
 * Domain types shared across entities/services — mirrors the shapes in
 * converge_frontend/lib/types.ts exactly, since the frontend deserializes
 * these API responses straight into its own identically-named types.
 * Kept framework-agnostic (no TypeORM/Nest imports) on purpose.
 */

// "Not Required" means the task/phase is excluded from progress math entirely
// (neither counted as done nor pending — see summarize/isOverdue). Kept last so
// existing status ordering is unchanged.
export type TaskStatus = "Not Started" | "In Progress" | "Pending Approval" | "Delayed" | "Blocked" | "Completed" | "Not Required";
export type StatusColorKey = "green" | "amber" | "red" | "slate" | "violet" | "orange";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type ProjectType = "Product" | "Solution";
export type ProjectBucket = "Delayed" | "In Progress" | "On Track";
export type TicketStatus = "Open" | "In Progress" | "Closed" | "Reopened";
/** Miscellaneous (ad-hoc) task status — deliberately distinct from TaskStatus/TicketStatus. */
export type MiscTaskStatus = "To Do" | "In Progress" | "On Hold" | "Completed";
/** Where an employee worked on a given day — the daily scrum "Work Mode". */
export type WorkMode = "Office" | "Onsite" | "Both" | "WFH" | "Half Day" | "Leave";
/**
 * A generic reference to something worked on in a scrum update. Deliberately
 * NOT scoped to what's assigned to the person — a `label` snapshot is stored so
 * the reference reads correctly even if the underlying row is later renamed or
 * deleted.
 */
export type ScrumReferenceType = "project" | "task" | "ticket" | "na" | "other";
export interface ScrumReference {
  type: ScrumReferenceType;
  id: string;
  label: string;
}
/**
 * Directory role. Replaced the earlier "Team Lead" | "Developer" pair: the
 * directory now distinguishes only who administers the app from everyone
 * else, so the two roles line up 1:1 with AppRole below.
 */
export type OrgRole = "Admin" | "User" | "Lead";
/** Application access role — distinct from OrgRole (the directory job title). */
export type AppRole = "Admin" | "User" | "Lead";
/** Directory lifecycle — an employee who left is "inactive", not deleted. */
export type EmployeeStatus = "active" | "inactive";

/** 0 = Sunday … 6 = Saturday, matching JS Date#getUTCDay(). */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * One "critical point" on a task's checklist. Timestamps are optional only
 * for items stored before they existed; anything created now sets both.
 */
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export interface RelatedRepository {
  name: string;
  url: string;
}

/** Warranty details captured once a project is completed. */
export interface Warranty {
  /** ISO date the project was completed / warranty starts. */
  completionDate: string;
  contactPerson: string;
  phone: string;
  email: string;
}

/* ---------------------------------------------------------------------
   PROJECT CHARTER — the Converge "Standard Charter" captured at project
   creation (Solution projects only; Products skip it). One jsonb blob on
   the project. Sections mirror the Standard Charter Structure (02–08);
   section 01 "Project Information" is the base project form itself.
------------------------------------------------------------------------ */
/** 06. Key Technical Commitments — one table row. */
export interface CharterTechnicalCommitment {
  parameter: string;
  commitment: string;
  reference: string;
  remarks: string;
}
/** 07. Major Milestones — one high-level phase/milestone. */
export interface CharterMilestone {
  name: string;
  targetDate: string | null;
}
export interface ProjectCharter {
  // 02. Sales / Pre-Sales Information
  proposalNo: string;
  proposalRevision: string;
  proposalDate: string | null;
  poNo: string;
  poDate: string | null;
  salesOwner: string;
  proposalDocument: string;
  poDocument: string;
  // 03. Project Objective
  objective: string;
  // 04. Solution Offered
  solutionOffered: string;
  // 05. Project Conditions
  scope: string[];
  outOfScope: string[];
  assumptions: string[];
  constraints: string[];
  // 06. Key Technical Commitments
  technicalCommitments: CharterTechnicalCommitment[];
  // 07. Major Milestones – Project Phases
  milestones: CharterMilestone[];
  // 08. Success Criteria
  successCriteria: string[];
}

export type TemplateTaskTuple = [name: string, dayOffset: number, duration: number, description?: string, criticalPoints?: string[]];

/** A discipline-specific phase belongs to exactly one team's workstream. */
export type PhaseDiscipline = "Software" | "Vision" | "Automation";
/** Chosen at project creation: "All" keeps every phase; a specific one drops the other disciplines' phases. */
export type ProjectDiscipline = "All" | PhaseDiscipline;

export interface TemplatePhase {
  phase: string;
  critical: boolean;
  tasks: TemplateTaskTuple[];
  /** Omitted for common phases (always generated); set for the Software/Vision/Automation phases. */
  discipline?: PhaseDiscipline;
  /** 1-based project week this phase starts in (Week 1 = the project's first week). */
  weekStart: number;
  /** How many whole project weeks the phase (and all its tasks) occupies. */
  durationWeeks: number;
}
