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

  /**
   * A publicly fetchable logo URL for the card header. Google Chat fetches it
   * server-side, so it must be absolute and token-free. Preference order:
   *   1. PUBLIC_BACKEND_URL — explicit override.
   *   2. RAILWAY_PUBLIC_DOMAIN — auto-set by Railway; needs no manual config.
   * Both point at this backend's own /branding/logo.png endpoint. If neither is
   * set we omit the image rather than link a URL that 404s (the broken-image
   * icon that showed before). FRONTEND_URL is intentionally not used — the logo
   * shouldn't depend on the frontend being deployed.
   */
  private logoUrl(): string | undefined {
    const base =
      process.env.PUBLIC_BACKEND_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
    if (!base) return undefined;
    return `${base.replace(/\/$/, "")}/api/v1/branding/logo.png`;
  }

  /** A coloured dot so priority reads at a glance in the card. */
  private priorityDot(priority: string): string {
    switch (priority) {
      case "Critical": return "🔴";
      case "High": return "🟠";
      case "Low": return "🟢";
      case "Medium":
      default: return "🟡";
    }
  }

  async sendTicketAssignedChat(params: TicketChatNotificationParams): Promise<void> {
    const url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!url) {
      this.logger.warn("Google Chat skipped: GOOGLE_CHAT_WEBHOOK_URL is not set");
      return;
    }

    const { ticketNumber, projectName, priority, issue, assignedTo, dueDate, ticketUrl } = params;
    const logoUrl = this.logoUrl();

    // A decoratedText row: small label on top, value below. No leading icons —
    // Chat's knownIcon glyphs read as clutter here.
    const field = (topLabel: string, text: string) => ({
      decoratedText: { topLabel, text, wrapText: true },
    });

    const widgets: Record<string, unknown>[] = [
      field("Issue", issue),
      field("Project", projectName),
      field("Priority", `${this.priorityDot(priority)} ${priority}`),
      field("Assigned to", assignedTo),
    ];
    if (dueDate) widgets.push(field("Due", dueDate));
    if (ticketUrl) {
      widgets.push({
        buttonList: {
          buttons: [{
            text: "Open ticket",
            onClick: { openLink: { url: ticketUrl } },
          }],
        },
      });
    }

    const payload = {
      // Fallback shown in notifications / clients that can't render the card.
      text: `New ticket assigned — ${ticketNumber}: ${issue}`,
      cardsV2: [{
        cardId: `ticket-${ticketNumber}`,
        card: {
          header: {
            title: "New ticket assigned",
            subtitle: `${ticketNumber} · ${projectName}`,
            ...(logoUrl ? { imageUrl: logoUrl, imageType: "CIRCLE", imageAltText: "Converge" } : {}),
          },
          sections: [{ widgets }],
        },
      }],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Chat webhook responded ${res.status}: ${body.slice(0, 200)}`);
    }
    this.logger.log(`Google Chat notification sent for ${ticketNumber}`);
  }
}
