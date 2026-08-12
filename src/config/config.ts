/**
 * Static application defaults, following Scout's `config/config.ts`
 * convention. Values that vary per environment stay in `.env` and are read
 * through Nest's ConfigService — these are the fallbacks applied when a
 * variable isn't set.
 */
export class Config {
  /** Port the HTTP server binds to when PORT is unset. */
  public static readonly DEFAULT_PORT = 4000;

  /** Origin allowed by CORS when CORS_ORIGIN is unset (the Next.js dev server). */
  public static readonly DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

  /** Seed demo data on boot unless SEED_ON_BOOT says otherwise. */
  public static readonly DEFAULT_SEED_ON_BOOT = 'true';

  /** bcrypt cost factor for seeded credentials. */
  public static readonly BCRYPT_SALT_ROUNDS = 10;

  /** A project may nominate at most this many non-working days per week. */
  public static readonly MAX_WEEK_OFF_DAYS = 2;
}
