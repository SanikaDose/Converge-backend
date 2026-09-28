import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PhaseTemplate } from "./phase-template.entity";

/**
 * A default task within a phase template. `dayOffset`/`duration` feed the
 * business-day scheduler (computePlanned) when a project is created — the
 * scheduling math is unchanged; only the source of these numbers moved from
 * the in-code TEMPLATE to this table.
 */
@Entity("task_templates")
export class TaskTemplate {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "phase_template_id" })
  @Index()
  phaseTemplateId: string;

  @ManyToOne(() => PhaseTemplate, (p) => p.tasks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "phase_template_id" })
  phaseTemplate: PhaseTemplate;

  @Column("varchar")
  name: string;

  /** Default description copied onto the task when a project is generated. */
  @Column("text", { default: "" })
  description: string;

  @Column("int", { name: "day_offset" })
  dayOffset: number;

  @Column("int")
  duration: number;

  /** Default "critical points" copied onto the task's checklist when a project
   * is generated. Plain text lines here; each becomes a ChecklistItem (unchecked)
   * on the created task. jsonb array of strings, defaults to empty. */
  @Column("jsonb", { name: "critical_points", default: () => "'[]'" })
  criticalPoints: string[];

  @Column("int")
  order: number;
}
