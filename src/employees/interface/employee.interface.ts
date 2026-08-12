import type { OrgRole } from '../../utils/types';

export interface TeamMemberInterface {
  id: string;
  name: string;
  role: OrgRole;
}

export interface EmployeeInterface extends TeamMemberInterface {
  teamId: string;
  /** Flat team display name, denormalised for the frontend's Employee type. */
  team: string;
}

export interface TeamInterface {
  id: string;
  name: string;
  members: TeamMemberInterface[];
}

/**
 * GET /employees. Shaped to match the frontend's Team/Employee types
 * exactly rather than returning raw entity rows — note passwordHash is
 * absent by construction, and the service never selects it.
 */
export interface OrgDirectoryInterface {
  teams: TeamInterface[];
  employees: EmployeeInterface[];
}
