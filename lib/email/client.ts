import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️  RESEND_API_KEY is not set. Email sending will fail.');
}

// Use fallback API key to prevent build errors
export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

export const FROM_EMAIL = process.env.FROM_EMAIL || 'EP Tracker <noreply@eptracker.se>';
export const SUPPORT_EMAIL = 'support@eptracker.se';
export const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || SUPPORT_EMAIL;

