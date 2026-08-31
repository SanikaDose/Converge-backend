import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

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

        try {
            await this.transporter.sendMail({
                from: `"Converge Projects" <${process.env.SMTP_USER}>`,
                to,
                subject: `New Ticket Assigned - ${ticketNumber}`,

                text: `
New Ticket Assigned

Ticket: ${ticketNumber}
Project: ${projectName}
Priority: ${priority}
Issue: ${issue}
Assigned to: ${assignedTo}
Due: ${dueDate ?? "Not specified"}

Open Ticket:
${ticketUrl ?? ""}
        `,

                html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 24px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
          ">
            <h2>🔔 New Ticket Assigned</h2>

            <p>
              <strong>Ticket:</strong>
              ${ticketNumber}
            </p>

            <p>
              <strong>Project:</strong>
              ${projectName}
            </p>

            <p>
              <strong>Priority:</strong>
              ${priority}
            </p>

            <p>
              <strong>Issue:</strong>
              ${issue}
            </p>

            <p>
              <strong>Assigned to:</strong>
              ${assignedTo}
            </p>

            <p>
              <strong>Due:</strong>
              ${dueDate ?? "Not specified"}
            </p>

            ${ticketUrl
                        ? `
                  <p>
                    <a
                      href="${ticketUrl}"
                      style="
                        display:inline-block;
                        padding:10px 16px;
                        background:#2563eb;
                        color:white;
                        text-decoration:none;
                        border-radius:6px;
                      "
                    >
                      Open Ticket
                    </a>
                  </p>
                `
                        : ""
                    }
          </div>
        `,
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
}