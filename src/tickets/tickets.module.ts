import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Ticket } from "../entities/ticket.entity";
import { Project } from "../entities/project.entity";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Employee } from "src/entities/employee.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, Project, Employee]), NotificationsModule,], 
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
