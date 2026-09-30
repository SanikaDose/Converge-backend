import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { ticketMessages } from "../constants/messages";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { TicketsService } from "./tickets.service";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { UpdateTicketDto } from "./dto/update-ticket.dto";
import type { TicketInterface } from "./interface/ticket.interface";

@Controller(apiControllerPath.tickets.root)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // Reads are open to any signed-in user; raising, updating and deleting a
  // ticket are for Admins and Leads (matches the UI's `roleCan` — the global
  // guard only authenticates, so the role is enforced here).
  private assertCanManage(user: JwtPayload) {
    if (user.appRole !== "Admin" && user.appRole !== "Lead") {
      throw new ForbiddenException(ticketMessages.adminOnly);
    }
  }

  @Get(apiControllerPath.tickets.getList)
  findAll(): Promise<TicketInterface[]> {
    return this.ticketsService.findAll();
  }

  @Post(apiControllerPath.tickets.create)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto): Promise<TicketInterface> {
    this.assertCanManage(user);
    return this.ticketsService.create(dto);
  }

  @Patch(apiControllerPath.tickets.updateById)
  update(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTicketDto): Promise<TicketInterface> {
    this.assertCanManage(user);
    return this.ticketsService.update(id, dto);
  }

  @Delete(apiControllerPath.tickets.deleteById)
  remove(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string): Promise<{ id: string }> {
    this.assertCanManage(user);
    return this.ticketsService.remove(id);
  }
}
