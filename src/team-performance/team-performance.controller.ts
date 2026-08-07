import { Controller, Get } from "@nestjs/common";
import { TeamPerformanceService } from "./team-performance.service";

@Controller("team-performance")
export class TeamPerformanceController {
  constructor(private readonly teamPerformanceService: TeamPerformanceService) {}

  @Get()
  compute() {
    return this.teamPerformanceService.compute();
  }
}
