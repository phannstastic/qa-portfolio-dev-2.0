/**
 * Email Notification Service (Resend REST API Integration)
 *
 * Dispatches notification emails when new visitor inquiries are submitted via the contact form.
 * Designed to be zero-dependency (uses native Bun/Node fetch), resilient, and fully mockable.
 */

export interface EmailNotificationPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export interface EmailServiceConfig {
  apiKey?: string;
  toEmail?: string;
  fromEmail?: string;
}

export interface EmailService {
  sendContactNotification(
    payload: EmailNotificationPayload,
    configOverride?: EmailServiceConfig
  ): Promise<SendEmailResult>;
}

/**
 * Escapes HTML characters in visitor-supplied text to prevent HTML injection in emails.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resend Email Service implementation.
 */
export class ResendEmailService implements EmailService {
  private defaultApiKey?: string;
  private defaultToEmail: string;
  private defaultFromEmail: string;

  constructor(config?: EmailServiceConfig) {
    this.defaultApiKey = config?.apiKey ?? process.env.RESEND_API_KEY;
    this.defaultToEmail = config?.toEmail ?? (process.env.CONTACT_TO_EMAIL || 'rphannfvs@gmail.com');
    this.defaultFromEmail =
      config?.fromEmail ?? (process.env.CONTACT_FROM_EMAIL || 'irfan.Lab <onboarding@resend.dev>');
  }

  async sendContactNotification(
    payload: EmailNotificationPayload,
    configOverride?: EmailServiceConfig
  ): Promise<SendEmailResult> {
    const apiKey = (configOverride?.apiKey ?? this.defaultApiKey ?? process.env.RESEND_API_KEY ?? '').trim();
    const toEmail = (
      configOverride?.toEmail ??
      this.defaultToEmail ??
      process.env.CONTACT_TO_EMAIL ??
      'rphannfvs@gmail.com'
    ).trim();
    const fromEmail = (
      configOverride?.fromEmail ??
      this.defaultFromEmail ??
      process.env.CONTACT_FROM_EMAIL ??
      'irfan.Lab <onboarding@resend.dev>'
    ).trim();

    // 1. Guard: Check if API key is provided
    if (!apiKey) {
      console.warn('ℹ️ [EmailService] RESEND_API_KEY is not configured. Contact email notification skipped.');
      return {
        success: false,
        skipped: true,
        error: 'RESEND_API_KEY is not configured',
      };
    }

    const sanitizedName = payload.name.trim();
    const sanitizedEmail = payload.email.trim();
    const sanitizedSubject = (payload.subject && payload.subject.trim() !== '' ? payload.subject.trim() : 'General Inquiry');
    const sanitizedMessage = payload.message.trim();

    const emailSubject = `[irfan.Lab Contact] ${sanitizedSubject} - from ${sanitizedName}`;

    const textContent = `
New Contact Inquiry - irfan.Lab
=======================================
Sender Name:    ${sanitizedName}
Sender Email:   ${sanitizedEmail}
Subject:        ${sanitizedSubject}
Received At:    ${new Date().toISOString()}

Message:
---------------------------------------
${sanitizedMessage}
=======================================
Reply directly to ${sanitizedEmail} to respond.
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
    <tr>
      <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e1b4b, #312e81); border-bottom: 1px solid #3730a3;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.025em;">irfan.Lab &bull; Contact Notification</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #cbd5e1;">A new visitor inquiry has been received via your portfolio website.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="8" style="margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td width="30%" style="color: #94a3b8; font-weight: 600;">Sender Name:</td>
            <td style="color: #f8fafc; font-weight: 500;">${escapeHtml(sanitizedName)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-weight: 600;">Sender Email:</td>
            <td style="color: #38bdf8;"><a href="mailto:${escapeHtml(sanitizedEmail)}" style="color: #38bdf8; text-decoration: none;">${escapeHtml(sanitizedEmail)}</a></td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-weight: 600;">Subject:</td>
            <td style="color: #f8fafc;">${escapeHtml(sanitizedSubject)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-weight: 600;">Received At:</td>
            <td style="color: #94a3b8; font-size: 13px;">${new Date().toUTCString()}</td>
          </tr>
        </table>

        <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Message Content</div>
          <div style="font-size: 14px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap;">${escapeHtml(sanitizedMessage)}</div>
        </div>

        <div style="text-align: center; padding-top: 8px;">
          <a href="mailto:${escapeHtml(sanitizedEmail)}?subject=${encodeURIComponent('Re: ' + sanitizedSubject)}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Reply to ${escapeHtml(sanitizedName)}
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 32px; background-color: #0b0f19; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center;">
        &copy; 2026 irfan.Lab &bull; Automated notification sent from website backend.
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // 2. Dispatch via Resend REST API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          reply_to: sanitizedEmail,
          subject: emailSubject,
          html: htmlContent,
          text: textContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody: any = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg =
          responseBody?.message ||
          responseBody?.error ||
          `Resend API responded with status ${response.status}`;
        console.warn(`⚠️ [EmailService] Resend API error (${response.status}): ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }

      const emailId = responseBody?.id || 'unknown';
      console.log(`✅ [EmailService] Contact notification email successfully dispatched to ${toEmail} (ID: ${emailId})`);
      return {
        success: true,
        id: emailId,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const isAbort = err?.name === 'AbortError';
      const errorMsg = isAbort ? 'Request to Resend timed out after 8000ms' : (err?.message || 'Network error');
      console.error(`❌ [EmailService] Failed to send email: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}

/**
 * Singleton instance of ResendEmailService.
 */
export const defaultEmailService = new ResendEmailService();
