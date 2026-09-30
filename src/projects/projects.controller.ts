import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { projectMessages } from "../constants/messages";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import type { DeleteProjectResponseInterface, ProjectDetailInterface, ProjectIndexRowInterface } from "./interface/project.interface";

// `id` params use ParseUUIDPipe so a malformed id returns 400, not a 500 from
// the Postgres driver.
@Controller(apiControllerPath.projects.root)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // Reads are open to any signed-in user; writes are Admin-only (the global
  // guard only authenticates, so the role is enforced here — matching the UI's
  // `roleCan`, which grants project create/edit/delete to Admin only).
  private assertAdmin(user: JwtPayload) {
    if (user.appRole !== "Admin") throw new ForbiddenException(projectMessages.adminOnly);
  }

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

  // Lean, server-computed dashboard payload. Also declared before ':id'.
  @Get(apiControllerPath.projects.dashboard)
  findAllDashboard() {
    return this.projectsService.findAllDashboard();
  }

  @Post(apiControllerPath.projects.create)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto): Promise<ProjectDetailInterface> {
    this.assertAdmin(user);
    return this.projectsService.create(dto);
  }

  @Get(apiControllerPath.projects.getById)
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ProjectDetailInterface> {
    return this.projectsService.findOneDetail(id);
  }

  @Patch(apiControllerPath.projects.updateById)
  update(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto): Promise<ProjectDetailInterface> {
    this.assertAdmin(user);
    return this.projectsService.update(id, dto);
  }

  @Delete(apiControllerPath.projects.deleteById)
  remove(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string): Promise<DeleteProjectResponseInterface> {
    this.assertAdmin(user);
    return this.projectsService.remove(id);
  }
}
