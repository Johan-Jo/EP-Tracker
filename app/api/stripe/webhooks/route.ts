import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/stripe/webhooks';

/**
 * POST /api/stripe/webhooks
 * 
 * Stripe webhook endpoint for receiving payment events.
 * 
 * This endpoint is called by Stripe when events occur (payment succeeded,
 * subscription updated, etc.). It verifies the signature and processes the event.
 * 
 * IMPORTANT: This route must handle raw body for signature verification.
 */

// Disable Next.js body parsing to get raw body
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const body = await request.text();

    // Get Stripe signature from headers
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify and construct the event
    const event = verifyWebhookSignature(body, signature, webhookSecret);

    console.log(`📨 Received webhook: ${event.type} (${event.id})`);

    // Handle the event
    await handleWebhookEvent(event);

    // Return success response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);

    // Return error response
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 400 }
    );
  }
}

