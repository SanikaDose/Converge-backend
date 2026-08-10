import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService, type AuthedUser } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthedUser> {
    return this.authService.login(dto);
  }
}
