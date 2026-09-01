import { Injectable, NotFoundException } from "@nestjs/common";
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

    // Notify every assignee.
    for (const assignee of assignees) {
      try {
        await this.notificationsService.notifyTicketAssigned(savedTicket, assignee);
      } catch (error) {
        console.error(`Failed to send ticket notifications for ticket ${savedTicket.id}`, error);
      }
    }

    return savedTicket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOneBy({ id });
    if (!ticket) throw new NotFoundException(ticketMessages.notFound);
    Object.assign(ticket, dto);
    // Keep the primary assignee mirror in step when assignees is edited.
    if (dto.assignees !== undefined) {
      ticket.assignees = dto.assignees;
      ticket.assignedTo = dto.assignees[0] ?? null;
    }

    // The closing date is owned here, not sent by the client, so it can't be
    // backdated or skipped. Resolved→Closed keeps the original stamp: that's
    // the date the work actually finished, and Closed is just bookkeeping.
    const isDone = ticket.status === "Resolved" || ticket.status === "Closed";
    if (isDone && !ticket.resolvedAt) ticket.resolvedAt = todayISO();
    if (!isDone) ticket.resolvedAt = null;

    return this.ticketRepo.save(ticket);
  }
}
