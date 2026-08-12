import { Controller, Get } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { EmployeesService } from "./employees.service";
import type { OrgDirectoryInterface } from "./interface/employee.interface";

@Controller(apiControllerPath.employees.root)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get(apiControllerPath.employees.getList)
  findAll(): Promise<OrgDirectoryInterface> {
    return this.employeesService.findAll();
  }
}
