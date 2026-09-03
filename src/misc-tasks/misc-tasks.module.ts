import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MiscTask } from "../entities/misc-task.entity";
import { Project } from "../entities/project.entity";
import { Employee } from "../entities/employee.entity";
import { MiscTasksController } from "./misc-tasks.controller";
import { MiscTasksService } from "./misc-tasks.service";

@Module({
  imports: [TypeOrmModule.forFeature([MiscTask, Project, Employee])],
  controllers: [MiscTasksController],
  providers: [MiscTasksService],
})
export class MiscTasksModule {}
