import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { PHASE_DISCIPLINES } from "../../constants/enums";
import type { PhaseDiscipline } from "../../utils/types";

export class AddPhaseTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  critical?: boolean;

  /** null = common phase (always generated); otherwise the owning discipline. */
  @IsIn(PHASE_DISCIPLINES)
  @IsOptional()
  discipline?: PhaseDiscipline | null;

  /** 1-based project week this phase starts in. */
  @IsInt()
  @Min(1)
  @Max(520)
  @IsOptional()
  weekStart?: number;

  /** How many whole project weeks the phase occupies. */
  @IsInt()
  @Min(1)
  @Max(520)
  @IsOptional()
  durationWeeks?: number;
}
