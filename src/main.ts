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
  // Bind every interface, not just loopback. Hosting platforms (Render,
  // Railway) route requests into the container from outside it, so a
  // loopback-only bind fails their health check and the service never goes
  // live. `PORT` is injected by the platform — don't set it yourself.
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Converge backend listening on port ${port} at /${apiControllerPath.main.root}`);
}
bootstrap();
