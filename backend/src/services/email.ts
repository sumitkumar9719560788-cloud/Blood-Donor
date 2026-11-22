import nodemailer from 'nodemailer';
import env from '../config/env.js';

export const sendPasswordResetEmail = async (to: string, token: string) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
    throw new Error('Password reset email is not configured');
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  const resetUrl = new URL('/', env.CLIENT_URL);
  resetUrl.searchParams.set('resetToken', token);
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Reset your LifeLink password',
    text: `Use this link to reset your LifeLink password. It expires in 60 minutes. If you did not request this, ignore this email.\n\n${resetUrl.toString()}`,
  });
};
