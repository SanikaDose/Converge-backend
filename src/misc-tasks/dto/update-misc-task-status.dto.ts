import { IsIn, IsNotEmpty } from "class-validator";
import { MISC_TASK_STATUSES } from "../../constants/enums";
import type { MiscTaskStatus } from "../../utils/types";

/**
 * Status-only update — the narrow path an assigned employee (not just an
 * admin/lead) may use to move a task they're on. Whitelisted to `status`
 * alone so it can't be used to edit anything else.
 */
export class UpdateMiscTaskStatusDto {
  @IsIn(MISC_TASK_STATUSES)
  @IsNotEmpty()
  status: MiscTaskStatus;
}
