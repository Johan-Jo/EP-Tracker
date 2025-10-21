import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createCheckoutSession } from '@/lib/stripe/checkout';

/**
 * POST /api/stripe/create-checkout-session
 * 
 * Create a Stripe Checkout session for an organization to subscribe to a plan.
 * 
 * Super admins can create checkout sessions for any organization.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await requireSuperAdmin();

    const body = await request.json();
    const { organization_id, plan_id, billing_cycle } = body;

    if (!organization_id || !plan_id || !billing_cycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (billing_cycle !== 'monthly' && billing_cycle !== 'annual') {
      return NextResponse.json(
        { success: false, error: 'Invalid billing_cycle (must be "monthly" or "annual")' },
        { status: 400 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

    // Create checkout session
    const session = await createCheckoutSession({
      organizationId: organization_id,
      planId: plan_id,
      billingCycle: billing_cycle,
      successUrl: `${baseUrl}/super-admin/billing/subscriptions?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/super-admin/billing/plans`,
    });

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}

