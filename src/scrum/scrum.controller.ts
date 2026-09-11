import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { ScrumService } from "./scrum.service";
import { SaveScrumDto } from "./dto/save-scrum.dto";
import { todayISO } from "../utils/date-utils";
import type { ScrumEntryInterface } from "./interface/scrum.interface";

/**
 * Daily scrum board. Anyone signed in may READ any day (the whole team's board,
 * including history). Editing is scoped: an admin/lead may save any row, while a
 * regular user may save only their own — and only for the current day (see the
 * service). Identity comes from the verified token, never the body.
 */
@Controller(apiControllerPath.scrum.root)
export class ScrumController {
  constructor(private readonly service: ScrumService) {}

  @Get(apiControllerPath.scrum.getByDate)
  findByDate(@Query("date") date?: string): Promise<ScrumEntryInterface[]> {
    // Default to today when the caller omits the date.
    return this.service.findByDate(date || todayISO());
  }

  @Put(apiControllerPath.scrum.save)
  save(@CurrentUser() user: JwtPayload, @Body() dto: SaveScrumDto): Promise<ScrumEntryInterface[]> {
    return this.service.save(dto, user);
  }
}
