import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { Config } from "./config/config";
import { apiControllerPath } from "./constants/routeConstants";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix(apiControllerPath.main.root);

  // CORS_ORIGIN may be a single origin, a comma-separated list (e.g. the
  // Vercel URL + localhost), or "*" to reflect any origin. Trailing slashes
  // are tolerated on both the configured values and the incoming Origin, since
  // an exact string mismatch is the usual cause of "No Access-Control-Allow-
  // Origin header" preflight failures. Auth is by bearer token (not cookies),
  // so reflecting an allowed origin carries no credential risk.
  const allowed = config
    .get<string>("CORS_ORIGIN", Config.DEFAULT_CORS_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const allowAll = allowed.includes("*");
  app.enableCors({
    origin: allowAll
      ? true
      : (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
          // No Origin header = non-browser client (curl, health check) — allow.
          if (!origin) return cb(null, true);
          cb(null, allowed.includes(origin.replace(/\/+$/, "")));
        },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>("PORT", Config.DEFAULT_PORT);
  
  await app.listen(port, "0.0.0.0");

  console.log(`Converge backend listening on port ${port} at /${apiControllerPath.main.root}`);
}
bootstrap();
