import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PROJECT_TYPES } from "../../constants/enums";
import { Config } from "../../config/config";
import type { ProjectType, WeekDay } from "../../utils/types";

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(PROJECT_TYPES)
  type: ProjectType;

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
