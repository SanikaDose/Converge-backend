import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route as reachable without a token. The JWT guard is registered
 * globally (see AuthModule's APP_GUARD), so protection is the default and
 * every exception has to be declared here — the safer way round: forgetting
 * this decorator locks a route down rather than leaving it open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
