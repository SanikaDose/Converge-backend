import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScrumEntry } from "../entities/scrum-entry.entity";
import { ScrumController } from "./scrum.controller";
import { ScrumService } from "./scrum.service";

@Module({
  imports: [TypeOrmModule.forFeature([ScrumEntry])],
  controllers: [ScrumController],
  providers: [ScrumService],
})
export class ScrumModule {}
