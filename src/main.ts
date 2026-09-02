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

  // CORS_ORIGIN may be a single origin or a comma-separated list (e.g. the
  // Vercel URL + localhost). Split it so multiple exact origins are allowed;
  // a lone value still works. Origins must have no trailing slash.
  const corsOrigins = config
    .get<string>("CORS_ORIGIN", Config.DEFAULT_CORS_ORIGIN)
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>("PORT", Config.DEFAULT_PORT);
  
  await app.listen(port, "0.0.0.0");

  console.log(`Converge backend listening on port ${port} at /${apiControllerPath.main.root}`);
}
bootstrap();
