import type { WorkMode } from "../../utils/types";

/** Wire shape — GET /scrum and PUT /scrum both return this. */
export interface ScrumEntryInterface {
  id: string;
  employeeId: string;
  date: string;
  workPerformed: string;
  workMode: WorkMode;
  updatedAt: string;
}
