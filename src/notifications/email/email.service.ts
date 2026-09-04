import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { CONVERGE_LOGO_BASE64 } from "./converge-logo";

/** Content-ID for the inline logo attachment, referenced as src="cid:...". */
const LOGO_CID = "converge-logo";

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly transporter = nodemailer.createTransport({
        // host: process.env.SMTP_HOST,
        // port: Number(process.env.SMTP_PORT),
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    async onModuleInit() {
        try {
            await this.transporter.verify();
            this.logger.log("SMTP connection successful");
        } catch (error) {
            this.logger.error(
                "SMTP connection failed",
                error instanceof Error ? error.stack : String(error),
            );
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

    async sendTicketAssignedEmail(params: {
        to: string;
        ticketNumber: string;
        projectName: string;
        priority: string;
        issue: string;
        assignedTo: string;
        dueDate?: string | null;
        ticketUrl?: string;
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
        } = params;

        const prio = this.priorityColor(priority);
        // Logo is attached inline (CID) rather than linked, so it renders in the
        // receiver's client without depending on remote hosting or "show images".
        const logoSrc = `cid:${LOGO_CID}`;

        // One details row — table-based so it renders consistently in Gmail/Outlook.
        const row = (label: string, valueHtml: string) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#64748b;font-size:13px;width:120px;vertical-align:top;">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #eef1f5;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${valueHtml}</td>
          </tr>`;

        const priorityBadge = `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${prio.bg};color:${prio.fg};font-size:12px;font-weight:700;">${this.esc(priority)}</span>`;

        try {
            await this.transporter.sendMail({
                from: `"Converge Projects" <${process.env.SMTP_USER}>`,
                to,
                subject: `New ticket assigned — ${ticketNumber}: ${issue}`,

                text: [
                    `New ticket assigned to you`,
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
                          <img src="${logoSrc}" width="28" height="28" alt="Converge" style="display:block;width:28px;height:28px;" />
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
              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#2563eb;">New ticket assigned</div>
              <div style="margin-top:6px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${this.esc(issue)}</div>
              <div style="margin-top:4px;font-size:13px;color:#64748b;">Hi ${this.esc(assignedTo)}, a ticket has been assigned to you.</div>
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
                    <a href="${ticketUrl}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Open ticket &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #eef1f5;color:#94a3b8;font-size:12px;line-height:1.5;">
              You're receiving this because you were assigned this ticket in Converge Projects.
            </td>
          </tr>
        </table>
      </div>`,

                attachments: [
                    {
                        filename: "converge-logo.png",
                        content: Buffer.from(CONVERGE_LOGO_BASE64, "base64"),
                        contentType: "image/png",
                        cid: LOGO_CID,
                    },
                ],
            });

            this.logger.log(
                `Ticket notification sent to ${to}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send ticket email to ${to}`,
                error,
            );

            throw error;
        }
    }

    /** One-time passcode for the forgot-password flow. */
    async sendPasswordResetOtp(params: { to: string; name: string; otp: string; minutes: number }) {
        const { to, name, otp, minutes } = params;
        try {
            await this.transporter.sendMail({
                from: `"Converge Projects" <${process.env.SMTP_USER}>`,
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
                <td style="vertical-align:middle;padding-right:10px;"><img src="cid:${LOGO_CID}" width="28" height="28" alt="Converge" style="display:block;width:28px;height:28px;" /></td>
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
                attachments: [
                    { filename: "converge-logo.png", content: Buffer.from(CONVERGE_LOGO_BASE64, "base64"), contentType: "image/png", cid: LOGO_CID },
                ],
            });
            this.logger.log(`Password reset OTP sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send OTP email to ${to}`, error instanceof Error ? error.stack : String(error));
            throw error;
        }
    }
}