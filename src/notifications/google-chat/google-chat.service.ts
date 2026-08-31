import { Injectable, Logger } from "@nestjs/common";

export interface TicketChatNotificationParams {
  ticketNumber: string;
  projectName: string;
  priority: string;
  issue: string;
  assignedTo: string;
  dueDate?: string | null;
  ticketUrl?: string;
}

/**
 * Google Chat notification via an Incoming Webhook — free, no SDK, no OAuth.
 * Set GOOGLE_CHAT_WEBHOOK_URL to a Space's webhook (Space → Apps & integrations
 * → Manage webhooks → Add). We just POST JSON to it. Unset = silently skipped.
 */
@Injectable()
export class GoogleChatService {
  private readonly logger = new Logger(GoogleChatService.name);

  async sendTicketAssignedChat(params: TicketChatNotificationParams): Promise<void> {
    const url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!url) {
      this.logger.warn("Google Chat skipped: GOOGLE_CHAT_WEBHOOK_URL is not set");
      return;
    }

    const { ticketNumber, projectName, priority, issue, assignedTo, dueDate, ticketUrl } = params;
    const text = [
      "🔔 *New Ticket Assigned*",
      `*Ticket:* ${ticketNumber}`,
      `*Project:* ${projectName}`,
      `*Priority:* ${priority}`,
      `*Issue:* ${issue}`,
      `*Assigned to:* ${assignedTo}`,
      `*Due:* ${dueDate ?? "Not specified"}`,
      ticketUrl ? `\n<${ticketUrl}|Open Ticket>` : "",
    ].filter(Boolean).join("\n");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Chat webhook responded ${res.status}: ${body.slice(0, 200)}`);
    }
    this.logger.log(`Google Chat notification sent for ${ticketNumber}`);
  }
}
