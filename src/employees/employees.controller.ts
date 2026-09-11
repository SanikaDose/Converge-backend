import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { DeleteEmployeeDto } from "./dto/delete-employee.dto";
import type { EmployeeInterface, OrgDirectoryInterface } from "./interface/employee.interface";

/**
 * Org directory. Any signed-in user may read it (assignee pickers, avatars).
 * Only an admin may add / edit / remove employees — enforced here explicitly,
 * since the global guard authenticates but doesn't authorize by role.
 */
@Controller(apiControllerPath.employees.root)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  private assertAdmin(user: JwtPayload) {
    if (user.appRole !== "Admin") {
      throw new ForbiddenException("Only an administrator can manage employees.");
    }
  }

  @Get(apiControllerPath.employees.getList)
  findAll(): Promise<OrgDirectoryInterface> {
    return this.employeesService.findAll();
  }

  @Post(apiControllerPath.employees.create)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEmployeeDto): Promise<EmployeeInterface> {
    this.assertAdmin(user);
    return this.employeesService.create(dto);
  }

  @Patch(apiControllerPath.employees.updateById)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateEmployeeDto): Promise<EmployeeInterface> {
    this.assertAdmin(user);
    return this.employeesService.update(id, dto);
  }

  @Delete(apiControllerPath.employees.deleteById)
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: DeleteEmployeeDto): Promise<{ id: string }> {
    this.assertAdmin(user);
    return this.employeesService.remove(id, user.sub, dto.password);
  }
}
