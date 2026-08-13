import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { authMessages } from "../../constants/messages";
import type { JwtPayload } from "../interface/auth.interface";

/** The verified token payload, attached to the request for controllers to read. */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies the `Authorization: Bearer <token>` header on every request,
 * except routes marked @Public().
 *
 * Registered globally rather than per-controller so a newly added endpoint
 * is protected by default. This is what closes the gap where every data
 * endpoint was reachable without signing in.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) throw new UnauthorizedException(authMessages.missingToken);

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      // Covers a tampered signature and an expired token alike — the client
      // response is the same either way, and the difference isn't the
      // caller's business.
      throw new UnauthorizedException(authMessages.invalidToken);
    }
  }
}

function extractBearerToken(request: Request): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  return scheme === "Bearer" ? token : undefined;
}
