export class Config {
  public static readonly DEFAULT_PORT = 4000;

  public static readonly DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

  public static readonly DEFAULT_SEED_ON_BOOT = 'true';

  public static readonly DEFAULT_JWT_SECRET = 'converge-dev-secret-change-me';

  public static readonly DEFAULT_JWT_EXPIRES_IN = '12h';

  // bcrypt work factor. Each +1 doubles hashing time; bcrypt is deliberately
  // slow. On Render's throttled free-tier CPU a cost-10 compare costs ~700ms,
  // which dominates login latency. 8 brings that to ~175ms while staying far
  // above fast hashes. Existing cost-10 hashes keep verifying; login() re-hashes
  // them to this factor on the user's next successful sign-in (see AuthService).
  public static readonly BCRYPT_SALT_ROUNDS = 8;

  public static readonly MAX_WEEK_OFF_DAYS = 2;
}
