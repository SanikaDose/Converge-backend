import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { Achievement, HistoryEntry, PendingChange, Priority, TaskStatus } from "../common/types";
import { Employee } from "./employee.entity";
import { Phase } from "./phase.entity";
import { Project } from "./project.entity";

@Entity("tasks")
export class Task {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar", { name: "phase_id" })
  @Index()
  phaseId: string;

  @ManyToOne(() => Phase, { onDelete: "CASCADE" })
  @JoinColumn({ name: "phase_id" })
  phase: Phase;

  @Column("varchar", { name: "project_id" })
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

  @Column("varchar", { name: "assigned_to", nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignee: Employee | null;

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
}
