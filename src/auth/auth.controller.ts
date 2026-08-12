import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import type { AuthedUserInterface } from "./interface/auth.interface";

@Controller(apiControllerPath.auth.root)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 200, not Nest's default 201 for POST — login reads a session, it doesn't
  // create a resource.
  @Post(apiControllerPath.auth.login)
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthedUserInterface> {
    return this.authService.login(dto);
  }
}
