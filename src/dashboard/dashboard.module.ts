import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardBaseline } from "../entities/dashboard-baseline.entity";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import { Ticket } from "../entities/ticket.entity";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [TypeOrmModule.forFeature([DashboardBaseline, Project, Phase, Task, Ticket])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
