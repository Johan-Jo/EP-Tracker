// Test Resend Email - Send test email to specified address
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { sendEmail } from '../lib/email/send';

async function testResendEmail() {
  const email = process.argv[2] || 'hej@johan.com.br';
  const testType = (process.argv[3] as any) || 'welcome';

  console.log(`🧪 Testing Resend email to: ${email} (type: ${testType})`);

  try {
    let result;

    switch (testType) {
      case 'welcome':
        result = await sendEmail({
          to: email,
          toName: 'Test User',
          subject: 'Test: Välkommen till EP-Tracker',
          template: 'welcome',
          templateData: {
            userName: 'Test User',
            organizationName: 'Test Organization',
            loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sign-in`,
            supportEmail: 'support@eptracker.se',
          },
          emailType: 'transactional',
        });
        break;

      case 'password-reset':
        result = await sendEmail({
          to: email,
          toName: 'Test User',
          subject: 'Test: Återställ ditt lösenord',
          template: 'password-reset',
          templateData: {
            userName: 'Test User',
            resetUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=test-token`,
            expiresIn: '1 timme',
            supportEmail: 'support@eptracker.se',
          },
          emailType: 'transactional',
        });
        break;

      case 'announcement':
        result = await sendEmail({
          to: email,
          toName: 'Test User',
          subject: 'Test: Meddelande från EP-Tracker',
          template: 'announcement',
          templateData: {
            organizationName: 'Test Organization',
            subject: 'Test: Meddelande från EP-Tracker',
            message: 'Detta är ett testmeddelande för att verifiera att Resend-integrationen fungerar korrekt.',
            ctaText: 'Gå till dashboard',
            ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
          },
          emailType: 'announcement',
        });
        break;

      default:
        console.error(`❌ Unknown test type: ${testType}. Use: welcome, password-reset, or announcement`);
        process.exit(1);
    }

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log(`📬 Check inbox at: ${email}`);
    } else {
      console.error('❌ Failed to send email:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing resend email:', error);
    process.exit(1);
  }
}

testResendEmail();

