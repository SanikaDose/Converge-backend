import { IsNotEmpty, IsString } from "class-validator";

/**
 * Deleting an employee re-authenticates the admin: they must supply their own
 * password (verified against their hash), on top of typing the name in the UI.
 */
export class DeleteEmployeeDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
