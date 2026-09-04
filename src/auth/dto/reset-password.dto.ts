import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
  /** Short-lived token issued by verify-otp — proves the OTP was verified. */
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
