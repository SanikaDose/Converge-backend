import type { PlainPhase, PlainTask } from '../../utils/business-logic';
import type { ProjectBucket, ProjectType, WeekDay } from '../../utils/types';

/**
 * Response contracts for the projects endpoints, following Scout's
 * per-module `interface/` convention.
 *
 * These were previously implicit — every controller method returned
 * whatever the service happened to build, so the wire format existed only
 * as inference. Declaring it means a change to the shape the frontend
 * consumes has to be a deliberate edit here, and `tsc` catches a service
 * that stops matching.
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
