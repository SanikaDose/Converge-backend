import { Injectable, Logger } from "@nestjs/common";

export interface TicketChatNotificationParams {
  ticketNumber: string;
  projectName: string;
  priority: string;
  issue: string;
  assignedTo: string;
  dueDate?: string | null;
  ticketUrl?: string;
  /** "assigned" (default) or "closed" — switches the card copy only. */
  variant?: "assigned" | "closed";
}

export interface MiscTaskChatNotificationParams {
  taskTitle: string;
  /** Project name, or "Other" when the task isn't tied to a project. */
  relatedTo: string;
  priority: string;
  assignedTo: string;
  /** Name of the admin/lead who created the task. */
  createdBy: string;
  /** Estimated hours to complete, when the creator set one. */
  estimatedHours?: number | null;
  dueDate?: string | null;
  taskUrl?: string;
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

  /** A decoratedText row: small label on top, value below (no leading icon). */
  private field(topLabel: string, text: string): Record<string, unknown> {
    return { decoratedText: { topLabel, text, wrapText: true } };
  }

  /** POST a cardsV2 payload to the space webhook. No-op when the URL is unset. */
  private async postCard(cardId: string, fallbackText: string, header: Record<string, unknown>, widgets: Record<string, unknown>[]): Promise<void> {
    const url = process.env.GOOGLE_CHAT_WEBHOOK_URL;
    if (!url) {
      this.logger.warn("Google Chat skipped: GOOGLE_CHAT_WEBHOOK_URL is not set");
      return;
    }
    const payload = {
      text: fallbackText, // shown in clients that can't render the card
      cardsV2: [{ cardId, card: { header, sections: [{ widgets }] } }],
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

  /** A card header with the brand logo when a public URL is available. */
  private header(title: string, subtitle: string): Record<string, unknown> {
    const logoUrl = this.logoUrl();
    return {
      title,
      subtitle,
      ...(logoUrl ? { imageUrl: logoUrl, imageType: "CIRCLE", imageAltText: "Converge" } : {}),
    };
  }

  async sendTicketChat(params: TicketChatNotificationParams): Promise<void> {
    const { ticketNumber, projectName, priority, issue, assignedTo, dueDate, ticketUrl, variant = "assigned" } = params;
    const closed = variant === "closed";
    const headerTitle = closed ? "Ticket closed" : "New ticket assigned";

    const widgets: Record<string, unknown>[] = [
      this.field("Issue", issue),
      this.field("Project", projectName),
      this.field("Priority", `${this.priorityDot(priority)} ${priority}`),
      this.field(closed ? "Was assigned to" : "Assigned to", assignedTo),
    ];
    if (dueDate) widgets.push(this.field("Due", dueDate));
    if (ticketUrl) widgets.push(this.button(closed ? "View ticket" : "Open ticket", ticketUrl));

    await this.postCard(
      `ticket-${ticketNumber}`,
      `${headerTitle} — ${ticketNumber}: ${issue}`,
      this.header(headerTitle, `${ticketNumber} · ${projectName}`),
      widgets,
    );
    this.logger.log(`Google Chat notification sent for ${ticketNumber}`);
  }

  /** A new misc task was created — one card to the team space (mirrors tickets). */
  async sendMiscTaskChat(params: MiscTaskChatNotificationParams): Promise<void> {
    const { taskTitle, relatedTo, priority, assignedTo, createdBy, estimatedHours, dueDate, taskUrl } = params;

    const widgets: Record<string, unknown>[] = [
      this.field("Task", taskTitle),
      this.field("Related to", relatedTo),
      this.field("Priority", `${this.priorityDot(priority)} ${priority}`),
      this.field("Assigned to", assignedTo),
      this.field("Created by", createdBy),
    ];
    if (estimatedHours != null) widgets.push(this.field("Estimated hours", `${estimatedHours} hr${estimatedHours === 1 ? "" : "s"}`));
    if (dueDate) widgets.push(this.field("Due", dueDate));
    if (taskUrl) widgets.push(this.button("Open task", taskUrl));

    await this.postCard(
      `misc-task-${Date.now()}`,
      `New task assigned — ${taskTitle}`,
      this.header("New task assigned", `Misc task · ${relatedTo}`),
      widgets,
    );
    this.logger.log(`Google Chat notification sent for misc task "${taskTitle}"`);
  }

  /** A single open-link button widget. */
  private button(text: string, url: string): Record<string, unknown> {
    return { buttonList: { buttons: [{ text, onClick: { openLink: { url } } }] } };
  }
}
