import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * EmailService sends transactional emails for critical ERP events.
 * Uses nodemailer with SMTP (Gmail App Password or SendGrid SMTP).
 * Gracefully no-ops if EMAIL_* env vars are not configured.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('EMAIL_HOST');
    const user = this.config.get<string>('EMAIL_USER');
    const pass = this.config.get<string>('EMAIL_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.config.get<string>('EMAIL_PORT') || '587'),
        secure: this.config.get<string>('EMAIL_PORT') === '465',
        auth: { user, pass },
      });
      this.logger.log(`📧 Email service configured (${host})`);
    } else {
      this.logger.warn('EMAIL_HOST / EMAIL_USER / EMAIL_PASS not set — email notifications disabled');
    }
  }

  private get from() {
    return this.config.get<string>('EMAIL_FROM') || 'JKKM Mess ERP <manjunathkaids23@jkkmct.edu.in>';
  }

  private get adminEmail() {
    return this.config.get<string>('EMAIL_ADMIN') || 'manjunathkaids23@jkkmct.edu.in';
  }

  /** Generic send — silently logs if transporter not configured */
  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`✉️  Email sent to ${to}: "${subject}"`);
    } catch (err) {
      this.logger.error(`❌ Failed to send email to ${to}: ${err.message}`);
    }
  }

  /** Alert: Low stock notification */
  async sendLowStockAlert(productName: string, currentQty: number, minLevel: number, unit: string) {
    const severity = currentQty === 0 ? '🔴 CRITICAL' : '🟠 WARNING';
    await this.send(
      this.adminEmail,
      `${severity}: Low Stock — ${productName}`,
      `
      <div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:auto">
        <div style="background:#1F497D;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">JKKM Mess ERP — Low Stock Alert</h2>
        </div>
        <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="font-size:16px"><strong>Product:</strong> ${productName}</p>
          <p><strong>Current Stock:</strong> ${currentQty} ${unit}</p>
          <p><strong>Minimum Required:</strong> ${minLevel} ${unit}</p>
          <p style="color:${currentQty === 0 ? '#dc2626' : '#d97706'}"><strong>Severity:</strong> ${severity}</p>
          <p style="color:#6b7280;font-size:12px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }

  /** Alert: New purchase order created */
  async sendNewPurchaseAlert(purchaseNumber: string, supplierName: string, amount: number) {
    await this.send(
      this.adminEmail,
      `📦 New Purchase Order — ${purchaseNumber}`,
      `
      <div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:auto">
        <div style="background:#1F497D;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">JKKM Mess ERP — New Purchase Order</h2>
        </div>
        <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p><strong>PO Number:</strong> ${purchaseNumber}</p>
          <p><strong>Supplier:</strong> ${supplierName}</p>
          <p><strong>Amount:</strong> ₹${amount.toLocaleString('en-IN')}</p>
          <p><strong>Status:</strong> Pending Approval</p>
          <p style="color:#6b7280;font-size:12px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }

  /** Alert: Expiry warning */
  async sendExpiryAlert(productName: string, quantity: number, unit: string, daysToExpiry: number) {
    const severity = daysToExpiry <= 2 ? '🔴 CRITICAL' : '🟠 WARNING';
    await this.send(
      this.adminEmail,
      `${severity}: Expiry Alert — ${productName} (${daysToExpiry} day${daysToExpiry !== 1 ? 's' : ''} left)`,
      `
      <div style="font-family:Segoe UI,sans-serif;max-width:600px;margin:auto">
        <div style="background:#1F497D;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">JKKM Mess ERP — Expiry Alert</h2>
        </div>
        <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Quantity at Risk:</strong> ${quantity} ${unit}</p>
          <p><strong>Days to Expiry:</strong> <span style="color:#dc2626;font-weight:bold">${daysToExpiry} days</span></p>
          <p style="color:#6b7280;font-size:12px">— JKKM Mess ERP Notification System</p>
        </div>
      </div>`,
    );
  }
}
