// Test Notification Email - Send test notification via email directly
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  });
}

import { createAdminClient } from '../lib/supabase/server';
import { Resend } from 'resend';
import { FROM_EMAIL, REPLY_TO_EMAIL } from '../lib/email/client';

async function testNotificationEmail() {
  const email = process.argv[2] || 'oi@johan.com.br';

  console.log(`🧪 Testing notification email to: ${email}`);

  try {
    const supabase = createAdminClient();

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found:', profileError);
      process.exit(1);
    }

    console.log(`✅ Found user: ${profile.full_name || profile.email} (ID: ${profile.id})`);

    // Build email content (same as in send-notification.ts)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eptracker.app';
    const notificationUrl = `${baseUrl}/dashboard`;

    const title = '🎉 Test-notifikation via e-post!';
    const body = `Hej ${profile.full_name || 'där'}! Detta är en testnotifikation från EP-Tracker. Eftersom Firebase inte är konfigurerat ännu, får du denna notifikation via e-post istället.`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔔 EP-Tracker Notifikation</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0; font-size: 20px;">${title}</h2>
            <p style="color: #4b5563; font-size: 16px; white-space: pre-wrap;">${body}</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${notificationUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Öppna i EP-Tracker</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
              Detta är en automatisk notifikation från EP-Tracker.<br>
              Du får detta meddelande via e-post eftersom push-notifikationer inte är tillgängliga just nu.
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend directly (to ensure correct API key)
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: profile.full_name ? `${profile.full_name} <${profile.email}>` : profile.email,
      subject: `🔔 ${title}`,
      html: emailHtml,
      replyTo: REPLY_TO_EMAIL,
    });

    if (error) {
      console.error('❌ Failed to send notification email:', error);
      process.exit(1);
    }

    // Log notification
    await supabase.from('notification_log').insert({
      user_id: profile.id,
      type: 'test',
      title,
      body,
      data: {
        test: 'true',
        method: 'email',
      },
    });

    console.log('✅ Test notification sent successfully!');
    console.log(`📧 Method: email`);
    console.log(`📧 Message ID: ${data?.id}`);
    console.log(`📬 Check inbox at: ${email}`);
  } catch (error) {
    console.error('❌ Error testing notification email:', error);
    process.exit(1);
  }
}

testNotificationEmail();
