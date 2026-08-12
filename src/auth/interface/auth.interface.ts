import type { AppRole, OrgRole } from '../../utils/types';

/**
 * POST /auth/login. The signed-in employee's non-secret profile — the
 * bcrypt hash is verified server-side and never leaves the backend.
 */
export interface AuthedUserInterface {
  id: string;
  name: string;
  employeeCode: string;
  /** Directory job title. */
  role: OrgRole;
  /** Application access role — drives the frontend's permission table. */
  appRole: AppRole;
  teamId: string;
  team: string;
}
