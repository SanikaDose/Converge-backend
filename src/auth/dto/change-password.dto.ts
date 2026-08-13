import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  /**
   * Eight characters is the floor, not a policy — there's no complexity
   * rule here because length matters more, and a rule the user works around
   * ("Passw0rd!") buys nothing.
   */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
