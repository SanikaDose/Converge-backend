import type { ChecklistItem, Priority, TicketStatus } from '../../utils/types';

/** Wire shape of a ticket — GET /tickets, POST /tickets, PATCH /tickets/:id all return this. */
export interface TicketInterface {
  id: string;
  seq: number;
  title: string;
  description: string;
  projectId: string;
  /** Denormalised so the flat ticket list needs no join to show its project. */
  projectName: string;
  phase: string | null;
  assignedTo: string | null;
  priority: Priority;
  status: TicketStatus;
  createdAt: string;
  /** Stamped server-side on reaching Resolved/Closed, cleared on reopen. */
  resolvedAt: string | null;
  actionPoints: ChecklistItem[];
}
