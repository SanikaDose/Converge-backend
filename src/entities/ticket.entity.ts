import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { ChecklistItem, Priority, TicketStatus } from "../common/types";
import { Employee } from "./employee.entity";
import { Project } from "./project.entity";

@Entity("tickets")
export class Ticket {
  @PrimaryColumn("varchar")
  id: string;

  @Column("int")
  seq: number;

  @Column("varchar")
  title: string;

  @Column("text", { default: "" })
  description: string;

  @Column("varchar", { name: "project_id" })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: Project;

  // Denormalized on purpose (matches the frontend's Ticket shape) — the
  // ticket list is a single flat table and shouldn't need a join just to
  // show which project each row belongs to.
  @Column("varchar", { name: "project_name" })
  projectName: string;

  @Column("varchar", { nullable: true })
  phase: string | null;

  @Column("varchar", { name: "assigned_to", nullable: true })
  assignedTo: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignee: Employee | null;

  @Column("varchar", { default: "Medium" })
  priority: Priority;

  @Column("varchar", { default: "Open" })
  status: TicketStatus;

  @Column("date", { name: "created_at" })
  createdAt: string;

  // Stamped by TicketsService.update when the ticket first reaches a terminal
  // status (Resolved/Closed), and cleared if it's reopened — so "how long did
  // this take to close" is answerable without replaying a status history.
  // Nullable because an open ticket genuinely has no closing date yet.
  @Column("date", { name: "resolved_at", nullable: true })
  resolvedAt: string | null;

  // Same shape/intent as a task's "critical points" checklist (see
  // Task.checklist) — free-form "what was done about this" entries logged
  // against the ticket, not just its title/description.
  @Column("jsonb", { name: "action_points", default: () => "'[]'" })
  actionPoints: ChecklistItem[];
}
