import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
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
}
