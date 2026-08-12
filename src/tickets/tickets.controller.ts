import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import type { TicketInterface } from "./interface/ticket.interface";

@Controller(apiControllerPath.tickets.root)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(apiControllerPath.tickets.getList)
  findAll(): Promise<TicketInterface[]> {
    return this.ticketsService.findAll();
  }

  @Post(apiControllerPath.tickets.create)
  create(@Body() dto: CreateTicketDto): Promise<TicketInterface> {
    return this.ticketsService.create(dto);
  }

  @Patch(apiControllerPath.tickets.updateById)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto): Promise<TicketInterface> {
    return this.ticketsService.update(id, dto);
  }
}
