import { Injectable, Logger } from "@nestjs/common";

export interface TicketWhatsAppNotificationParams {
  to: string;
  ticketNumber: string;
  projectName: string;
  priority: string;
  issue: string;
  assignedTo: string;
  dueDate?: string | null;
  ticketUrl?: string;
}

/**
 * WhatsApp via Meta's official WhatsApp Cloud API — NOT Twilio.
 *
 * Business-initiated messages (like a ticket notification) MUST use a
 * pre-approved message *template*, so this sends a template message rather
 * than free text. One-time setup, all in Meta's dashboard:
 *   1. Meta Business + WhatsApp Business Account (WABA), and a phone number
 *      (Meta gives a free test number + up to 5 test recipients).
 *   2. Create & get approved a template (e.g. "ticket_assigned") whose body
 *      has 7 variables, in this order:
 *        {{1}} ticket  {{2}} project  {{3}} priority  {{4}} issue
 *        {{5}} assigned to  {{6}} due  {{7}} link
 *   3. Set the env vars below.
 *
 * Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME,
 *      WHATSAPP_TEMPLATE_LANG (default "en"), WHATSAPP_GRAPH_VERSION (default "v20.0").
 * Any missing => the send is skipped with a warning (never throws the app down).
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async sendTicketAssignedWhatsApp(params: TicketWhatsAppNotificationParams): Promise<void> {
    const { to, ticketNumber, projectName, priority, issue, assignedTo, dueDate, ticketUrl } = params;

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
    const version = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";

    if (!to) {
      this.logger.warn(`WhatsApp skipped: no phone number for ${assignedTo}`);
      return;
    }
    if (!token || !phoneNumberId || !templateName) {
      this.logger.warn("WhatsApp skipped: WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE_NAME not set");
      return;
    }

    // Meta expects the recipient in international format, digits only (no "+").
    const recipient = to.replace(/[^\d]/g, "");

    const body = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: templateName,
        language: { code: lang },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: ticketNumber },
              { type: "text", text: projectName },
              { type: "text", text: priority },
              { type: "text", text: issue },
              { type: "text", text: assignedTo },
              { type: "text", text: dueDate ?? "Not specified" },
              { type: "text", text: ticketUrl ?? "Not available" },
            ],
          },
        ],
      },
    };

    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      this.logger.error(`WhatsApp send to ${recipient} failed (${res.status}): ${errText.slice(0, 300)}`);
      throw new Error(`WhatsApp Cloud API ${res.status}`);
    }
    this.logger.log(`WhatsApp template message sent to ${recipient}`);
  }
}
