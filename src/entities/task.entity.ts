import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Achievement, ChecklistItem, HistoryEntry, PendingChange, Priority, TaskStatus } from "../utils/types";
import { Employee } from "./employee.entity";
import { Phase } from "./phase.entity";
import { Project } from "./project.entity";

@Entity("tasks")
export class Task {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "phase_id" })
  @Index()
  phaseId: string;

  @ManyToOne(() => Phase, { onDelete: "CASCADE" })
  @JoinColumn({ name: "phase_id" })
  phase: Phase;

  @Column("uuid", { name: "project_id" })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: Project;

  @Column("int")
  order: number;

  @Column("varchar")
  name: string;

  @Column("text", { default: "" })
  description: string;

  /**
   * Primary owner, kept in sync with assignees[0]. Retained (with its FK to
   * employees) for backward-compatible display and existing data; it is
   * always a valid employee id or null, so the FK is never violated.
   */
  @Column("varchar", { name: "assigned_to", nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignee: Employee | null;

  /**
   * All owners of the task. A jsonb array (no FK) so multi-owner assignment
   * can't fail the way a constrained column can, and so the full-sync PATCH
   * never rejects the whole save over one stale id. assignedTo mirrors [0].
   */
  @Column("jsonb", { default: () => "'[]'" })
  assignees: string[];

  @Column("varchar", { default: "Medium" })
  priority: Priority;

  @Column("jsonb", { default: () => "'[]'" })
  dependencies: string[];

  @Column("int", { name: "day_offset" })
  dayOffset: number;

  @Column("int")
  duration: number;

  @Column("date", { name: "planned_start" })
  plannedStart: string;

  @Column("date", { name: "planned_finish" })
  plannedFinish: string;

  @Column("date", { name: "actual_start", nullable: true })
  actualStart: string | null;

  @Column("date", { name: "actual_finish", nullable: true })
  actualFinish: string | null;

  @Column("varchar", { default: "Not Started" })
  status: TaskStatus;

  @Column("jsonb", { name: "pending_change", nullable: true })
  pendingChange: PendingChange | null;

  @Column("jsonb", { nullable: true })
  achievement: Achievement | null;

  @Column("jsonb", { default: () => "'[]'" })
  history: HistoryEntry[];

  /** Per-task "critical points" checklist — see ChecklistItem. */
  @Column("jsonb", { default: () => "'[]'" })
  checklist: ChecklistItem[];
}
