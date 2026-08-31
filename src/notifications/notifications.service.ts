import { Injectable, Logger } from "@nestjs/common";

import { EmailService } from "./email/email.service";
import { WhatsAppService } from "./whatsapp/whatsapp.service";
import { GoogleChatService } from "./google-chat/google-chat.service";

import { Ticket } from "../entities/ticket.entity";
import { Employee } from "../entities/employee.entity";

/**
 * Fans a "ticket assigned" event out to every channel. Each send is isolated
 * in its own try/catch so one channel failing (or being unconfigured) never
 * blocks the others or fails the ticket creation. Channels self-skip when
 * their env isn't set, so nothing needs Twilio or any paid SMS provider.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsAppService,
    private readonly googleChatService: GoogleChatService,
  ) {}

  async notifyTicketAssigned(ticket: Ticket, employee: Employee): Promise<void> {
    const data = {
      ticketNumber: `TKT-${ticket.seq}`,
      projectName: ticket.projectName,
      priority: ticket.priority,
      issue: ticket.title,
      assignedTo: employee.name,
      dueDate: null as string | null,
      ticketUrl: `${process.env.FRONTEND_URL ?? ""}/tickets`,
    };

    // Email — to the assignee's address (works with the existing Gmail SMTP).
    if (employee.email) {
      try {
        await this.emailService.sendTicketAssignedEmail({ to: employee.email, ...data });
      } catch (error) {
        this.logger.error(`Email notification failed for ${employee.email}`, error instanceof Error ? error.stack : String(error));
      }
    }

    // WhatsApp — Meta Cloud API (opt-in via env + an approved template).
    if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true" && employee.phoneNumber) {
      try {
        await this.whatsappService.sendTicketAssignedWhatsApp({ to: employee.phoneNumber, ...data });
      } catch (error) {
        this.logger.error(`WhatsApp notification failed for ${employee.phoneNumber}`, error instanceof Error ? error.stack : String(error));
      }
    }

    // Google Chat — free incoming webhook to a team space.
    if (process.env.GOOGLE_CHAT_NOTIFICATIONS_ENABLED === "true") {
      try {
        await this.googleChatService.sendTicketAssignedChat(data);
      } catch (error) {
        this.logger.error("Google Chat notification failed", error instanceof Error ? error.stack : String(error));
      }
    }
  }
}
