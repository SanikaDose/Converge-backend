import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { EmailService } from "./email/email.service";
import { WhatsAppService } from "./whatsapp/whatsapp.service";
import { GoogleChatService } from "./google-chat/google-chat.service";
import { BrandingController } from "./branding.controller";

@Module({
  controllers: [BrandingController],
  providers: [
    NotificationsService,
    EmailService,
    WhatsAppService,
    GoogleChatService,
  ],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
