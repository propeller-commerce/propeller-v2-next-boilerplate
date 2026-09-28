import nodemailer, { type Transporter } from 'nodemailer';
import type { MailMessage, MailProvider } from '../core';

/**
 * SMTP delivery via nodemailer. Works with Mailjet, SendGrid, SES or a plain
 * relay — the credentials decide, not the code.
 *
 * Requires SMTP egress, which some serverless hosts block; those shops should
 * add an HTTP-API provider beside this one rather than change the route.
 */
export function createSmtpProvider(): MailProvider {
  let transporter: Transporter | null = null;

  // Built on first send, not at module load: importing this file must not
  // require credentials, so a shop that never sends mail still builds.
  function getTransporter(): Transporter {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    if (!host) throw new Error('SMTP_HOST is not configured');
    transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      // true for 465, false for 587 (STARTTLS).
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return transporter;
  }

  return {
    name: 'smtp',
    async send(message: MailMessage): Promise<void> {
      const from = process.env.SMTP_FROM_EMAIL;
      if (!from) throw new Error('SMTP_FROM_EMAIL is not configured');
      const fromName = process.env.SMTP_FROM_NAME;
      await getTransporter().sendMail({
        from: fromName ? `"${fromName}" <${from}>` : from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo || process.env.SMTP_REPLY_TO || from,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
    },
  };
}
