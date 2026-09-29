import type { PlainPhase, PlainTask } from '../../utils/business-logic';
import type { ProjectBucket, ProjectCharter, ProjectType, RelatedRepository, WeekDay } from '../../utils/types';

/**
 * Response contracts for the projects endpoints. Declaring the wire format
 * explicitly (rather than inferring it from whatever the service returns) makes
 * a shape change a deliberate edit here, and lets `tsc` catch a drifting service.
 */

/** One row of GET /projects — the lightweight portfolio index. */
export interface ProjectIndexRowInterface {
  id: string;
  name: string;
  type: string;
  customer: string;
  owner: string | null;
  startDate: string;
  endDate: string;
  pct: number;
  completed: number;
  total: number;
  delayed: number;
  plannedEnd: string;
  bucket: ProjectBucket;
  /** Just enough per task for the client to recompute delay state against "now". */
  taskLite: TaskLiteInterface[];
  phasesLite: PhaseLiteInterface[];
}

export interface TaskLiteInterface {
  phaseId: string;
  name: string;
  plannedFinish: string;
  actualFinish: string | null;
  status: string;
}

export interface PhaseLiteInterface {
  id: string;
  critical: boolean;
  name: string;
}

/** The `meta` block of a project detail — everything except phases/tasks. */
export interface ProjectMetaInterface {
  name: string;
  type: ProjectType;
  customer: string;
  location: string | null;
  owner: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  weekOff: WeekDay[];
  relatedRepositories: RelatedRepository[];
  charter: ProjectCharter | null;
}

/** GET /projects/:id — the full editable document. */
export interface ProjectDetailInterface {
  id: string;
  meta: ProjectMetaInterface;
  phases: PlainPhase[];
  tasks: PlainTask[];
}

/** DELETE /projects/:id */
export interface DeleteProjectResponseInterface {
  id: string;
}
