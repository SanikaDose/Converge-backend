import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { ProjectType, WeekDay } from "../../common/types";

const PROJECT_TYPES: ProjectType[] = ["Product", "Solution"];

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
  @ArrayMaxSize(2)
  @IsOptional()
  weekOff?: WeekDay[];
}
