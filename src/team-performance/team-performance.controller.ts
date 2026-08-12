import { Controller, Get } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { TeamPerformanceService } from "./team-performance.service";
import type { TeamPerformanceRowInterface } from "./interface/team-performance.interface";

@Controller(apiControllerPath.teamPerformance.root)
export class TeamPerformanceController {
  constructor(private readonly teamPerformanceService: TeamPerformanceService) {}

  @Get(apiControllerPath.teamPerformance.getList)
  compute(): Promise<TeamPerformanceRowInterface[]> {
    return this.teamPerformanceService.compute();
  }
}
