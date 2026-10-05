import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import type { PhaseDiscipline } from "../utils/types";
import { TaskTemplate } from "./task-template.entity";
import { ProjectTemplate } from "./project-template.entity";

/**
 * The master list of phases a new project is built from — data, not
 * hardcode. Seeded once from the in-code TEMPLATE; thereafter admins edit
 * its tasks (see TaskTemplate). Editing a template never touches existing
 * projects — a project's phases/tasks are its own snapshot taken at
 * creation. Discipline drives which phases a given project gets.
 */
@Entity("phase_templates")
export class PhaseTemplate {
  @PrimaryColumn("uuid")
  id: string;

  /** The template this phase belongs to. Nullable only so the column can be
   * added to existing rows; the service backfills every phase onto the default
   * template on boot, so it's effectively always set. */
  @Column("uuid", { name: "template_id", nullable: true })
  @Index()
  templateId: string | null;

  @ManyToOne(() => ProjectTemplate, (t) => t.phases, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "template_id" })
  template: ProjectTemplate | null;

  @Column("varchar")
  name: string;

  @Column("int")
  order: number;

  /** 1-based project week this phase starts in (7-day project weeks). */
  @Column("int", { name: "week_start", default: 1 })
  weekStart: number;

  /** How many whole project weeks the phase (and all its tasks) occupies. */
  @Column("int", { name: "duration_weeks", default: 1 })
  durationWeeks: number;

  @Column("boolean", { default: false })
  critical: boolean;

  /** Null = common (always generated); otherwise the owning discipline. */
  @Column("varchar", { nullable: true })
  discipline: PhaseDiscipline | null;

  @OneToMany(() => TaskTemplate, (t) => t.phaseTemplate, { cascade: true })
  tasks: TaskTemplate[];
}
