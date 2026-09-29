import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MiscTask } from "../entities/misc-task.entity";
import { Project } from "../entities/project.entity";
import { Employee } from "../entities/employee.entity";
import { MiscTasksController } from "./misc-tasks.controller";
import { MiscTasksService } from "./misc-tasks.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationFeedModule } from "../notification-feed/notification-feed.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([MiscTask, Project, Employee]),
    // EmailService (email notifications) + NotificationFeedService (bell events).
    NotificationsModule,
    NotificationFeedModule,
  ],
  controllers: [MiscTasksController],
  providers: [MiscTasksService],
})
export class MiscTasksModule {}
