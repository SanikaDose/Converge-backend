import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class AddTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Working days from project start. */
  @IsInt()
  @Min(0)
  @Max(3650)
  dayOffset: number;

  @IsInt()
  @Min(1)
  @Max(3650)
  duration: number;
}
