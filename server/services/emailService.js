import nodemailer from 'nodemailer';
import { env, primaryClientUrl } from '../config/env.js';
import { logger } from '../utils/logger.js';

const transporter = env.smtp.enabled
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    })
  : null;

export const isEmailEnabled = Boolean(transporter);

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ heading, body, ctaLabel, ctaUrl, footnote }) {
  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#0b1220,#1e3a8a);padding:24px 32px;color:#fff;font-size:18px;font-weight:700">
          AutoCare<span style="color:#60a5fa">360</span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155">${body}</div>
          ${
            ctaUrl
              ? `<p style="margin:28px 0 0"><a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${escapeHtml(ctaLabel)}</a></p>`
              : ''
          }
          ${footnote ? `<p style="margin:28px 0 0;font-size:12px;color:#64748b">${escapeHtml(footnote)}</p>` : ''}
        </td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px">Complete vehicle maintenance, simplified.</p>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendMail({ to, subject, html, text }) {
  if (!transporter) {
    logger.info(`[email → console] to=${to} subject="${subject}"\n${text || ''}`);
    return { delivered: false, preview: true };
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
    return { delivered: true };
  } catch (error) {
    logger.error(`Email to ${to} failed: ${error.message}`);
    return { delivered: false, error: error.message };
  }
}

export function sendPasswordResetEmail(user, resetUrl) {
  return sendMail({
    to: user.email,
    subject: 'Reset your AutoCare360 password',
    text: `Hi ${user.name},\n\nReset your password using this link (valid for 30 minutes):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    html: layout({
      heading: 'Reset your password',
      body: `<p>Hi ${escapeHtml(user.name)},</p><p>We received a request to reset your AutoCare360 password. This link is valid for 30 minutes.</p>`,
      ctaLabel: 'Reset password',
      ctaUrl: resetUrl,
      footnote: "If you didn't request a password reset, you can safely ignore this email.",
    }),
  });
}

export function sendWelcomeEmail(user) {
  return sendMail({
    to: user.email,
    subject: 'Welcome to AutoCare360',
    text: `Hi ${user.name}, welcome to AutoCare360! Add your first vehicle to generate its maintenance schedule: ${primaryClientUrl}/app/vehicles/new`,
    html: layout({
      heading: `Welcome aboard, ${user.name.split(' ')[0]}!`,
      body: '<p>Add your first vehicle and AutoCare360 will build a maintenance schedule tailored to its type, fuel and powertrain.</p>',
      ctaLabel: 'Add a vehicle',
      ctaUrl: `${primaryClientUrl}/app/vehicles/new`,
    }),
  });
}

export function sendAlertEmail(user, { title, message, link }) {
  const url = link ? `${primaryClientUrl}${link}` : `${primaryClientUrl}/app`;
  return sendMail({
    to: user.email,
    subject: `AutoCare360 · ${title}`,
    text: `${title}\n\n${message || ''}\n\nOpen: ${url}`,
    html: layout({
      heading: title,
      body: `<p>${escapeHtml(message || '')}</p>`,
      ctaLabel: 'Open AutoCare360',
      ctaUrl: url,
      footnote: 'You can change email notification preferences in Settings.',
    }),
  });
}
