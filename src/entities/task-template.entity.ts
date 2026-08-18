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

  @Column("int", { name: "day_offset" })
  dayOffset: number;

  @Column("int")
  duration: number;

  @Column("int")
  order: number;
}
