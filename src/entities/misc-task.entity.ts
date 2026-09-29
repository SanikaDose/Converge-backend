import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { ChecklistItem, HistoryEntry, MiscTaskStatus, Priority } from "../utils/types";
import { Employee } from "./employee.entity";
import { Project } from "./project.entity";

/**
 * A miscellaneous / ad-hoc task (POCs, module work, services) that isn't part
 * of a project's phase plan. Standalone table — nothing in Projects/Phases/
 * Tasks/Tickets references it, and it references them only softly (SET NULL),
 * so it can never block or corrupt existing data.
 */
@Entity("misc_tasks")
export class MiscTask {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar")
  title: string;

  @Column("text", { default: "" })
  description: string;

  /** null = "Other (not related to any project)". */
  @Column("uuid", { name: "project_id", nullable: true })
  @Index()
  projectId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "project_id" })
  project: Project | null;

  /** Denormalised snapshot (matches tickets.projectName) so the list needs no
   * join and an "Other" / deleted-project task still labels cleanly. */
  @Column("varchar", { name: "project_name", nullable: true })
  projectName: string | null;

  /** Primary assignee — mirrors assignees[0], kept for the single-avatar
   * display and a valid FK. */
  @Column("varchar", { name: "assigned_to", nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignee: Employee | null;

  /** All assignees (multi-select), employee ids. jsonb, no FK — same pattern
   * as tasks/tickets. assignedTo mirrors [0]. */
  @Column("jsonb", { default: () => "'[]'" })
  assignees: string[];

  @Column("varchar", { default: "Medium" })
  priority: Priority;

  @Column("varchar", { default: "To Do" })
  status: MiscTaskStatus;

  @Column("date", { name: "due_date", nullable: true })
  dueDate: string | null;

  /** Planned start / end of the work. Both nullable — a task may be logged
   * before its dates are known. `dueDate` is kept for older rows. */
  @Column("date", { name: "start_date", nullable: true })
  startDate: string | null;

  @Column("date", { name: "end_date", nullable: true })
  endDate: string | null;

  /** Optional estimate of how many hours the task should take to complete.
   * `double precision` so it reads back as a JS number (not a string like
   * numeric would). Nullable — the field is optional on the form. */
  @Column("double precision", { name: "estimated_hours", nullable: true })
  estimatedHours: number | null;

  /** Reuses ChecklistItem { id, text, done, createdAt?, updatedAt? }. */
  @Column("jsonb", { default: () => "'[]'" })
  checklist: ChecklistItem[];

  @Column("date", { name: "created_at" })
  createdAt: string;

  /** Employee id of whoever created the task — audit only, taken from the
   * auth token (never the request body). Plain varchar (no FK) so it survives
   * the creator later leaving the directory. Not shown in the UI. */
  @Column("varchar", { name: "created_by", nullable: true })
  createdBy: string | null;

  @Column("timestamptz", { name: "updated_at", nullable: true })
  updatedAt: string | null;

  @Column("jsonb", { default: () => "'[]'" })
  history: HistoryEntry[];
}
