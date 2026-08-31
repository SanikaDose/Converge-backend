import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { EmailService } from "./email/email.service";
import { WhatsAppService } from "./whatsapp/whatsapp.service";
import { GoogleChatService } from "./google-chat/google-chat.service";

@Module({
  providers: [
    NotificationsService,
    EmailService,
    WhatsAppService,
    GoogleChatService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
