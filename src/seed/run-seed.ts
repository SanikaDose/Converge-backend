/**
 * Standalone re-seed script: `npm run seed`. Unlike the automatic
 * on-boot seed (SeedService.onModuleInit, gated on "projects table is
 * empty"), this always runs — use it to force-reseed demo data after
 * wiping the tables.
 */
import "reflect-metadata";
// Prevent SeedService.onModuleInit's own auto-seed-if-empty from firing
// during app-context creation below — this script's explicit run() call
// is the only seed trigger we want, otherwise an empty table gets seeded
// twice (once by onModuleInit, once by us).
process.env.SEED_ON_BOOT = "false";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { SeedService } from "./seed.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);
  await seedService.run();
  await app.close();
}
main();
