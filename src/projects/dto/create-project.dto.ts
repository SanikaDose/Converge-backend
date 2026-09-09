import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { RelatedRepositoryDto } from "./related-repository.dto";

import { Type } from "class-transformer";
import { PROJECT_TYPES, PHASE_DISCIPLINES, FINANCIAL_YEARS } from "../../constants/enums";
import { Config } from "../../config/config";
import type { PhaseDiscipline, ProjectType, WeekDay } from "../../utils/types";

export class CreateProjectDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(PROJECT_TYPES)
  type: ProjectType;

  @IsIn(FINANCIAL_YEARS)
  @IsOptional()
  financialYear?: string;

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

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RelatedRepositoryDto)
  relatedRepositories?: RelatedRepositoryDto[];
}
