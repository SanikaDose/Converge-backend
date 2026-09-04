import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import type { AuthedUserInterface, JwtPayload, LoginResponseInterface } from "./interface/auth.interface";

@Controller(apiControllerPath.auth.root)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // The only unauthenticated route in the app — you can't present a token
  // before you have one.
  @Public()
  @Post(apiControllerPath.auth.login)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResponseInterface> {
    return this.authService.login(dto);
  }

  /** Who the bearer token belongs to, read fresh from the database. */
  @Get(apiControllerPath.auth.me)
  me(@CurrentUser() user: JwtPayload): Promise<AuthedUserInterface> {
    return this.authService.getProfile(user.sub);
  }

  // Identity comes from the token, never the body — so this can only ever
  // edit the caller's own profile.
  @Patch(apiControllerPath.auth.updateProfile)
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto): Promise<AuthedUserInterface> {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Post(apiControllerPath.auth.changePassword)
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto): Promise<{ success: true }> {
    return this.authService.changePassword(user.sub, dto);
  }

  // Forgot-password flow — all public (you're locked out, so you have no token).
  @Public()
  @Post(apiControllerPath.auth.forgotPassword)
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: true }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post(apiControllerPath.auth.verifyOtp)
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post(apiControllerPath.auth.resetPassword)
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: true }> {
    return this.authService.resetPassword(dto);
  }
}
