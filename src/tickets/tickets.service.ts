import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ticket } from "../entities/ticket.entity";
import { Project } from "../entities/project.entity";
import { newId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import { ticketMessages } from "../constants/messages";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { UpdateTicketDto } from "./dto/update-ticket.dto";
import { Employee } from "src/entities/employee.entity";
import { NotificationsService } from "src/notifications/notifications.service";

@Injectable()
export class TicketsService {

  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,

    private readonly notificationsService: NotificationsService,
  ) { }

  findAll(): Promise<Ticket[]> {
    return this.ticketRepo.find({
      relations: {
        assignee: true,
      },
      order: {
        createdAt: "DESC",
        seq: "DESC",
      },
    });
  }

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const project = await this.projectRepo.findOneBy({
      id: dto.projectId,
    });

    if (!project) {
      throw new NotFoundException(
        ticketMessages.projectNotFound,
      );
    }

    // Multi-assignee: accept `assignees`, fall back to the single `assignedTo`.
    const requestedIds = Array.from(new Set(
      (dto.assignees && dto.assignees.length ? dto.assignees : (dto.assignedTo ? [dto.assignedTo] : [])).filter(Boolean),
    ));

    const assignees: Employee[] = [];
    for (const empId of requestedIds) {
      const emp = await this.employeeRepo.findOneBy({ id: empId });
      if (!emp) throw new NotFoundException("Assigned employee not found");
      assignees.push(emp);
    }

    const maxSeq = await this.ticketRepo.maximum("seq");
    const ticket = this.ticketRepo.create({
      id: newId(),
      seq: (maxSeq || 0) + 1,
      title: dto.title,
      description: dto.description || "",
      projectId: dto.projectId,
      projectName: project.name,
      phase: dto.phase || null,
      // assignedTo mirrors the first owner so single-avatar display + the FK stay valid.
      assignedTo: assignees[0]?.id || null,
      assignees: assignees.map(a => a.id),
      priority: dto.priority || "Medium",
      status: "Open",
      createdAt: todayISO(),
      assignee: assignees[0] ?? null,
    });

    const savedTicket = await this.ticketRepo.save(ticket);

    // Fire-and-forget: the ticket is already persisted, so we don't make the
    // caller wait on email/WhatsApp/Chat (each a slow network round-trip). The
    // dispatch already isolates every channel in its own try/catch; the outer
    // .catch here only guards against an unhandled rejection. Notifications are
    // best-effort (as before) — nothing about the ticket depends on them.
    if (assignees.length) {
      void this.notificationsService
        .notifyTicketAssigned(savedTicket, assignees)
        .catch(error => console.error(`Failed to send ticket notifications for ticket ${savedTicket.id}`, error));
    }

    return savedTicket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOneBy({ id });
    if (!ticket) throw new NotFoundException(ticketMessages.notFound);
    // A closed ticket can only move to "Reopened" (the reopen action) — no other
    // status change is allowed on a closed ticket. Reopening clears resolvedAt
    // below, so the ticket reads as active work again.
    if (ticket.status === "Closed" && dto.status && dto.status !== "Closed" && dto.status !== "Reopened") {
      throw new ConflictException(ticketMessages.closedFinal);
    }
    // A reopened ticket can only be closed again — not sent back to Open/In
    // Progress/Resolved. Mirrors the closed-ticket rule above so the API can't
    // be used to route around the UI, which only offers "Closed" for a reopened
    // ticket.
    if (ticket.status === "Reopened" && dto.status && dto.status !== "Reopened" && dto.status !== "Closed") {
      throw new ConflictException(ticketMessages.reopenedFinal);
    }
    const wasClosed = ticket.status === "Closed";
    const wasReopened = ticket.status === "Reopened";
    Object.assign(ticket, dto);
    // Keep the primary assignee mirror in step when assignees is edited.
    if (dto.assignees !== undefined) {
      ticket.assignees = dto.assignees;
      ticket.assignedTo = dto.assignees[0] ?? null;
    }

    // The closing date is owned here, not sent by the client, so it can't be
    // backdated or skipped. Resolved→Closed keeps the original stamp: that's
    // the date the work actually finished, and Closed is just bookkeeping.
    const isDone = ticket.status === "Closed";
    if (isDone && !ticket.resolvedAt) ticket.resolvedAt = todayISO();
    if (!isDone) ticket.resolvedAt = null;

    const saved = await this.ticketRepo.save(ticket);

    // On the transition *into* Closed, notify the related users (email) + the
    // team space (Google Chat). Only on the edge, so re-saving a closed ticket
    // doesn't spam. Fire-and-forget: the ticket is already saved, so the caller
    // doesn't wait on the (slow) sends — best-effort, same as before.
    if (!wasClosed && saved.status === "Closed") {
      void (async () => {
        const assignees = await this.loadAssignees(saved.assignees);
        await this.notificationsService.notifyTicketClosed(saved, assignees);
      })().catch(error => console.error(`Failed to send close notifications for ticket ${saved.id}`, error));
    }

    // Same, on the transition *into* Reopened — so reopening a ticket notifies
    // just like closing does.
    if (!wasReopened && saved.status === "Reopened") {
      void (async () => {
        const assignees = await this.loadAssignees(saved.assignees);
        await this.notificationsService.notifyTicketReopened(saved, assignees);
      })().catch(error => console.error(`Failed to send reopen notifications for ticket ${saved.id}`, error));
    }

    return saved;
  }

  async remove(id: string): Promise<{ id: string }> {
    const result = await this.ticketRepo.delete({ id });
    if (!result.affected) throw new NotFoundException(ticketMessages.notFound);
    return { id };
  }

  /** Resolve assignee ids to Employee rows (skips any that no longer exist). */
  private async loadAssignees(ids: string[]): Promise<Employee[]> {
    const employees: Employee[] = [];
    for (const empId of ids ?? []) {
      const emp = await this.employeeRepo.findOneBy({ id: empId });
      if (emp) employees.push(emp);
    }
    return employees;
  }
}
