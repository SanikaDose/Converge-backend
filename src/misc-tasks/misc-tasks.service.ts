import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EmailService } from "../notifications/email/email.service";
import { NotificationFeedService } from "../notification-feed/notification-feed.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MiscTask } from "../entities/misc-task.entity";
import { Project } from "../entities/project.entity";
import { Employee } from "../entities/employee.entity";
import { newId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import type { CreateMiscTaskDto } from "./dto/create-misc-task.dto";
import type { UpdateMiscTaskDto } from "./dto/update-misc-task.dto";
import type { ChecklistItem, MiscTaskStatus } from "../utils/types";


@Injectable()
export class MiscTasksService {
  private readonly logger = new Logger(MiscTasksService.name);

  constructor(
    @InjectRepository(MiscTask) private readonly repo: Repository<MiscTask>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    private readonly emailService: EmailService,
    private readonly notificationFeed: NotificationFeedService,
  ) {}

  /** The frontend origin, always with a protocol (mirrors NotificationsService). */
  private frontendOrigin(): string {
    const url = (process.env.FRONTEND_URL ?? "").trim().replace(/\/+$/, "");
    if (!url) return "";
    const hostPart = url.replace(/^https?:\/\//i, "");
    const isLocal = /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(hostPart);
    return `${isLocal ? "http" : "https"}://${hostPart}`;
  }

  /**
   * Fan a misc-task event out to its assignees: a stored bell notification for
   * each (assigned / completed), plus an email to each who has an address.
   * Every channel is isolated so a failure never fails the task write.
   */
  private async notifyAssignees(
    task: MiscTask,
    variant: "assigned" | "completed",
    targetIds?: string[],
  ): Promise<void> {
    const ids = targetIds ?? task.assignees ?? [];
    if (!ids.length) return;

    const employees: Employee[] = [];
    for (const id of ids) {
      const emp = await this.employeeRepo.findOneBy({ id });
      if (emp) employees.push(emp);
    }
    if (!employees.length) return;

    const origin = this.frontendOrigin();
    const taskUrl = origin ? `${origin}/tasks?task=${task.id}` : undefined;
    const relatedTo = task.projectName || "Other";
    const contextLead = variant === "completed" ? "Task completed" : "Task assigned to you";

    // Bell feed — one stored notification per recipient.
    try {
      await this.notificationFeed.notify(employees.map(e => e.id), {
        kind: "misc-task",
        title: task.title,
        context: `${contextLead} · ${relatedTo}`,
        link: `/tasks?task=${task.id}`,
        refId: task.id,
      });
    } catch (error) {
      this.logger.error(`Bell notification failed for misc task ${task.id}`, error instanceof Error ? error.stack : String(error));
    }

    // Email — per assignee who has an address. Fire-and-forget: emails are slow
    // SMTP round-trips, and the task (and the bell write above) are already
    // saved, so we don't block the caller on them. Best-effort, as before.
    const recipients = employees.filter(e => e.email);
    if (recipients.length) {
      void (async () => {
        for (const emp of recipients) {
          try {
            await this.emailService.sendMiscTaskEmail({
              to: emp.email as string,
              taskTitle: task.title,
              projectName: task.projectName,
              priority: task.priority,
              assignedTo: emp.name,
              dueDate: task.endDate ?? task.dueDate,
              taskUrl,
              variant,
            });
          } catch (error) {
            this.logger.error(`Email notification failed for ${emp.email}`, error instanceof Error ? error.stack : String(error));
          }
        }
      })();
    }
  }

  findAll(): Promise<MiscTask[]> {
    return this.repo.find({ order: { createdAt: "DESC" } });
  }

  /** Resolve the (denormalised) project name; null projectId = "Other". */
  private async resolveProjectName(projectId: string | null | undefined): Promise<{ id: string | null; name: string | null }> {
    if (!projectId) return { id: null, name: null };
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException("Project not found.");
    return { id: project.id, name: project.name };
  }

  /** Validate assignee ids against the directory and return them de-duped. */
  private async resolveAssignees(assignees?: string[], assignedTo?: string | null): Promise<string[]> {
    const requested = Array.from(new Set(
      (assignees && assignees.length ? assignees : (assignedTo ? [assignedTo] : [])).filter(Boolean),
    ));
    for (const id of requested) {
      const emp = await this.employeeRepo.findOneBy({ id });
      if (!emp) throw new NotFoundException("Assigned employee not found");
    }
    return requested;
  }

  async create(dto: CreateMiscTaskDto, createdBy: string): Promise<MiscTask> {
    const project = await this.resolveProjectName(dto.projectId);
    const assignees = await this.resolveAssignees(dto.assignees, dto.assignedTo);

    const task = this.repo.create({
      id: newId(),
      title: dto.title,
      description: dto.description || "",
      projectId: project.id,
      projectName: project.name,
      assignees,
      assignedTo: assignees[0] || null,
      priority: dto.priority || "Medium",
      // A new task always starts at "To Do"; status is moved later by a
      // lead or the assigned employee via the status-only path.
      status: "To Do",
      dueDate: dto.dueDate || null,
      startDate: dto.startDate || null,
      endDate: dto.endDate || null,
      checklist: (dto.checklist as ChecklistItem[]) || [],
      createdAt: todayISO(),
      // Creator taken from the verified token, never the request body.
      createdBy,
      updatedAt: todayISO(),
      history: [],
    });
    const saved = await this.repo.save(task);

    // Notify the assignees they've been given a task (bell + email).
    await this.notifyAssignees(saved, "assigned");

    return saved;
  }

  async update(id: string, dto: UpdateMiscTaskDto): Promise<MiscTask> {
    const task = await this.repo.findOneBy({ id });
    if (!task) throw new NotFoundException("Task not found.");

    // Snapshot before applying the edit so we can detect the completion edge
    // and any newly-added assignees to notify.
    const wasCompleted = task.status === "Completed";
    const prevAssignees = task.assignees ?? [];

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate || null;
    if (dto.startDate !== undefined) task.startDate = dto.startDate || null;
    if (dto.endDate !== undefined) task.endDate = dto.endDate || null;
    if (dto.checklist !== undefined) task.checklist = dto.checklist as ChecklistItem[];

    // "Related to" can be changed, including back to "Other" (projectId null).
    if (dto.projectId !== undefined) {
      const project = await this.resolveProjectName(dto.projectId);
      task.projectId = project.id;
      task.projectName = project.name;
    }

    // Keep the primary-assignee mirror in step when assignees is edited.
    if (dto.assignees !== undefined || dto.assignedTo !== undefined) {
      const assignees = await this.resolveAssignees(dto.assignees, dto.assignedTo);
      task.assignees = assignees;
      task.assignedTo = assignees[0] || null;
    }

    task.updatedAt = todayISO();
    const saved = await this.repo.save(task);

    if (!wasCompleted && saved.status === "Completed") {
      // Transition *into* Completed — notify everyone on the task (bell + email).
      await this.notifyAssignees(saved, "completed");
    } else {
      // Assignees added via an edit get the same "assigned" notification a new
      // task's assignees get. Only the newly-added ones, so existing assignees
      // aren't re-notified on an unrelated edit.
      const newlyAdded = (saved.assignees ?? []).filter(aid => !prevAssignees.includes(aid));
      if (newlyAdded.length) await this.notifyAssignees(saved, "assigned", newlyAdded);
    }

    return saved;
  }

  /**
   * Status-only change, permitted for an admin/lead OR an employee the task is
   * assigned to. Delegates to update() so the completion notification (and its
   * "into Completed" edge) is handled in exactly one place.
   */
  async updateStatus(
    id: string,
    status: MiscTaskStatus,
    user: { sub: string; appRole: string },
  ): Promise<MiscTask> {
    const task = await this.repo.findOneBy({ id });
    if (!task) throw new NotFoundException("Task not found.");

    const isManager = user.appRole === "Admin" || user.appRole === "Lead";
    const isAssignee = (task.assignees ?? []).includes(user.sub);
    if (!isManager && !isAssignee) {
      throw new ForbiddenException("You can only change the status of a task assigned to you.");
    }

    return this.update(id, { status });
  }

  async remove(id: string): Promise<{ id: string }> {
    const result = await this.repo.delete({ id });
    if (!result.affected) throw new NotFoundException("Task not found.");
    return { id };
  }
}
