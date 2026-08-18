import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @Max(3650)
  @IsOptional()
  dayOffset?: number;

  @IsInt()
  @Min(1)
  @Max(3650)
  @IsOptional()
  duration?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
