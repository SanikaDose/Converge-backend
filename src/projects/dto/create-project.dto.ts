import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PROJECT_TYPES, PHASE_DISCIPLINES } from "../../constants/enums";
import { Config } from "../../config/config";
import type { PhaseDiscipline, ProjectType, WeekDay } from "../../utils/types";

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(PROJECT_TYPES)
  type: ProjectType;

  /** Which disciplines' phases to generate. Empty/omitted means every phase. */
  @IsArray()
  @IsIn(PHASE_DISCIPLINES, { each: true })
  @IsOptional()
  disciplines?: PhaseDiscipline[];

  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsString()
  @IsOptional()
  location?: string | null;

  @IsString()
  @IsOptional()
  owner?: string | null;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsArray()
  @ArrayMaxSize(Config.MAX_WEEK_OFF_DAYS)
  @IsOptional()
  weekOff?: WeekDay[];
}
