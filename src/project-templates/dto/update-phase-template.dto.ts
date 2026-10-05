import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { PHASE_DISCIPLINES } from "../../constants/enums";
import type { PhaseDiscipline } from "../../utils/types";

export class UpdatePhaseTemplateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  /** Pass null to make it a common phase, or a discipline to scope it. */
  @IsIn(PHASE_DISCIPLINES)
  @IsOptional()
  discipline?: PhaseDiscipline | null;

  @IsInt()
  @Min(1)
  @Max(520)
  @IsOptional()
  weekStart?: number;

  @IsInt()
  @Min(1)
  @Max(520)
  @IsOptional()
  durationWeeks?: number;
}
