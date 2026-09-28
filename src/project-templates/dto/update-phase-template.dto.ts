import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
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
}
