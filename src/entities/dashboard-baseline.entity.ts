import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Single-row table capturing portfolio-wide stats the first time anything
 * asks for them — a real snapshot the dashboard's "vs last month" trend
 * captions diff against, rather than a fabricated number. Mirrors
 * converge_frontend's original in-memory getDashboardBaseline() behavior,
 * just persisted so it survives a backend restart.
 */
@Entity("dashboard_baseline")
export class DashboardBaseline {
  @PrimaryColumn("int", { default: 1 })
  id: number;

  @Column("int", { name: "active_projects" })
  activeProjects: number;

  @Column("int", { name: "completed_projects" })
  completedProjects: number;

  @Column("int", { name: "avg_completion_pct" })
  avgCompletionPct: number;

  @Column("int", { name: "delayed_tasks" })
  delayedTasks: number;

  @Column("int", { name: "total_tickets" })
  totalTickets: number;

  @Column("int", { name: "open_tickets" })
  openTickets: number;

  @Column("int", { name: "resolved_tickets" })
  resolvedTickets: number;

  @Column("int", { name: "ticket_resolution_pct" })
  ticketResolutionPct: number;

  @Column("timestamptz", { name: "captured_at" })
  capturedAt: Date;
}
