import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * A stored, per-user notification event — the record that "something happened
 * to you" (a misc task assigned to you, a task you own completed). Unlike the
 * *derived* bell items (open tasks/tickets/projects computed live on read), an
 * event like "completed" isn't a lasting state, so it can only be represented
 * by storing it. Rows are per recipient, carry their own read flag, and are
 * merged into the bell feed alongside the derived items.
 *
 * No FK on user_id (it's a plain employee id, varchar) so a notification never
 * blocks a directory edit and survives independently of the row it describes.
 */
@Entity("notifications")
export class Notification {
  @PrimaryColumn("uuid")
  id: string;

  /** Recipient employee id (matches employees.id, which is varchar). */
  @Index()
  @Column("varchar", { name: "user_id" })
  userId: string;

  /**
   * What produced it. Kept generic (e.g. "misc-task") so tickets/tasks can log
   * events here later; the bell maps it to a coloured dot + navigation.
   */
  @Column("varchar")
  kind: string;

  /** Headline — the task title. */
  @Column("varchar")
  title: string;

  /** Secondary line — e.g. "Task assigned to you · Project". */
  @Column("varchar")
  context: string;

  /** In-app deep link for the bell menu, e.g. "/tasks?task=<id>". */
  @Column("varchar", { nullable: true })
  link: string | null;

  /** The underlying row id (misc task id) — for navigation/dedupe. */
  @Column("varchar", { name: "ref_id", nullable: true })
  refId: string | null;

  /** Cleared to true once the recipient opens the bell. */
  @Column("boolean", { default: false })
  read: boolean;

  @Column("timestamptz", { name: "created_at", default: () => "now()" })
  createdAt: Date;
}
