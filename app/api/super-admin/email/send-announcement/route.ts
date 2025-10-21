import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { sendBulkAnnouncement } from '@/lib/email/send';
import { rateLimit, RateLimitPresets, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * POST /api/super-admin/email/send-announcement
 * 
 * Send announcement email to selected organizations
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();

    // Rate limit: 20 emails per hour (to prevent spam)
    const rateLimitResult = rateLimit({
      ...RateLimitPresets.EMAIL,
      identifier: `email:${user.user_id}`,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'För många e-postmeddelanden skickade. Försök igen senare.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
    
    const body = await request.json();
    const { organizationIds, subject, message, ctaText, ctaUrl } = body;

    if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
      return NextResponse.json(
        { error: 'organizationIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'subject and message are required' },
        { status: 400 }
      );
    }

    const result = await sendBulkAnnouncement(
      organizationIds,
      subject,
      message,
      ctaText,
      ctaUrl,
      user.id
    );

    return NextResponse.json({
      success: true,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('Error sending announcement:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send announcement',
      },
      { status: 500 }
    );
  }
}

