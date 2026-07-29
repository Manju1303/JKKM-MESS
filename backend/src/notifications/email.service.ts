import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

/**
 * EmailService sends transactional emails for critical ERP events.
 * Uses nodemailer with Gmail SMTP (App Password required).
 * Gracefully no-ops if EMAIL_* env vars are not configured.
 *
 * FIX: Added explicit TLS options for Gmail on cloud containers (e.g. Koyeb, Railway) (TLS SNI + rejectUnauthorized fix).
 *      Added startup connection verify to surface config problems immediately in logs.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>("EMAIL_HOST");
    const port = parseInt(this.config.get<string>("EMAIL_PORT") || "587", 10);
    const user = this.config.get<string>("EMAIL_USER");
    const pass = this.config.get<string>("EMAIL_PASS");

    if (host && user && pass) {
      // secure=false + port 587 → STARTTLS upgrade after connection.
      // secure=true  + port 465 → TLS from the start (implicit TLS).
      // Gmail App Password works with port 587 + STARTTLS.
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true only for port 465
        auth: { user, pass },
        tls: {
          // Required on Koyeb/Railway/Docker — avoids "self-signed certificate" errors
          // that occur when the egress IP doesn't match SNI expectations.
          rejectUnauthorized: false,
          // Force TLS 1.2 minimum for compatibility with Gmail
          minVersion: "TLSv1.2",
        },
        // Increase timeouts for container/network latency
        connectionTimeout: 10000, // 10s
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // Verify connection on startup — logs a clear error if credentials are wrong
      this.transporter.verify((err) => {
        if (err) {
          this.logger.error(
            `❌ Email transporter verification FAILED: ${err.message}. ` +
              `Check EMAIL_HOST, EMAIL_USER, EMAIL_PASS, and ensure a Gmail App Password is used (not your regular password).`,
          );
        } else {
          this.logger.log(
            `📧 Email service connected and verified (${host}:${port})`,
          );
        }
      });
    } else {
      this.logger.warn(
        "EMAIL_HOST / EMAIL_USER / EMAIL_PASS not configured — email notifications disabled",
      );
    }
  }

  private get from() {
    return (
      this.config.get<string>("EMAIL_FROM") ||
      "JKKM Mess ERP <manjunathkaids23@jkkmct.edu.in>"
    );
  }

  private get adminEmail() {
    return (
      this.config.get<string>("EMAIL_ADMIN") || "manjunathkaids23@jkkmct.edu.in"
    );
  }

  /** Generic send — silently logs if transporter not configured */
  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (no transporter): "${subject}"`);
      return;
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(
        `✉️  Email sent to ${to}: "${subject}" [messageId: ${info.messageId}]`,
      );
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}: ${err.message}`);
    }
  }

  /** Alert: Low stock notification */
  async sendLowStockAlert(
    productName: string,
    currentQty: number,
    minLevel: number,
    unit: string,
  ) {
    const severity = currentQty === 0 ? "🔴 CRITICAL" : "🟠 WARNING";
    await this.send(
      this.adminEmail,
      `${severity}: Low Stock — ${productName}`,
      `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#1F497D;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">⚠️ JKKM Mess ERP — Low Stock Alert</h2>
        </div>
        <div style="padding:24px;background:#f9fafb">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280;width:40%">Product</td><td style="padding:8px 0;font-weight:600">${productName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Current Stock</td><td style="padding:8px 0;font-weight:600;color:${currentQty === 0 ? "#dc2626" : "#d97706"}">${currentQty} ${unit}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Minimum Required</td><td style="padding:8px 0;font-weight:600">${minLevel} ${unit}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Severity</td><td style="padding:8px 0;font-weight:700;color:${currentQty === 0 ? "#dc2626" : "#d97706"}">${severity}</td></tr>
          </table>
          <p style="margin-top:20px;padding:12px;background:#fff3cd;border-radius:6px;font-size:13px;color:#856404">
            Please log in to the ERP system and create a Purchase Order immediately.
          </p>
          <p style="color:#9ca3af;font-size:11px;margin-top:16px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }

  /** Alert: New purchase order created */
  async sendNewPurchaseAlert(
    purchaseNumber: string,
    supplierName: string,
    amount: number,
  ) {
    await this.send(
      this.adminEmail,
      `📦 New Purchase Order — ${purchaseNumber}`,
      `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#1F497D;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">📦 JKKM Mess ERP — New Purchase Order</h2>
        </div>
        <div style="padding:24px;background:#f9fafb">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280;width:40%">PO Number</td><td style="padding:8px 0;font-weight:600">${purchaseNumber}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Supplier</td><td style="padding:8px 0;font-weight:600">${supplierName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Amount</td><td style="padding:8px 0;font-weight:600">₹${amount.toLocaleString("en-IN")}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Status</td><td style="padding:8px 0;font-weight:600;color:#d97706">Pending Approval</td></tr>
          </table>
          <p style="color:#9ca3af;font-size:11px;margin-top:16px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }

  /** Alert: Expiry warning */
  async sendExpiryAlert(
    productName: string,
    quantity: number,
    unit: string,
    daysToExpiry: number,
  ) {
    const severity = daysToExpiry <= 2 ? "🔴 CRITICAL" : "🟠 WARNING";
    await this.send(
      this.adminEmail,
      `${severity}: Expiry Alert — ${productName} (${daysToExpiry} day${daysToExpiry !== 1 ? "s" : ""} left)`,
      `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#1F497D;color:#fff;padding:20px 24px">
          <h2 style="margin:0;font-size:18px">⏰ JKKM Mess ERP — Expiry Alert</h2>
        </div>
        <div style="padding:24px;background:#f9fafb">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#6b7280;width:40%">Product</td><td style="padding:8px 0;font-weight:600">${productName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Quantity at Risk</td><td style="padding:8px 0;font-weight:600">${quantity} ${unit}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Days to Expiry</td><td style="padding:8px 0;font-weight:700;color:#dc2626">${daysToExpiry} days</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280">Severity</td><td style="padding:8px 0;font-weight:700;color:${daysToExpiry <= 2 ? "#dc2626" : "#d97706"}">${severity}</td></tr>
          </table>
          <p style="color:#9ca3af;font-size:11px;margin-top:16px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }
}
