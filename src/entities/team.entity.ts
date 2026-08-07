import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Employee } from "./employee.entity";

@Entity("teams")
export class Team {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar")
  name: string;

  @OneToMany(() => Employee, (employee) => employee.team)
  members: Employee[];
}
