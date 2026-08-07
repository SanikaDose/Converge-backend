import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ticket } from "../entities/ticket.entity";
import { Project } from "../entities/project.entity";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Project])],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
