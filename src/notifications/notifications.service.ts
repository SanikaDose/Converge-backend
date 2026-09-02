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

  /**
   * The frontend origin, always with a protocol. FRONTEND_URL set without one
   * (e.g. "localhost:3000") is what made links resolve to https://localhost and
   * fail with ERR_SSL_PROTOCOL_ERROR — the local dev server is plain HTTP. So we
   * add http:// for localhost/127.0.0.1 and https:// for everything else, and
   * strip any trailing slash. Empty if FRONTEND_URL is unset.
   */
  private frontendOrigin(): string {
    let url = (process.env.FRONTEND_URL ?? "").trim().replace(/\/+$/, "");
    if (!url) return "";
    // Work out the host to decide the protocol, tolerating a missing scheme.
    const hostPart = url.replace(/^https?:\/\//i, "");
    const isLocal = /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(hostPart);
    // Local dev is always plain HTTP — an https://localhost link fails with
    // ERR_SSL_PROTOCOL_ERROR, so force http for local no matter how it's written.
    const scheme = isLocal ? "http" : "https";
    return `${scheme}://${hostPart}`;
  }

  async notifyTicketAssigned(ticket: Ticket, employees: Employee[]): Promise<void> {
    const origin = this.frontendOrigin();
    const base = {
      ticketNumber: `TKT-${ticket.seq}`,
      projectName: ticket.projectName,
      priority: ticket.priority,
      issue: ticket.title,
      dueDate: null as string | null,
      // Deep-link straight to this ticket — the Tickets page reads ?ticket=<id>
      // and opens/scrolls to it. Empty origin (FRONTEND_URL unset) drops the link.
      ticketUrl: origin ? `${origin}/tickets?ticket=${ticket.id}` : "",
    };

    // Personal channels — one message PER assignee (their own inbox / phone).
    for (const employee of employees) {
      // Email — to the assignee's address (works with the existing Gmail SMTP).
      if (employee.email) {
        try {
          await this.emailService.sendTicketAssignedEmail({ to: employee.email, assignedTo: employee.name, ...base });
        } catch (error) {
          this.logger.error(`Email notification failed for ${employee.email}`, error instanceof Error ? error.stack : String(error));
        }
      }

      // WhatsApp — Meta Cloud API (opt-in via env + an approved template).
      if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true" && employee.phoneNumber) {
        try {
          await this.whatsappService.sendTicketAssignedWhatsApp({ to: employee.phoneNumber, assignedTo: employee.name, ...base });
        } catch (error) {
          this.logger.error(`WhatsApp notification failed for ${employee.phoneNumber}`, error instanceof Error ? error.stack : String(error));
        }
      }
    }

    // Shared channel — ONE message per ticket to the team space, listing every
    // assignee. (Sending per-assignee here would post the same card N times.)
    if (process.env.GOOGLE_CHAT_NOTIFICATIONS_ENABLED === "true") {
      const assignedTo = employees.map(e => e.name).join(", ") || "Unassigned";
      try {
        await this.googleChatService.sendTicketAssignedChat({ ...base, assignedTo });
      } catch (error) {
        this.logger.error("Google Chat notification failed", error instanceof Error ? error.stack : String(error));
      }
    }
  }
}
