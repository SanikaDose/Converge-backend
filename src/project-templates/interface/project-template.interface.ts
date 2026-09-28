import type { PhaseDiscipline } from "../../utils/types";

export interface TaskTemplateResponse {
  id: string;
  name: string;
  description: string;
  dayOffset: number;
  duration: number;
  criticalPoints: string[];
  order: number;
}

export interface PhaseTemplateResponse {
  id: string;
  name: string;
  order: number;
  critical: boolean;
  discipline: PhaseDiscipline | null;
  tasks: TaskTemplateResponse[];
}

/** One row of GET /project-templates — the list of named templates. */
export interface ProjectTemplateSummary {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  order: number;
  phaseCount: number;
  taskCount: number;
}
