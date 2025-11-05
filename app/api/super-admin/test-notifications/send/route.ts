import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { sendNotification } from '@/lib/notifications/send-notification';
import { z } from 'zod';

const sendTestNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().optional().default('/dashboard'),
  skipQuietHours: z.boolean().optional().default(true),
});

/**
 * POST /api/super-admin/test-notifications/send
 * Send a test notification to a user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await requireSuperAdmin();

    const body = await request.json();
    const validatedData = sendTestNotificationSchema.parse(body);

    console.log(`🧪 [Test Notification] Sending to user ${validatedData.userId}`);

    const result = await sendNotification({
      userId: validatedData.userId,
      type: validatedData.type,
      title: validatedData.title,
      body: validatedData.body,
      url: validatedData.url || '/dashboard',
      skipQuietHours: validatedData.skipQuietHours ?? true,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to send notification. Check server logs for details.' },
        { status: 500 }
      );
    }

    const messageId = (result as any).messageId || (result as any).successCount ? 'sent' : null;

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      messageId,
      method: (result as any).method || 'firebase',
    });
  } catch (error) {
    console.error('❌ Error sending test notification:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: `Validation error: ${error.issues[0].message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

