import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { PRIORITIES } from "../../constants/enums";
import type { Priority } from "../../utils/types";


export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  phase?: string | null;

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
}
