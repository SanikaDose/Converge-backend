import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import type { DeleteProjectResponseInterface, ProjectDetailInterface, ProjectIndexRowInterface } from "./interface/project.interface";

// `id` params use ParseUUIDPipe so a malformed id returns 400, not a 500 from
// the Postgres driver.
@Controller(apiControllerPath.projects.root)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(apiControllerPath.projects.getList)
  findAllIndex(): Promise<ProjectIndexRowInterface[]> {
    return this.projectsService.findAllIndex();
  }

  // Kanban board fetch. Declared before the ':id' route so 'board' isn't parsed
  // as a project id.
  @Get(apiControllerPath.projects.board)
  findAllBoard() {
    return this.projectsService.findAllBoard();
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
