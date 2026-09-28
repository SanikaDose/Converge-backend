import { Injectable, Logger } from "@nestjs/common";

/**
 * Transactional email via the Gmail API over HTTPS.
 *
 * We send through Google (as the account itself) rather than opening an SMTP
 * socket: Render blocks outbound SMTP (verified — even over IPv4 the connection
 * times out), so nodemailer→Gmail can't work there. The Gmail REST API is plain
 * HTTPS (port 443, never blocked), and because Google actually sends the mail
 * it's DKIM-signed by gmail.com — so it reaches the inbox with no DNS setup.
 *
 * Config (env):
 *   GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET — OAuth client (Google Cloud console).
 *   GMAIL_REFRESH_TOKEN                   — long-lived token for the sender account,
 *                                           authorized for the gmail.send scope.
 *   GMAIL_SENDER                          — sending address (falls back to SMTP_USER).
 *   RENDER_EXTERNAL_URL                   — set by Render; used to build the logo URL.
 */
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly senderName = "Converge Projects";
    private readonly senderEmail = process.env.GMAIL_SENDER || process.env.SMTP_USER || "";

    /** Cached OAuth access token, refreshed shortly before it expires. */
    private accessToken: string | null = null;
    private accessTokenExpiry = 0;

    onModuleInit() {
        const configured =
            process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN;
        if (!configured) {
            this.logger.warn(
                "Gmail API not configured (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN) — outbound email is disabled.",
            );
            return;
        }
        if (!this.senderEmail) {
            this.logger.warn("No sender address (GMAIL_SENDER / SMTP_USER) — outbound email is disabled.");
            return;
        }
        this.logger.log(`Email transport ready (Gmail API), sender ${this.senderEmail}`);
    }

    /**
     * Absolute URL to the public logo the backend serves. The Gmail API path
     * references the logo by URL (rather than a CID inline attachment) to keep the
     * MIME simple. Empty when no public base URL is known (e.g. local dev) — the
     * templates then omit the image rather than render a broken one.
     */
    private logoUrl(): string {
        const base = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
        return base ? `${base}/api/v1/branding/logo.png` : "";
    }

    /** `<img>` for the brand logo, or "" when no public URL is available. */
    private logoImg(): string {
        const url = this.logoUrl();
        return url
            ? `<img src="${url}" width="28" height="28" alt="Converge" style="display:block;width:28px;height:28px;" />`
            : "";
    }

    /** A valid OAuth access token, refreshed via the refresh token when needed. */
    private async getAccessToken(): Promise<string> {
        const now = Date.now();
        if (this.accessToken && now < this.accessTokenExpiry - 60_000) return this.accessToken;

        const clientId = process.env.GMAIL_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET;
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error("Gmail OAuth is not configured (client id / secret / refresh token)");
        }

        const res = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }).toString(),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Google token endpoint responded ${res.status}: ${body}`);
        }
        const json = (await res.json()) as { access_token: string; expires_in: number };
        this.accessToken = json.access_token;
        this.accessTokenExpiry = now + json.expires_in * 1000;
        return this.accessToken;
    }

    /** RFC 2047 encode a header value so a non-ASCII subject survives transit. */
    private encodeHeader(value: string): string {
        return /^[\x00-\x7F]*$/.test(value)
            ? value
            : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
    }

    /** Base64 body content, wrapped at 76 chars as MIME expects. */
    private base64Body(text: string): string {
        return Buffer.from(text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
    }

    /** Build a MIME message and send it through the Gmail API. Throws on failure. */
    private async send(params: { to: string; subject: string; html: string; text: string }): Promise<void> {
        if (!this.senderEmail) throw new Error("No sender address (GMAIL_SENDER / SMTP_USER) is configured");
        const accessToken = await this.getAccessToken();

        const boundary = `converge_${Math.random().toString(36).slice(2)}`;
        const mime = [
            `From: ${this.senderName} <${this.senderEmail}>`,
            `To: ${params.to}`,
            `Subject: ${this.encodeHeader(params.subject)}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            this.base64Body(params.text),
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            this.base64Body(params.html),
            `--${boundary}--`,
            ``,
        ].join("\r\n");

        // Gmail wants the raw RFC 2822 message base64url-encoded.
        const raw = Buffer.from(mime, "utf8")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const res = await fetch(GMAIL_SEND_URL, {
            method: "POST",
            headers: {
                authorization: `Bearer ${accessToken}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ raw }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Gmail API responded ${res.status} ${res.statusText}: ${body}`);
        }
    }

    /** Escape user-supplied text before it lands in HTML — issue titles and
     * project/employee names are free text and must not break the layout. */
    private esc(value: string): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    /** Badge colour per priority, matching the app's status palette. */
    private priorityColor(priority: string): { fg: string; bg: string } {
        switch (priority) {
            case "Critical": return { fg: "#b91c1c", bg: "#fee2e2" };
            case "High": return { fg: "#c2410c", bg: "#ffedd5" };
            case "Low": return { fg: "#15803d", bg: "#dcfce7" };
            case "Medium":
            default: return { fg: "#b45309", bg: "#fef3c7" };
        }
    }

    async sendTicketEmail(params: {
        to: string;
        ticketNumber: string;
        projectName: string;
        priority: string;
        issue: string;
        assignedTo: string;
        dueDate?: string | null;
        ticketUrl?: string;
        /** "assigned" (default) or "closed" — switches the copy only. */
        variant?: "assigned" | "closed";
    }) {
        const {
            to,
            ticketNumber,
            projectName,
            priority,
            issue,
            assignedTo,
            dueDate,
            ticketUrl,
            variant = "assigned",
        } = params;

        const closed = variant === "closed";
        const subject = closed
            ? `Ticket closed — ${ticketNumber}: ${issue}`
            : `New ticket assigned — ${ticketNumber}: ${issue}`;
        const eyebrow = closed ? "Ticket closed" : "New ticket assigned";
        const greeting = closed
            ? `Hi ${this.esc(assignedTo)}, a ticket you're assigned to has been closed.`
            : `Hi ${this.esc(assignedTo)}, a ticket has been assigned to you.`;
        const ctaLabel = closed ? "View ticket &rarr;" : "Open ticket &rarr;";
        const footerNote = closed
            ? "You're receiving this because you were assigned this now-closed ticket in Converge Projects."
            : "You're receiving this because you were assigned this ticket in Converge Projects.";
        const textLead = closed ? "A ticket you're assigned to has been closed" : "New ticket assigned to you";
        const eyebrowColor = closed ? "#16a34a" : "#2563eb";

        const prio = this.priorityColor(priority);

        // One details row — table-based so it renders consistently in Gmail/Outlook.
        const row = (label: string, valueHtml: string) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#64748b;font-size:13px;width:120px;vertical-align:top;">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${valueHtml}</td>
          </tr>`;

        const priorityBadge = `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${prio.bg};color:${prio.fg};font-size:12px;font-weight:700;">${this.esc(priority)}</span>`;

        try {
            await this.send({
                to,
                subject,

                text: [
                    textLead,
                    ``,
                    `Ticket:      ${ticketNumber}`,
                    `Issue:       ${issue}`,
                    `Project:     ${projectName}`,
                    `Priority:    ${priority}`,
                    `Assigned to: ${assignedTo}`,
                    ...(dueDate ? [`Due:         ${dueDate}`] : []),
                    ``,
                    ...(ticketUrl ? [`Open the ticket: ${ticketUrl}`] : []),
                    ``,
                    `— Converge Projects`,
                ].join("\n"),

                html: `
      <div style="background:#f1f5f9;padding:24px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <!-- Brand header -->
          <tr>
            <td style="background:#ffffff;padding:18px 24px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          ${this.logoImg()}
                        </td>
                        <td style="vertical-align:middle;color:#0f172a;font-size:17px;font-weight:700;letter-spacing:.2px;">Converge Projects</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-size:0;line-height:0;">
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#3b82f6;"></span>
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#8b5cf6;margin-left:3px;"></span>
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#f97316;margin-left:3px;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${eyebrowColor};">${eyebrow}</div>
              <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${this.esc(issue)}</div>
              <div style="margin-top:4px;font-size:13px;color:#64748b;">${greeting}</div>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:8px 24px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("Ticket", this.esc(ticketNumber))}
                ${row("Project", this.esc(projectName))}
                ${row("Priority", priorityBadge)}
                ${dueDate ? row("Due", this.esc(dueDate)) : ""}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          ${ticketUrl ? `
          <tr>
            <td style="padding:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${ticketUrl}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #eef1f5;color:#94a3b8;font-size:12px;line-height:1.5;">
              ${footerNote}
            </td>
          </tr>
        </table>
      </div>`,
            });

            this.logger.log(`Ticket notification sent to ${to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send ticket email to ${to}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    /**
     * Misc-task notification — assigned to you, or one you're on completed.
     * Mirrors the ticket email's look (brand header, details table, CTA) with
     * task-flavoured copy. Green eyebrow for "completed", blue for "assigned".
     */
    async sendMiscTaskEmail(params: {
        to: string;
        taskTitle: string;
        projectName?: string | null;
        priority: string;
        assignedTo: string;
        dueDate?: string | null;
        taskUrl?: string;
        variant?: "assigned" | "completed";
    }) {
        const {
            to,
            taskTitle,
            projectName,
            priority,
            assignedTo,
            dueDate,
            taskUrl,
            variant = "assigned",
        } = params;

        const completed = variant === "completed";
        const subject = completed
            ? `Task completed — ${taskTitle}`
            : `New task assigned — ${taskTitle}`;
        const eyebrow = completed ? "Task completed" : "New task assigned";
        const greeting = completed
            ? `Hi ${this.esc(assignedTo)}, a task you're assigned to has been marked completed.`
            : `Hi ${this.esc(assignedTo)}, a task has been assigned to you.`;
        const ctaLabel = completed ? "View task &rarr;" : "Open task &rarr;";
        const footerNote = completed
            ? "You're receiving this because you were assigned this now-completed task in Converge Projects."
            : "You're receiving this because you were assigned this task in Converge Projects.";
        const textLead = completed ? "A task you're assigned to has been completed" : "New task assigned to you";
        const eyebrowColor = completed ? "#16a34a" : "#2563eb";
        const relatedTo = projectName || "Other";

        const prio = this.priorityColor(priority);

        const row = (label: string, valueHtml: string) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#64748b;font-size:13px;width:120px;vertical-align:top;">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${valueHtml}</td>
          </tr>`;

        const priorityBadge = `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${prio.bg};color:${prio.fg};font-size:12px;font-weight:700;">${this.esc(priority)}</span>`;

        try {
            await this.send({
                to,
                subject,

                text: [
                    textLead,
                    ``,
                    `Task:        ${taskTitle}`,
                    `Related to:  ${relatedTo}`,
                    `Priority:    ${priority}`,
                    `Assigned to: ${assignedTo}`,
                    ...(dueDate ? [`Due:         ${dueDate}`] : []),
                    ``,
                    ...(taskUrl ? [`Open the task: ${taskUrl}`] : []),
                    ``,
                    `— Converge Projects`,
                ].join("\n"),

                html: `
      <div style="background:#f1f5f9;padding:24px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#ffffff;padding:18px 24px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;">
                          ${this.logoImg()}
                        </td>
                        <td style="vertical-align:middle;color:#0f172a;font-size:17px;font-weight:700;letter-spacing:.2px;">Converge Projects</td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-size:0;line-height:0;">
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#3b82f6;"></span>
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#8b5cf6;margin-left:3px;"></span>
                    <span style="display:inline-block;width:16px;height:4px;border-radius:2px;background:#f97316;margin-left:3px;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${eyebrowColor};">${eyebrow}</div>
              <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${this.esc(taskTitle)}</div>
              <div style="margin-top:4px;font-size:13px;color:#64748b;">${greeting}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("Related to", this.esc(relatedTo))}
                ${row("Priority", priorityBadge)}
                ${dueDate ? row("Due", this.esc(dueDate)) : ""}
              </table>
            </td>
          </tr>

          ${taskUrl ? `
          <tr>
            <td style="padding:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${taskUrl}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${ctaLabel}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #eef1f5;color:#94a3b8;font-size:12px;line-height:1.5;">
              ${footerNote}
            </td>
          </tr>
        </table>
      </div>`,
            });

            this.logger.log(`Misc-task notification sent to ${to}`);
        } catch (error) {
            this.logger.error(
                `Failed to send misc-task email to ${to}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    /** One-time passcode for the forgot-password flow. */
    async sendPasswordResetOtp(params: { to: string; name: string; otp: string; minutes: number }) {
        const { to, name, otp, minutes } = params;
        try {
            await this.send({
                to,
                subject: `Your Converge password reset code: ${otp}`,
                text: [
                    `Hi ${name},`,
                    ``,
                    `Your password reset code is: ${otp}`,
                    `It expires in ${minutes} minutes.`,
                    ``,
                    `If you didn't request this, you can ignore this email — your password won't change.`,
                    ``,
                    `— Converge Projects`,
                ].join("\n"),
                html: `
      <div style="background:#f1f5f9;padding:24px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#ffffff;padding:18px 24px;border-bottom:1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:10px;">${this.logoImg()}</td>
                <td style="vertical-align:middle;color:#0f172a;font-size:17px;font-weight:700;">Converge Projects</td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 8px;">
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#2563eb;">Password reset</div>
              <div style="margin-top:6px;font-size:15px;color:#0f172a;">Hi ${name}, use this code to reset your password.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px;">
              <div style="text-align:center;font-size:34px;font-weight:800;letter-spacing:8px;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 0;">${otp}</div>
              <div style="margin-top:10px;font-size:13px;color:#64748b;text-align:center;">This code expires in ${minutes} minutes.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #eef1f5;color:#94a3b8;font-size:12px;line-height:1.5;">
              Didn't request this? You can safely ignore this email — your password won't change.
            </td>
          </tr>
        </table>
      </div>`,
            });
            this.logger.log(`Password reset OTP sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send OTP email to ${to}`, error instanceof Error ? error.stack : String(error));
            throw error;
        }
    }
}
