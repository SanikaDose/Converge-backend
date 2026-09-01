/** What kind of assignment produced this notification. */
export type NotificationKind = "task" | "project" | "ticket";

/**
 * One item in a user's bell feed. Derived on read from the current
 * projects/tasks/tickets — there is no separate notifications table, so an
 * item disappears once the underlying assignment is completed or removed.
 */
export interface NotificationItem {
  /** Stable per underlying row, so the client can key/dedupe. */
  id: string;
  kind: NotificationKind;
  /** Headline — the task/ticket/project name. */
  title: string;
  /** Secondary line — project name, phase, status, etc. */
  context: string;
  /** For navigation from the bell menu. */
  projectId: string;
  /** ISO date the underlying item was created, newest first when present. */
  createdAt: string | null;
}
