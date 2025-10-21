import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { sendBulkAnnouncement } from '@/lib/email/send';

/**
 * POST /api/super-admin/email/send-announcement
 * 
 * Send announcement email to selected organizations
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSuperAdmin();
    
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

