import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { templateMessages } from "../constants/messages";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { ProjectTemplatesService } from "./project-templates.service";
import { AddTaskTemplateDto } from "./dto/add-task-template.dto";
import { ReorderTasksDto } from "./dto/reorder-tasks.dto";
import { UpdateTaskTemplateDto } from "./dto/update-task-template.dto";
import { AddPhaseTemplateDto } from "./dto/add-phase-template.dto";
import { UpdatePhaseTemplateDto } from "./dto/update-phase-template.dto";
import { CreateProjectTemplateDto } from "./dto/create-project-template.dto";
import { UpdateProjectTemplateDto } from "./dto/update-project-template.dto";

const routes = apiControllerPath.projectTemplates;

/**
 * Named project templates. Anyone signed in may read them (the create form
 * needs the list + a template's phases); only an admin may create/edit/delete
 * templates, phases, or tasks — enforced here explicitly, since the global
 * guard authenticates but doesn't yet authorize by role.
 *
 * Route ordering matters: the literal-prefixed routes ('phases/…', 'tasks/…',
 * ':templateId/phases') are declared before the bare ':templateId' routes so
 * Nest matches them first.
 */
@Controller(routes.root)
export class ProjectTemplatesController {
  constructor(private readonly service: ProjectTemplatesService) {}

  private assertAdmin(user: JwtPayload) {
    if (user.appRole !== "Admin") throw new ForbiddenException(templateMessages.adminOnly);
  }

  // ---- template list + create ----
  @Get(routes.list)
  list() {
    return this.service.listTemplates();
  }

  @Post(routes.create)
  createTemplate(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectTemplateDto) {
    this.assertAdmin(user);
    return this.service.createTemplate(dto);
  }

  // ---- phase mutations ----
  @Post(routes.addPhase)
  addPhase(
    @CurrentUser() user: JwtPayload,
    @Param("templateId", ParseUUIDPipe) templateId: string,
    @Body() dto: AddPhaseTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.addPhase(templateId, dto);
  }

  @Patch(routes.updatePhase)
  updatePhase(
    @CurrentUser() user: JwtPayload,
    @Param("phaseId", ParseUUIDPipe) phaseId: string,
    @Body() dto: UpdatePhaseTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.updatePhase(phaseId, dto);
  }

  @Delete(routes.deletePhase)
  deletePhase(
    @CurrentUser() user: JwtPayload,
    @Param("phaseId", ParseUUIDPipe) phaseId: string,
  ) {
    this.assertAdmin(user);
    return this.service.deletePhase(phaseId);
  }

  // ---- task mutations ----
  @Post(routes.addTask)
  addTask(
    @CurrentUser() user: JwtPayload,
    @Param("phaseId", ParseUUIDPipe) phaseId: string,
    @Body() dto: AddTaskTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.addTask(phaseId, dto);
  }

  @Patch(routes.reorderTasks)
  reorderTasks(
    @CurrentUser() user: JwtPayload,
    @Param("phaseId", ParseUUIDPipe) phaseId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    this.assertAdmin(user);
    return this.service.reorderTasks(phaseId, dto.taskIds);
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

  // ---- a single template's phases + rename/delete (bare :templateId) ----
  @Get(routes.getOne)
  getOne(@Param("templateId", ParseUUIDPipe) templateId: string) {
    return this.service.getTemplate(templateId);
  }

  @Patch(routes.updateTemplate)
  updateTemplate(
    @CurrentUser() user: JwtPayload,
    @Param("templateId", ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateProjectTemplateDto,
  ) {
    this.assertAdmin(user);
    return this.service.updateTemplate(templateId, dto);
  }

  @Delete(routes.deleteTemplate)
  deleteTemplate(
    @CurrentUser() user: JwtPayload,
    @Param("templateId", ParseUUIDPipe) templateId: string,
  ) {
    this.assertAdmin(user);
    return this.service.deleteTemplate(templateId);
  }
}
