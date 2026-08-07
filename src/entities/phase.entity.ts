import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Project } from "./project.entity";

@Entity("phases")
export class Phase {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar", { name: "project_id" })
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
}
