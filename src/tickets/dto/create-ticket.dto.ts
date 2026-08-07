import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import type { Priority } from "../../common/types";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];

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

  @IsIn(PRIORITIES)
  @IsOptional()
  priority?: Priority;
}
