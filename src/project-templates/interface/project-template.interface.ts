import type { PhaseDiscipline } from "../../utils/types";

export interface TaskTemplateResponse {
  id: string;
  name: string;
  description: string;
  dayOffset: number;
  duration: number;
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
