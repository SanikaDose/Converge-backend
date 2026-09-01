import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { PRIORITIES, TICKET_STATUSES } from "../../constants/enums";
import type { Priority, TicketStatus } from "../../utils/types";


export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsIn(TICKET_STATUSES)
  @IsOptional()
  status?: TicketStatus;

  @IsOptional()
  actionPoints?: unknown[];
}
