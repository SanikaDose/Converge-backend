import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import type { ScrumReference, WorkMode } from "../utils/types";

/**
 * One employee's daily scrum update for one day. The page is a per-day grid of
 * every employee, so a row is uniquely a (employee, date) pair — enforced by a
 * composite unique index so the upsert on save can't create duplicates.
 *
 * No FK on employee_id (plain varchar, matching employees.id) so an update
 * survives directory edits and never blocks them — same pattern as notifications
 * and misc-task audit fields.
 */
@Entity("scrum_entries")
@Index("uq_scrum_employee_date", ["employeeId", "date"], { unique: true })
export class ScrumEntry {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar", { name: "employee_id" })
  employeeId: string;

  /** The scrum day (YYYY-MM-DD). */
  @Column("date")
  date: string;

  /** Free-text: what they worked on — project / task / ticket. */
  @Column("text", { default: "" })
  workPerformed: string;

  @Column("varchar", { name: "work_mode", default: "Office" })
  workMode: WorkMode;

  /**
   * Generic references to the projects / tasks / tickets worked on — picked
   * from the whole directory, not just what's assigned to this employee.
   */
  @Column("jsonb", { default: () => "'[]'" })
  references: ScrumReference[];

  @Column("timestamptz", { name: "updated_at" })
  updatedAt: string;
}
