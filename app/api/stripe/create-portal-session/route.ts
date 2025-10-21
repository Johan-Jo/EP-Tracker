import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/create-portal-session
 * 
 * Create a Stripe Customer Portal session for self-service billing management.
 * 
 * The customer portal allows users to:
 * - Update payment methods
 * - View invoices
 * - Cancel subscriptions
 * - Update billing information
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin access
    await requireSuperAdmin();

    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { success: false, error: 'Missing organization_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get organization with Stripe customer ID
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stripe_customer_id')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: 'Organization does not have a Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${baseUrl}/super-admin/organizations/${organization_id}`,
    });

    return NextResponse.json({
      success: true,
      portal_url: session.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      },
      { status: 500 }
    );
  }
}

