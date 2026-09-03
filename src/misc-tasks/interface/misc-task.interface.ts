import type { ChecklistItem, HistoryEntry, MiscTaskStatus, Priority } from "../../utils/types";

/** Wire shape — GET/POST/PATCH /misc-tasks all return this. */
export interface MiscTaskInterface {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  projectName: string | null;
  assignedTo: string | null;
  assignees: string[];
  priority: Priority;
  status: MiscTaskStatus;
  dueDate: string | null;
  checklist: ChecklistItem[];
  createdAt: string;
  /** Employee id of the creator — audit field, not rendered in the UI. */
  createdBy: string | null;
  updatedAt: string | null;
  history: HistoryEntry[];
}
