import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import type { DeleteProjectResponseInterface, ProjectDetailInterface, ProjectIndexRowInterface } from "./interface/project.interface";

@Controller(apiControllerPath.projects.root)
export class ProjectsController {
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
  findOne(@Param("id") id: string): Promise<ProjectDetailInterface> {
    return this.projectsService.findOneDetail(id);
  }

  @Patch(apiControllerPath.projects.updateById)
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto): Promise<ProjectDetailInterface> {
    return this.projectsService.update(id, dto);
  }

  @Delete(apiControllerPath.projects.deleteById)
  remove(@Param("id") id: string): Promise<DeleteProjectResponseInterface> {
    return this.projectsService.remove(id);
  }
}
