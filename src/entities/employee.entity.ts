import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { AppRole, OrgRole } from "../common/types";
import { Team } from "./team.entity";

@Entity("employees")
export class Employee {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar")
  name: string;

  @Column("varchar")
  role: OrgRole;

  /**
   * Human-typed sign-in identifier (e.g. "SD001") — initials + a stable
   * sequence number, unique across the directory (plain initials collide:
   * Prachi Jamgaonkar and Pavitra Joshi are both "PJ"). Nullable only so
   * `synchronize: true` can add the column to rows that predate it; the
   * seeder backfills every employee.
   */
  @Column("varchar", { name: "employee_code", nullable: true, unique: true })
  employeeCode: string | null;

  /** bcrypt hash — never returned by any endpoint. */
  @Column("varchar", { name: "password_hash", nullable: true })
  passwordHash: string | null;

  /**
   * Application-level access role, distinct from `role` (the *org* title
   * shown in the directory). Team Leads seed as Admin, everyone else as
   * Developer — both currently hold every permission, see the frontend's
   * lib/data.ts PERMISSIONS table.
   */
  @Column("varchar", { name: "app_role", nullable: true })
  appRole: AppRole | null;

  @Column("varchar", { name: "team_id" })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Team;
}
