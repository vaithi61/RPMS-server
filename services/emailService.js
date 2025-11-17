import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';

let transporter;

export function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = String(process.env.SMTP_SECURE || '').toLowerCase();
  const secure = secureEnv === 'true' || port === 465; // 465 requires SSL/TLS

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    requireTLS: !secure, // STARTTLS on 587/25
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      minVersion: 'TLSv1.2',
      // allow overriding in environments with custom CAs
      rejectUnauthorized: String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').toLowerCase() === 'true',
    },
  });
  return transporter;
}

export async function sendEmail({ to, subject, html }) {
  const from = process.env.EMAIL_FROM || 'Research System <no-reply@example.com>';
  try {
    const info = await getTransporter().sendMail({ from, to, subject, html });
    await EmailLog.create({
      recipient: to,
      subject,
      status: 'Sent',
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    await EmailLog.create({
      recipient: to,
      subject,
      status: 'Failed',
      error: error.message,
    });
    console.error('Error sending email to %s: %s', to, error.message);
    throw error; // Re-throw the error so the calling function can handle it
  }
}

export async function verifyEmailTransport() {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

export const templates = {
  verification: (link) => `<p>Please verify your email by clicking <a href="${link}">this link</a>.</p>`,
  reset: (link) => `<p>Reset your password by clicking <a href="${link}">this link</a>.</p>`,
  submissionConfirmation: (paperId) => `<p>Your submission has been received. Paper ID: <b>${paperId}</b></p>`,
  reviewerAssignment: (paperTitle) => `<p>You have been assigned to review: <b>${paperTitle}</b></p>`,
  reviewSubmitted: (paperTitle) => `<p>A review has been submitted for: <b>${paperTitle}</b></p>`,
  reviewOutcome: (paperTitle, status) => `<p>Your paper "${paperTitle}" outcome: <b>${status}</b></p>`,
};
