import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { PhaseTemplate } from "./phase-template.entity";

/**
 * A named project template — a reusable set of phases + tasks a new project is
 * generated from. The app ships one default ("Standard"); admins can add more
 * (blank or duplicated from an existing one) and pick which to use when
 * creating a project. Editing a template never touches existing projects — a
 * project's phases/tasks are its own snapshot taken at creation.
 */
@Entity("project_templates")
export class ProjectTemplate {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar")
  name: string;

  @Column("text", { default: "" })
  description: string;

  /** Exactly one template is the default — preselected on the create form and
   * never deletable. */
  @Column("boolean", { name: "is_default", default: false })
  isDefault: boolean;

  @Column("int", { default: 0 })
  order: number;

  @Column("date", { name: "created_at" })
  createdAt: string;

  @OneToMany(() => PhaseTemplate, (p) => p.template, { cascade: true })
  phases: PhaseTemplate[];
}
