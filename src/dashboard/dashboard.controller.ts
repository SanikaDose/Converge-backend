import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard-summary")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getBaseline() {
    return this.dashboardService.getBaseline();
  }
}
