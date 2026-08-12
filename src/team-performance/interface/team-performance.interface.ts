import type { OrgRole } from '../../utils/types';

/** One row of GET /team-performance — an employee with their task tallies. */
export interface TeamPerformanceRowInterface {
  id: string;
  name: string;
  role: OrgRole;
  team: string;
  teamId: string;
  total: number;
  completed: number;
  pending: number;
  delayed: number;
  completionPct: number;
}
