import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import type { DeleteProjectResponseInterface, ProjectDetailInterface, ProjectIndexRowInterface } from "./interface/project.interface";

@Controller(apiControllerPath.projects.root)
export class ProjectsController {
  // ParseUUIDPipe rejects a malformed id with a 400 before it reaches
  // Postgres. Without it a non-uuid path param reaches the driver and
  // surfaces as a 500 QueryFailedError, which is a server-error response
  // to what is really a bad request.
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(apiControllerPath.projects.getList)
  findAllIndex(): Promise<ProjectIndexRowInterface[]> {
    return this.projectsService.findAllIndex();
  }

  @Post(apiControllerPath.projects.create)
  create(@Body() dto: CreateProjectDto): Promise<ProjectDetailInterface> {
    return this.projectsService.create(dto);
  }

  @Get(apiControllerPath.projects.getById)
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ProjectDetailInterface> {
    return this.projectsService.findOneDetail(id);
  }

  @Patch(apiControllerPath.projects.updateById)
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto): Promise<ProjectDetailInterface> {
    return this.projectsService.update(id, dto);
  }

  @Delete(apiControllerPath.projects.deleteById)
  remove(@Param("id", ParseUUIDPipe) id: string): Promise<DeleteProjectResponseInterface> {
    return this.projectsService.remove(id);
  }
}
