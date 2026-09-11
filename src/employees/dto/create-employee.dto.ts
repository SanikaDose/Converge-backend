import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ORG_ROLES } from "../../constants/enums";
import type { OrgRole } from "../../utils/types";

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsIn(ORG_ROLES)
  @IsOptional()
  role?: OrgRole;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsBoolean()
  @IsOptional()
  scrumEnabled?: boolean;
}
