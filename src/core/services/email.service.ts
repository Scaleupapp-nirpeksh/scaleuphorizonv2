/**
 * Email Service
 *
 * Handles email sending via SMTP (Gmail, etc.) with template support
 */

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '@/config';
import { InternalError } from '@/core/errors';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export class EmailService {
  private transporter: Transporter | null = null;
  private fromAddress: string;
  private fromName: string;

  constructor() {
    this.fromAddress = config.email.from || '';
    this.fromName = config.email.fromName;

    if (this.isConfigured()) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
    }
  }

  /**
   * Check if email is configured
   */
  isConfigured(): boolean {
    return !!(
      config.email.host &&
      config.email.port &&
      config.email.user &&
      config.email.pass &&
      config.email.from
    );
  }

  /**
   * Ensure email is configured before sending
   */
  private ensureConfigured(): void {
    if (!this.isConfigured() || !this.transporter) {
      throw new InternalError(
        'Email is not configured. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM in environment variables.'
      );
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    this.ensureConfigured();

    try {
      const result = await this.transporter!.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted as string[],
        rejected: result.rejected as string[],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalError(`Failed to send email: ${message}`);
    }
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<boolean> {
    if (!this.isConfigured() || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // =====================================
  // Pre-built Email Templates
  // =====================================

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<EmailResult> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const html = this.getEmailTemplate({
      title: 'Reset Your Password',
      preheader: 'Password reset request for your ScaleUp Horizon account',
      greeting: `Hi${userName ? ` ${userName}` : ''},`,
      content: `
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in <strong>1 hour</strong>.</p>
        <p>If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
        <p style="margin-top: 20px; padding: 15px; background-color: #F3F4F6; border-radius: 6px; font-size: 14px;">
          <strong>Security tip:</strong> Never share this link with anyone. Our team will never ask for your password.
        </p>
      `,
    });

    return this.send({
      to: email,
      subject: 'Reset Your Password - ScaleUp Horizon',
      html,
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    email: string,
    verificationToken: string,
    userName?: string
  ): Promise<EmailResult> {
    const verifyUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

    const html = this.getEmailTemplate({
      title: 'Verify Your Email',
      preheader: 'Please verify your email address',
      greeting: `Hi${userName ? ` ${userName}` : ''},`,
      content: `
        <p>Welcome to ScaleUp Horizon! Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Verify Email
          </a>
        </p>
        <p>This link will expire in <strong>24 hours</strong>.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `,
    });

    return this.send({
      to: email,
      subject: 'Verify Your Email - ScaleUp Horizon',
      html,
    });
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcome(email: string, userName: string): Promise<EmailResult> {
    const loginUrl = `${config.frontendUrl}/login`;

    const html = this.getEmailTemplate({
      title: 'Welcome to ScaleUp Horizon!',
      preheader: 'Your account has been created successfully',
      greeting: `Hi ${userName},`,
      content: `
        <p>Welcome to <strong>ScaleUp Horizon</strong>! We're excited to have you on board.</p>
        <p>ScaleUp Horizon helps startups manage their finances with:</p>
        <ul style="margin: 20px 0; padding-left: 20px;">
          <li>📊 Financial Planning & Budgeting</li>
          <li>💰 Expense & Revenue Tracking</li>
          <li>📈 Cash Flow Projections</li>
          <li>🎯 Fundraising Management</li>
          <li>🤖 AI-Powered Insights</li>
        </ul>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Get Started
          </a>
        </p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `,
    });

    return this.send({
      to: email,
      subject: 'Welcome to ScaleUp Horizon! 🚀',
      html,
    });
  }

  /**
   * Send organization invitation
   */
  async sendOrganizationInvite(
    email: string,
    inviterName: string,
    organizationName: string,
    inviteToken: string,
    role: string
  ): Promise<EmailResult> {
    const acceptUrl = `${config.frontendUrl}/accept-invite?token=${inviteToken}`;

    const html = this.getEmailTemplate({
      title: `You're Invited to ${organizationName}`,
      preheader: `${inviterName} invited you to join ${organizationName}`,
      greeting: 'Hi,',
      content: `
        <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on ScaleUp Horizon as a <strong>${role}</strong>.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation will expire in <strong>7 days</strong>.</p>
        <p style="margin-top: 20px; font-size: 14px; color: #6B7280;">
          If you don't know ${inviterName} or weren't expecting this invitation, you can ignore this email.
        </p>
      `,
    });

    return this.send({
      to: email,
      subject: `You're invited to join ${organizationName} on ScaleUp Horizon`,
      html,
    });
  }

  /**
   * Send investor report to investors
   */
  async sendInvestorReport(
    emails: string[],
    organizationName: string,
    reportTitle: string,
    reportUrl: string,
    reportPeriod: string
  ): Promise<EmailResult> {
    const html = this.getEmailTemplate({
      title: `${reportTitle}`,
      preheader: `${reportPeriod} report from ${organizationName}`,
      greeting: 'Dear Investor,',
      content: `
        <p>Please find the ${reportPeriod} investor report from <strong>${organizationName}</strong>.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${reportUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Report
          </a>
        </p>
        <p>If you have any questions about this report, please reply to this email.</p>
        <p style="margin-top: 20px; font-size: 14px; color: #6B7280;">
          This report was generated and sent via ScaleUp Horizon.
        </p>
      `,
    });

    return this.send({
      to: emails,
      subject: `${reportTitle} - ${organizationName}`,
      html,
    });
  }

  /**
   * Send expense approval notification
   */
  async sendExpenseApprovalRequest(
    approverEmail: string,
    approverName: string,
    submitterName: string,
    expenseAmount: string,
    expenseDescription: string,
    expenseUrl: string
  ): Promise<EmailResult> {
    const html = this.getEmailTemplate({
      title: 'Expense Approval Required',
      preheader: `${submitterName} submitted an expense for approval`,
      greeting: `Hi ${approverName},`,
      content: `
        <p><strong>${submitterName}</strong> has submitted an expense for your approval:</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid #4F46E5;">
          <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ${expenseAmount}</p>
          <p style="margin: 0;"><strong>Description:</strong> ${expenseDescription}</p>
        </div>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${expenseUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Review Expense
          </a>
        </p>
      `,
    });

    return this.send({
      to: approverEmail,
      subject: `Expense Approval Required: ${expenseAmount}`,
      html,
    });
  }

  /**
   * Send expense status update
   */
  async sendExpenseStatusUpdate(
    email: string,
    userName: string,
    expenseAmount: string,
    status: 'approved' | 'rejected',
    notes?: string
  ): Promise<EmailResult> {
    const statusColor = status === 'approved' ? '#10B981' : '#EF4444';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    const html = this.getEmailTemplate({
      title: `Expense ${statusText}`,
      preheader: `Your expense of ${expenseAmount} has been ${status}`,
      greeting: `Hi ${userName},`,
      content: `
        <p>Your expense of <strong>${expenseAmount}</strong> has been <span style="color: ${statusColor}; font-weight: 600;">${status}</span>.</p>
        ${notes ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #F9FAFB; border-radius: 8px;">
          <p style="margin: 0;"><strong>Notes:</strong> ${notes}</p>
        </div>
        ` : ''}
        <p style="margin-top: 20px;">
          <a href="${config.frontendUrl}/expenses" style="color: #4F46E5; text-decoration: none; font-weight: 500;">
            View your expenses →
          </a>
        </p>
      `,
    });

    return this.send({
      to: email,
      subject: `Expense ${statusText}: ${expenseAmount}`,
      html,
    });
  }

  /**
   * Send meeting reminder
   */
  async sendMeetingReminder(
    email: string,
    userName: string,
    meetingTitle: string,
    meetingDate: string,
    meetingTime: string,
    meetingUrl?: string
  ): Promise<EmailResult> {
    const html = this.getEmailTemplate({
      title: 'Meeting Reminder',
      preheader: `Upcoming: ${meetingTitle}`,
      greeting: `Hi ${userName},`,
      content: `
        <p>This is a reminder for your upcoming meeting:</p>
        <div style="margin: 20px 0; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border-left: 4px solid #4F46E5;">
          <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">${meetingTitle}</p>
          <p style="margin: 0;"><strong>Date:</strong> ${meetingDate}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${meetingTime}</p>
        </div>
        ${meetingUrl ? `
        <p style="text-align: center; margin: 30px 0;">
          <a href="${meetingUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Meeting Details
          </a>
        </p>
        ` : ''}
      `,
    });

    return this.send({
      to: email,
      subject: `Reminder: ${meetingTitle}`,
      html,
    });
  }

  // =====================================
  // Email Template Helper
  // =====================================

  /**
   * Generate consistent email template
   */
  private getEmailTemplate(options: {
    title: string;
    preheader: string;
    greeting: string;
    content: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 12px 24px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #F3F4F6;">
    ${options.preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #4F46E5;">
                ScaleUp Horizon
              </h1>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #111827;">
                      ${options.title}
                    </h2>
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                      ${options.greeting}
                    </p>
                    <div style="color: #374151; font-size: 16px; line-height: 1.6;">
                      ${options.content}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280;">
                © ${new Date().getFullYear()} ScaleUp Horizon. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                You received this email because you have an account with ScaleUp Horizon.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();
