import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MISC_TASK_STATUSES, PRIORITIES } from "../../constants/enums";
import type { MiscTaskStatus, Priority } from "../../utils/types";

export class CreateMiscTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** null = "Other (not related to any project)". */
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

  @IsArray()
  @IsOptional()
  checklist?: unknown[];
}
