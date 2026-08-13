import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../guards/jwt-auth.guard";
import type { JwtPayload } from "../interface/auth.interface";

/**
 * Reads the token payload the guard attached to the request.
 *
 * Endpoints that act on "the signed-in user" take their identity from here
 * rather than from a body field or route param — a client can't ask to
 * change someone else's password by passing a different id.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user!;
  },
);
