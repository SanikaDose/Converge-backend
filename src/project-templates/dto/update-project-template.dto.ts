import { IsOptional, IsString, IsNotEmpty } from "class-validator";

export class UpdateProjectTemplateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
