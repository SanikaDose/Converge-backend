import { IsOptional, IsString, IsNotEmpty, IsUUID } from "class-validator";

export class CreateProjectTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** When set, the new template is duplicated from this one (its phases + tasks
   * are copied). Omitted → a blank template with no phases. */
  @IsUUID()
  @IsOptional()
  sourceTemplateId?: string;
}
