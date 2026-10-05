import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class AddTaskTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Day from the phase's week start (working days). Optional — defaults to 0
   * (the phase's first day) when a caller omits it. */
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

  /** Default critical points for this task (plain text lines). */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criticalPoints?: string[];
}
