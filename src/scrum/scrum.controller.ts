import { Body, Controller, Get, Put, Query } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { ScrumService } from "./scrum.service";
import { SaveScrumDto } from "./dto/save-scrum.dto";
import { todayISO } from "../utils/date-utils";
import type { ScrumEntryInterface } from "./interface/scrum.interface";

/**
 * Daily scrum board. The standup is collaborative, so any signed-in user may
 * read a day and save updates (no admin/lead gate) — matching the reference,
 * where the whole team fills in the same grid.
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
  save(@Body() dto: SaveScrumDto): Promise<ScrumEntryInterface[]> {
    return this.service.save(dto);
  }
}
