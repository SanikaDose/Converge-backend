import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsIn, IsISO8601, IsOptional, IsString, ValidateNested } from "class-validator";
import { WORK_MODES } from "../../constants/enums";
import type { WorkMode } from "../../utils/types";

class ScrumEntryInput {
  @IsString()
  employeeId: string;

  @IsString()
  @IsOptional()
  workPerformed?: string;

  @IsIn(WORK_MODES)
  workMode: WorkMode;
}

/**
 * Save the whole day at once — the "Save Updates" button sends every touched
 * row. Upserted per (employeeId, date) so re-saving a day edits in place.
 */
export class SaveScrumDto {
  /** The scrum day, YYYY-MM-DD. */
  @IsISO8601()
  date: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ScrumEntryInput)
  entries: ScrumEntryInput[];
}
