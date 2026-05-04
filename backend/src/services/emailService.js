/**
 * Email service — wraps nodemailer with SMTP config from environment variables.
 *
 * In test environments (NODE_ENV=test), email sending is skipped entirely.
 *
 * Required env vars:
 *   SMTP_HOST   — SMTP server hostname
 *   SMTP_PORT   — SMTP server port (default: 587)
 *   SMTP_USER   — SMTP authentication username
 *   SMTP_PASS   — SMTP authentication password
 *   EMAIL_FROM  — Sender address (e.g. "EthioTech Hub <no-reply@ethiotechhub.com>")
 */
const nodemailer = require('nodemailer');

/**
 * Creates and returns a nodemailer transporter configured from env vars.
 * @returns {import('nodemailer').Transporter}
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends a password-reset email containing the raw reset token.
 *
 * In test environments (NODE_ENV=test), this function is a no-op and returns
 * immediately without making any SMTP connection.
 *
 * @param {{ to: string, resetToken: string, frontendUrl?: string }} options
 * @returns {Promise<void>}
 */
const sendPasswordResetEmail = async ({ to, resetToken, frontendUrl }) => {
  // Skip actual email sending in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  const baseUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'EthioTech Hub <no-reply@ethiotechhub.com>',
    to,
    subject: 'EthioTech Hub — Password Reset Request',
    text: [
      'You requested a password reset for your EthioTech Hub account.',
      '',
      `Reset your password here: ${resetUrl}`,
      '',
      'This link expires in 60 minutes.',
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <p>You requested a password reset for your EthioTech Hub account.</p>
      <p>
        <a href="${resetUrl}">Click here to reset your password</a>
      </p>
      <p>This link expires in <strong>60 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
