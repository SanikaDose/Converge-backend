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

  // Every route is served under /api/v1, matching the Scout gateway. The
  // prefix lives here rather than on each @Controller so versioning is one
  // edit, and controller decorators stay purely about their own resource.
  app.setGlobalPrefix(apiControllerPath.main.root);

  app.enableCors({ origin: config.get<string>("CORS_ORIGIN", Config.DEFAULT_CORS_ORIGIN) });
  // whitelist strips properties with no matching DTO decorator, so a client
  // can't smuggle extra columns into an entity via a PATCH body.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = config.get<number>("PORT", Config.DEFAULT_PORT);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Converge backend listening on http://localhost:${port}/${apiControllerPath.main.root}`);
}
bootstrap();
