import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PhaseTemplate } from "../entities/phase-template.entity";
import { TaskTemplate } from "../entities/task-template.entity";
import { ProjectTemplatesController } from "./project-templates.controller";
import { ProjectTemplatesService } from "./project-templates.service";

@Module({
  imports: [TypeOrmModule.forFeature([PhaseTemplate, TaskTemplate])],
  controllers: [ProjectTemplatesController],
  providers: [ProjectTemplatesService],
  // Exported so SeedService and ProjectsService can build projects from the
  // DB template.
  exports: [ProjectTemplatesService],
})
export class ProjectTemplatesModule {}
