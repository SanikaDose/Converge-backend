import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ORG_ROLES } from "../../constants/enums";
import type { EmployeeStatus, OrgRole } from "../../utils/types";

export class UpdateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsIn(ORG_ROLES)
  @IsOptional()
  role?: OrgRole;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsIn(["active", "inactive"])
  @IsOptional()
  status?: EmployeeStatus;

  @IsBoolean()
  @IsOptional()
  scrumEnabled?: boolean;
}
