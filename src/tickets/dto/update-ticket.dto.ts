import { IsIn, IsOptional, IsString } from "class-validator";
import type { Priority, TicketStatus } from "../../common/types";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"];
const STATUSES: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed"];

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

  @IsIn(PRIORITIES)
  @IsOptional()
  priority?: Priority;

  @IsIn(STATUSES)
  @IsOptional()
  status?: TicketStatus;
}
