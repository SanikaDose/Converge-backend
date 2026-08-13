import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Only `name` is self-editable. Role, app role, team, and employee code are
 * assigned by the organisation — accepting them here would let anyone
 * promote themselves to Admin with a PATCH.
 */
export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name: string;
}
