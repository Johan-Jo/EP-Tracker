import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';

/**
 * Test endpoint to verify Resend email functionality
 * POST /api/test/resend-email
 * Body: { "to": "email@example.com", "testType": "invite" | "verification" | "welcome" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, testType = 'welcome' } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing Resend email to: ${to} (type: ${testType})`);

    let result;

    switch (testType) {
      case 'welcome':
        result = await sendEmail({
          to,
          toName: 'Test User',
          subject: 'Test: Välkommen till EP-Tracker',
          template: 'welcome',
          templateData: {
            userName: 'Test User',
            organizationName: 'Test Organization',
            loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sign-in`,
            supportEmail: 'support@eptracker.app',
          },
          emailType: 'transactional',
        });
        break;

      case 'password-reset':
        result = await sendEmail({
          to,
          toName: 'Test User',
          subject: 'Test: Återställ ditt lösenord',
          template: 'password-reset',
          templateData: {
            userName: 'Test User',
            resetUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=test-token`,
            expiresIn: '1 timme',
            supportEmail: 'support@eptracker.app',
          },
          emailType: 'transactional',
        });
        break;

      case 'announcement':
        result = await sendEmail({
          to,
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
        return NextResponse.json(
          { error: `Unknown test type: ${testType}. Use: welcome, password-reset, or announcement` },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        messageId: result.messageId,
        testType,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Error testing resend email:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if Resend is configured
 */
export async function GET() {
  const hasApiKey = !!process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'EP Tracker <noreply@eptracker.app>';

  return NextResponse.json({
    configured: hasApiKey,
    fromEmail,
    message: hasApiKey
      ? 'Resend is configured. Use POST to send a test email.'
      : '⚠️ RESEND_API_KEY is not set in environment variables.',
  });
}

