import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { MiscTasksService } from "./misc-tasks.service";
import { CreateMiscTaskDto } from "./dto/create-misc-task.dto";
import { UpdateMiscTaskDto } from "./dto/update-misc-task.dto";
import { UpdateMiscTaskStatusDto } from "./dto/update-misc-task-status.dto";
import type { MiscTaskInterface } from "./interface/misc-task.interface";

/**
 * Miscellaneous tasks. Anyone signed in may read the list; only an admin may
 * create/edit/delete — enforced here explicitly (the global guard authenticates
 * but doesn't authorize by role). The creator is taken from the token, not the
 * body, so it can't be spoofed.
 */
@Controller(apiControllerPath.miscTasks.root)
export class MiscTasksController {
  constructor(private readonly service: MiscTasksService) {}


  private assertCanManage(user: JwtPayload) {
    if (user.appRole !== "Admin" && user.appRole !== "Lead") {
      throw new ForbiddenException(
        "Only an administrator or lead can manage tasks.",
      );
    }
  }
  

  @Get(apiControllerPath.miscTasks.getList)
  findAll(): Promise<MiscTaskInterface[]> {
    return this.service.findAll();
  }

  @Post(apiControllerPath.miscTasks.create)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMiscTaskDto): Promise<MiscTaskInterface> {
    this.assertCanManage(user);
    return this.service.create(dto, user.sub);
  }

  @Patch(apiControllerPath.miscTasks.updateById)
  update(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMiscTaskDto): Promise<MiscTaskInterface> {
    this.assertCanManage(user);
    return this.service.update(id, dto);
  }

  /**
   * Status-only change. Unlike full edit, this is allowed for an admin/lead OR
   * an employee the task is assigned to — the service enforces that. Lets the
   * person doing the work move it To Do → In Progress → Completed without the
   * full manage permission.
   */
  @Patch(apiControllerPath.miscTasks.updateStatusById)
  updateStatus(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateMiscTaskStatusDto): Promise<MiscTaskInterface> {
    return this.service.updateStatus(id, dto.status, user);
  }

  @Delete(apiControllerPath.miscTasks.deleteById)
  remove(@CurrentUser() user: JwtPayload, @Param("id", ParseUUIDPipe) id: string): Promise<{ id: string }> {
    this.assertCanManage(user);
    return this.service.remove(id);
  }
}
