import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { OrgRole } from "../common/types";
import { Team } from "./team.entity";

@Entity("employees")
export class Employee {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar")
  name: string;

  @Column("varchar")
  role: OrgRole;

  @Column("varchar", { name: "team_id" })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Team;
}
