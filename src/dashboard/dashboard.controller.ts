import { Controller, Get } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { DashboardService } from "./dashboard.service";
import type { DashboardBaselineInterface } from "./interface/dashboard.interface";

@Controller(apiControllerPath.dashboard.root)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(apiControllerPath.dashboard.getSummary)
  getBaseline(): Promise<DashboardBaselineInterface> {
    return this.dashboardService.getBaseline();
  }
}
