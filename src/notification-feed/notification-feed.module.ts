import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Task } from "../entities/task.entity";
import { Project } from "../entities/project.entity";
import { Ticket } from "../entities/ticket.entity";
import { NotificationFeedController } from "./notification-feed.controller";
import { NotificationFeedService } from "./notification-feed.service";

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, Ticket])],
  controllers: [NotificationFeedController],
  providers: [NotificationFeedService],
})
export class NotificationFeedModule {}
