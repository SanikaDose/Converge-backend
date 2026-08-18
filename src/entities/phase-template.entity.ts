import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import type { PhaseDiscipline } from "../utils/types";
import { TaskTemplate } from "./task-template.entity";

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

  @Column("varchar")
  name: string;

  @Column("int")
  order: number;

  @Column("boolean", { default: false })
  critical: boolean;

  /** Null = common (always generated); otherwise the owning discipline. */
  @Column("varchar", { nullable: true })
  discipline: PhaseDiscipline | null;

  @OneToMany(() => TaskTemplate, (t) => t.phaseTemplate, { cascade: true })
  tasks: TaskTemplate[];
}
