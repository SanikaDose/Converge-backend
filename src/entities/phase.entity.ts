import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Project } from "./project.entity";

@Entity("phases")
export class Phase {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "project_id" })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.phases, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: Project;

  @Column("varchar")
  name: string;

  @Column("boolean")
  critical: boolean;

  @Column("int")
  order: number;

  /** When true the phase is excluded from progress math (its tasks don't count). */
  @Column("boolean", { name: "not_required", default: false })
  notRequired: boolean;
}
