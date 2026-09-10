/** What kind of assignment or event produced this notification. */
export type NotificationKind = "task" | "project" | "ticket" | "misc-task";

/**
 * One item in a user's bell feed. Two sources feed it:
 *  - *Derived* items (task/project/ticket) — computed live on read from the
 *    current data, so they vanish once the assignment is completed or removed.
 *  - *Stored* items (misc-task) — real notification rows for discrete events
 *    (assigned / completed) that carry their own `read` flag and persist.
 */
export interface NotificationItem {
  /** Stable per underlying row/event, so the client can key/dedupe. */
  id: string;
  kind: NotificationKind;
  /** Headline — the task/ticket/project name. */
  title: string;
  /** Secondary line — project name, phase, status, etc. */
  context: string;
  /** For navigating derived items to their project. "" for stored events. */
  projectId: string;
  /** ISO date the underlying item/event was created, newest first when present. */
  createdAt: string | null;
  /** Stored events carry a read flag; derived items are always "unread". */
  read?: boolean;
  /** Explicit in-app deep link (stored events), e.g. "/tasks?task=<id>". */
  link?: string | null;
}
