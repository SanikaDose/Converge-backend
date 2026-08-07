import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Team } from "../entities/team.entity";
import { Employee } from "../entities/employee.entity";
import { Project } from "../entities/project.entity";
import { Phase } from "../entities/phase.entity";
import { Task } from "../entities/task.entity";
import { Ticket } from "../entities/ticket.entity";
import { SeedService } from "./seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([Team, Employee, Project, Phase, Task, Ticket])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
