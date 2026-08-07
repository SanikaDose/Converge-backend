import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee } from "../entities/employee.entity";
import { Team } from "../entities/team.entity";
import { Task } from "../entities/task.entity";
import { TeamPerformanceController } from "./team-performance.controller";
import { TeamPerformanceService } from "./team-performance.service";

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Team, Task])],
  controllers: [TeamPerformanceController],
  providers: [TeamPerformanceService],
})
export class TeamPerformanceModule {}
