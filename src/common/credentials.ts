/**
 * Sign-in credential derivation for seeded employees.
 *
 * These are DEVELOPMENT credentials: every seeded employee gets the same
 * well-known default password so the team can sign in as anyone while the
 * app is still pre-production. There is no self-service signup, password
 * reset, or password-change flow yet — when real users exist, replace this
 * with per-user secrets issued out-of-band and delete DEFAULT_PASSWORD.
 */
import { SEED_TEAMS } from "./org-seed-data";
import type { AppRole, OrgRole } from "./types";

/** Shared dev password for every seeded account. Not a production secret. */
export const DEFAULT_PASSWORD = "Converge@123";

/**
 * Initials + a global 1-based sequence number ("SD003"). The sequence is
 * what makes these unique — plain initials collide (Prachi Jamgaonkar and
 * Pavitra Joshi are both "PJ").
 */
export function employeeCodeFor(name: string, sequence: number): string {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return `${initials}${String(sequence).padStart(3, "0")}`;
}

/** Team Leads administer their team's projects; everyone else signs in as Developer. */
export function appRoleFor(orgRole: OrgRole): AppRole {
  return orgRole === "Team Lead" ? "Admin" : "Developer";
}

export interface SeedCredential {
  id: string;
  name: string;
  employeeCode: string;
  appRole: AppRole;
}

/**
 * The full credential list, derived from SEED_TEAMS in flat directory
 * order so the sequence numbers stay stable across re-seeds.
 */
export function buildSeedCredentials(): SeedCredential[] {
  return SEED_TEAMS.flatMap(team => team.members).map((member, i) => ({
    id: member.id,
    name: member.name,
    employeeCode: employeeCodeFor(member.name, i + 1),
    appRole: appRoleFor(member.role),
  }));
}
