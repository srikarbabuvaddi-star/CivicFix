import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let activeTransporter = null;

export function setTransporter(transporter) {
  activeTransporter = transporter;
}

export function getTransporter() {
  if (activeTransporter) {
    return activeTransporter;
  }

  if (env.emailEnabled && env.smtpHost) {
    try {
      activeTransporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: env.smtpUser
          ? {
              user: env.smtpUser,
              pass: env.smtpPass
            }
          : undefined
      });
      return activeTransporter;
    } catch (err) {
      console.warn('[WARN] [EMAIL] Could not initialize SMTP transporter:', err.message);
      return null;
    }
  }

  return null;
}

/**
 * Format a civic transactional email with professional navy/teal styling and plain text fallback
 */
function buildEmailTemplate({ title, body, actionUrl, actionText }) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safeActionText = escapeHtml(actionText || 'View Report');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .header { background-color: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #14b8a6; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 28px; line-height: 1.6; font-size: 15px; color: #334155; }
    .btn { display: inline-block; padding: 10px 20px; background-color: #0d9488; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
    .footer { padding: 20px 28px; background-color: #f1f5f9; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CivicFix</h1>
      <p>Municipal Civic Issue Reporting & Resolution</p>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">${safeTitle}</h2>
      <p>${safeBody}</p>
      ${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" class="btn">${safeActionText}</a></p>` : ''}
    </div>
    <div class="footer">
      <p>This is an automated notification from CivicFix Platform. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`.trim();

  const text = `${title}\n\n${body}\n\n${actionUrl ? `${safeActionText}: ${actionUrl}\n\n` : ''}CivicFix Platform`;

  return { html, text };
}

/**
 * Send transactional email with safe fallback when disabled
 */
export async function sendTransactionalEmail({
  to,
  subject,
  title,
  body,
  actionUrl = null,
  actionText = 'View Report'
}) {
  if (!to || !to.includes('@')) {
    return { success: false, reason: 'Invalid recipient address' };
  }

  const { html, text } = buildEmailTemplate({ title, body, actionUrl, actionText });
  const transporter = getTransporter();

  // If email is not configured or disabled, log safely and simulate delivery
  if (!transporter) {
    if (env.isDevelopment) {
      console.log(`[INFO] [EMAIL] (Disabled/Simulated) To: ${to} | Subject: "${subject}"`);
    }
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`
    };
  }

  try {
    const info = await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      text,
      html
    });

    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err) {
    // Avoid leaking internal credentials to caller
    console.error('[ERROR] [EMAIL] Failed to send email:', err.message);
    return {
      success: false,
      error: 'Email delivery failed'
    };
  }
}

