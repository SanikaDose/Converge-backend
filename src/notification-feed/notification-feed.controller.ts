import { Controller, Get } from "@nestjs/common";
import { apiControllerPath } from "../constants/routeConstants";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "../auth/interface/auth.interface";
import { NotificationFeedService } from "./notification-feed.service";
import type { NotificationItem } from "./interface/notification-feed.interface";

@Controller(apiControllerPath.notifications.root)
export class NotificationFeedController {
  constructor(private readonly service: NotificationFeedService) {}

  @Get(apiControllerPath.notifications.getList)
  getList(@CurrentUser() user: JwtPayload): Promise<NotificationItem[]> {
    // Identity comes from the verified token, never a param — a caller can't
    // read someone else's feed.
    return this.service.getForUser(user.sub);
  }
}
