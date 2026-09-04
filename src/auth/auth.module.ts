import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Employee } from "../entities/employee.entity";
import { Config } from "../config/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    NotificationsModule,
    // Global so the guard — which is registered app-wide below — can inject
    // JwtService without every other module importing JwtModule.
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || Config.DEFAULT_JWT_SECRET,
      // Cast: @nestjs/jwt types expiresIn as a literal duration union,
      // which an env-sourced string can never satisfy statically.
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || Config.DEFAULT_JWT_EXPIRES_IN) as `${number}h` },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // APP_GUARD makes this run on every route in the application, not just
    // this module's. Protection is therefore the default and @Public() is
    // the exception — a new endpoint is locked down unless it opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
