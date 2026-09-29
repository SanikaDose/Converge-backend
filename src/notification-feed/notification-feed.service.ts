import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "../entities/task.entity";
import { Project } from "../entities/project.entity";
import { Ticket } from "../entities/ticket.entity";
import { Notification } from "../entities/notification.entity";
import { newId } from "../utils/template";
import type { NotificationItem } from "./interface/notification-feed.interface";

/**
 * Builds the signed-in user's bell feed from two sources:
 *  1. *Derived* live data — the things currently assigned to *them*: open tasks
 *     they own, projects they lead, and open tickets assigned to them. Nothing
 *     is stored, so an item vanishes the moment the task is completed, the
 *     ticket closed, or the lead reassigned — it can never go stale.
 *  2. *Stored* notification rows — discrete events (a misc task assigned to
 *     them, one they're on marked completed) that aren't a lasting state and so
 *     can only be represented by storing them. These carry a read flag.
 */
@Injectable()
export class NotificationFeedService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
  ) {}

  async getForUser(userId: string): Promise<NotificationItem[]> {
    // jsonb containment: rows whose assignees array includes this user id.
    const contains = JSON.stringify([userId]);

    const [tasks, projects, tickets, stored] = await Promise.all([
      this.taskRepo
        .createQueryBuilder("task")
        .leftJoinAndSelect("task.project", "project")
        .where("task.assignees @> CAST(:contains AS jsonb)", { contains })
        .andWhere("task.status NOT IN (:...done)", { done: ["Completed", "Not Required"] })
        .getMany(),
      this.projectRepo.findBy({ ownerId: userId }),
      this.ticketRepo
        .createQueryBuilder("ticket")
        .where("ticket.assignees @> CAST(:contains AS jsonb)", { contains })
        .andWhere("ticket.status IN (:...open)", { open: ["Open", "In Progress", "Reopened"] })
        .getMany(),
      this.notifRepo.find({ where: { userId }, order: { createdAt: "DESC" }, take: 50 }),
    ]);

    const items: NotificationItem[] = [];

    for (const t of tasks) {
      items.push({
        id: `task:${t.id}`,
        kind: "task",
        title: t.name,
        context: t.project?.name ? `Task · ${t.project.name}` : "Task assigned to you",
        projectId: t.projectId,
        createdAt: t.plannedStart ?? null,
      });
    }

    for (const p of projects) {
      items.push({
        id: `project:${p.id}`,
        kind: "project",
        title: p.name,
        context: "You are the project lead",
        projectId: p.id,
        createdAt: p.createdAt ?? null,
      });
    }

    for (const t of tickets) {
      items.push({
        id: `ticket:${t.id}`,
        kind: "ticket",
        title: `#${t.seq} ${t.title}`,
        context: `Ticket · ${t.projectName}`,
        projectId: t.projectId,
        createdAt: t.createdAt ?? null,
      });
    }

    for (const n of stored) {
      items.push({
        id: `notif:${n.id}`,
        kind: (n.kind as NotificationItem["kind"]) || "misc-task",
        title: n.title,
        context: n.context,
        projectId: "",
        createdAt: n.createdAt ? n.createdAt.toISOString() : null,
        read: n.read,
        link: n.link,
      });
    }

    // Newest first; items without a date sort to the end.
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return items;
  }

  /**
   * Record a notification for each recipient. Used by other modules (misc
   * tasks) to log "assigned"/"completed" events. Fire-and-forget: callers
   * wrap it so a notification failure never fails the underlying write.
   */
  async notify(
    userIds: string[],
    data: { kind: string; title: string; context: string; link?: string | null; refId?: string | null },
  ): Promise<void> {
    const recipients = Array.from(new Set((userIds ?? []).filter(Boolean)));
    if (!recipients.length) return;
    const rows = recipients.map(userId =>
      this.notifRepo.create({
        id: newId(),
        userId,
        kind: data.kind,
        title: data.title,
        context: data.context,
        link: data.link ?? null,
        refId: data.refId ?? null,
        read: false,
        createdAt: new Date(),
      }),
    );
    await this.notifRepo.save(rows);
  }

  /** Mark every stored notification for this user as read (bell opened). */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notifRepo.update({ userId, read: false }, { read: true });
    return { updated: result.affected ?? 0 };
  }
}
