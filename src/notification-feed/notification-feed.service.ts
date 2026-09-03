import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "../entities/task.entity";
import { Project } from "../entities/project.entity";
import { Ticket } from "../entities/ticket.entity";
import type { NotificationItem } from "./interface/notification-feed.interface";

/**
 * Builds the signed-in user's bell feed on demand from live data — the
 * things assigned to *them*: open tasks they own, projects they lead, and
 * open tickets assigned to them. Nothing is stored: an item vanishes the
 * moment the task is completed, the ticket closed, or the lead reassigned,
 * so the feed can never go stale against the source of truth.
 */
@Injectable()
export class NotificationFeedService {
  constructor(
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async getForUser(userId: string): Promise<NotificationItem[]> {
    // jsonb containment: rows whose assignees array includes this user id.
    const contains = JSON.stringify([userId]);

    const [tasks, projects, tickets] = await Promise.all([
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

    // Newest first; items without a date sort to the end.
    items.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return items;
  }
}
