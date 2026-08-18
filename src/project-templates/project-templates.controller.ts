import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { templateMessages } from "../constants/messages";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { ProjectTemplatesService } from "./project-templates.service";
import { AddTaskTemplateDto } from "./dto/add-task-template.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";

const routes = apiControllerPath.projectTemplates;

/**
 * The master project template. Anyone signed in may read it (the create form
 * needs it); only an admin may edit its tasks — enforced here explicitly,
 * since the global guard authenticates but doesn't yet authorize by role.
 * Phases are intentionally fixed: only their tasks are mutable.
 */
@Controller(routes.root)
export class ProjectTemplatesController {
  constructor(private readonly service: ProjectTemplatesService) {}

  private assertAdmin(user: JwtPayload) {
    if (user.appRole !== "Admin") throw new ForbiddenException(templateMessages.adminOnly);
  }

  @Get(routes.get)
  get() {
    return this.service.getTemplate();
  }

  @Post(routes.addTask)
  addTask(
    @CurrentUser() user: JwtPayload,
    @Param("phaseId", ParseUUIDPipe) phaseId: string,
    @Body() dto: AddTaskTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.addTask(phaseId, dto);
  }

  @Patch(routes.updateTask)
  updateTask(
    @CurrentUser() user: JwtPayload,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.updateTask(taskId, dto);
  }

  @Delete(routes.deleteTask)
  deleteTask(
    @CurrentUser() user: JwtPayload,
    @Param("taskId", ParseUUIDPipe) taskId: string,
  ) {
    this.assertAdmin(user);
    return this.service.deleteTask(taskId);
  }
}
