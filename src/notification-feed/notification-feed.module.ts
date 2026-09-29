import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Task } from "../entities/task.entity";
import { Project } from "../entities/project.entity";
import { Ticket } from "../entities/ticket.entity";
import { Notification } from "../entities/notification.entity";
import { NotificationFeedController } from "./notification-feed.controller";
import { NotificationFeedService } from "./notification-feed.service";

@Module({
  imports: [TypeOrmModule.forFeature([Task, Project, Ticket, Notification])],
  controllers: [NotificationFeedController],
  providers: [NotificationFeedService],
  // Exported so other modules (misc tasks) can log notification events.
  exports: [NotificationFeedService],
})
export class NotificationFeedModule {}
