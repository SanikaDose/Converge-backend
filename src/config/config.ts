export class Config {
  public static readonly DEFAULT_PORT = 4000;

  public static readonly DEFAULT_CORS_ORIGIN = 'http://localhost:3000';

  public static readonly DEFAULT_SEED_ON_BOOT = 'true';

  public static readonly DEFAULT_JWT_SECRET = 'converge-dev-secret-change-me';

  public static readonly DEFAULT_JWT_EXPIRES_IN = '12h';

  public static readonly BCRYPT_SALT_ROUNDS = 10;

  public static readonly MAX_WEEK_OFF_DAYS = 2;
}
