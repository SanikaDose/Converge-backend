import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import type { AppRole, EmployeeStatus, OrgRole } from "../utils/types";
import { Team } from "./team.entity";

@Entity("employees")
export class Employee {
  @PrimaryColumn("varchar")
  id: string;

  @Column("varchar")
  name: string;

  @Column("varchar")
  role: OrgRole;

  @Column("varchar", { name: "employee_code", nullable: true, unique: true })
  employeeCode: string | null;

  @Column("varchar", { nullable: true })
  email: string | null;

@Column("varchar", { name: "phone_number", nullable: true })
  phoneNumber: string | null;

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

  /**
   * Forgot-password email OTP — bcrypt hash (never the code itself), its
   * expiry, and a wrong-attempt counter. All null when no reset is in flight;
   * cleared once the OTP is used or expires. See AuthService.forgotPassword.
   */
  @Column("varchar", { name: "reset_otp_hash", nullable: true })
  resetOtpHash: string | null;

  @Column("timestamptz", { name: "reset_otp_expires_at", nullable: true })
  resetOtpExpiresAt: Date | null;

  @Column("int", { name: "reset_otp_attempts", default: 0 })
  resetOtpAttempts: number;

  /** "active" or "inactive" — someone who left the org is marked inactive
   * rather than deleted, so their name/avatar still resolves on old records. */
  @Column("varchar", { default: "active" })
  status: EmployeeStatus;

  /**
   * Whether this employee appears on the daily Scrum board. Nullable so the
   * boot-time backfill can distinguish "never configured" (NULL) from an
   * admin's explicit choice; sales team + a few others start disabled.
   */
  @Column("boolean", { name: "scrum_enabled", nullable: true })
  scrumEnabled: boolean | null;

  @Column("varchar", { name: "team_id" })
  teamId: string;

  @ManyToOne(() => Team, (team) => team.members, { onDelete: "CASCADE" })
  @JoinColumn({ name: "team_id" })
  team: Team;
}
