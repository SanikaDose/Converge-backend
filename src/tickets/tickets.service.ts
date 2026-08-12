import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Ticket } from "../entities/ticket.entity";
import { Project } from "../entities/project.entity";
import { genId } from "../utils/template";
import { todayISO } from "../utils/date-utils";
import { ticketMessages } from "../constants/messages";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { UpdateTicketDto } from "./dto/update-ticket.dto";

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
  ) {}

  findAll(): Promise<Ticket[]> {
    return this.ticketRepo.find({ order: { createdAt: "DESC", seq: "DESC" } });
  }

  async create(dto: CreateTicketDto): Promise<Ticket> {
    const project = await this.projectRepo.findOneBy({ id: dto.projectId });
    if (!project) throw new NotFoundException(ticketMessages.projectNotFound);

    const maxSeq = await this.ticketRepo.maximum("seq");
    const ticket = this.ticketRepo.create({
      id: genId("tkt"),
      seq: (maxSeq || 0) + 1,
      title: dto.title,
      description: dto.description || "",
      projectId: dto.projectId,
      projectName: project.name,
      phase: dto.phase || null,
      assignedTo: dto.assignedTo || null,
      priority: dto.priority || "Medium",
      status: "Open",
      createdAt: todayISO(),
    });
    return this.ticketRepo.save(ticket);
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOneBy({ id });
    if (!ticket) throw new NotFoundException(ticketMessages.notFound);
    Object.assign(ticket, dto);

    // The closing date is owned here, not sent by the client, so it can't be
    // backdated or skipped. Resolved→Closed keeps the original stamp: that's
    // the date the work actually finished, and Closed is just bookkeeping.
    const isDone = ticket.status === "Resolved" || ticket.status === "Closed";
    if (isDone && !ticket.resolvedAt) ticket.resolvedAt = todayISO();
    if (!isDone) ticket.resolvedAt = null;

    return this.ticketRepo.save(ticket);
  }
}
