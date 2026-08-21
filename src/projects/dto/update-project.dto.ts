import { IsOptional } from "class-validator";
import type { ProjectType, WeekDay, Warranty } from "../../utils/types";

export interface ProjectMetaPatch {
  name?: string;
  type?: ProjectType;
  customer?: string;
  location?: string | null;
  owner?: string | null;
  startDate?: string;
  endDate?: string;
  financialYear?: string | null;
  warranty?: Warranty | null;
  weekOff?: WeekDay[];
}

export interface PhasePatch {
  id: string;
  name: string;
  critical: boolean;
  order: number;
  notRequired?: boolean;
}

export interface TaskPatch {
  id: string;
  phaseId: string;
  order: number;
  name: string;
  description?: string;
  assignedTo?: string | null;
  assignees?: string[];
  priority?: string;
  dependencies?: string[];
  dayOffset: number;
  duration: number;
  plannedStart: string;
  plannedFinish: string;
  actualStart?: string | null;
  actualFinish?: string | null;
  status?: string;
  pendingChange?: unknown;
  achievement?: unknown;
  history?: unknown[];
  checklist?: unknown[];
}

/**
 * Loosely validated on purpose: this is the internal frontend<->backend
 * contract (not a public API), and the frontend always sends the *whole*
 * meta/phases/tasks it already holds in React state (see
 * ProjectDetail.tsx's mutation handlers) rather than partial diffs, so
 * there's no meaningful subset of fields to enforce here beyond "these
 * three top-level keys are each optional."
 */
export class UpdateProjectDto {
  @IsOptional()
  meta?: ProjectMetaPatch;

  @IsOptional()
  phases?: PhasePatch[];

  @IsOptional()
  tasks?: TaskPatch[];
}
