import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from "class-validator";
import { MISC_TASK_STATUSES, PRIORITIES } from "../../constants/enums";
import type { MiscTaskStatus, Priority } from "../../utils/types";

export class UpdateMiscTaskDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  projectId?: string | null;

  @IsString()
  @IsOptional()
  assignedTo?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignees?: string[];

  @IsIn(PRIORITIES)
  @IsOptional()
  priority?: Priority;

  @IsIn(MISC_TASK_STATUSES)
  @IsOptional()
  status?: MiscTaskStatus;

  @IsString()
  @IsOptional()
  dueDate?: string | null;

  @IsString()
  @IsOptional()
  startDate?: string | null;

  @IsString()
  @IsOptional()
  endDate?: string | null;

  /** Optional estimated hours to complete. null clears it; a number must be >= 0. */
  @IsOptional()
  @ValidateIf((o) => o.estimatedHours !== null)
  @IsNumber()
  @Min(0)
  estimatedHours?: number | null;

  @IsArray()
  @IsOptional()
  checklist?: unknown[];
}
