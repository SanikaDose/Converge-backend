import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator";

/**
 * Liveness probe. Deliberately touches nothing (no DB, no auth) so it returns
 * in a few milliseconds — its job is to be a cheap target for an external
 * keep-alive pinger that stops Render's free tier from sleeping (a cold start
 * there costs 30–60s on the next real request, e.g. a login). Served at
 * GET /api/v1/health because of the global prefix.
 */
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  check(): { status: string; time: string } {
    return { status: "ok", time: new Date().toISOString() };
  }
}
