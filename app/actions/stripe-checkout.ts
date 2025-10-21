'use server';

import { createCheckoutSession } from '@/lib/stripe/checkout';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';

export async function initiateCheckout(organizationId: string, planId: string, billingCycle: 'monthly' | 'annual') {
  try {
    // Verify super admin access
    await requireSuperAdmin();

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Create checkout session
    const session = await createCheckoutSession({
      organizationId,
      planId,
      billingCycle,
      successUrl: `${baseUrl}/super-admin/organizations/${organizationId}?tab=billing&success=true`,
      cancelUrl: `${baseUrl}/super-admin/organizations/${organizationId}?tab=billing&cancelled=true`,
    });

    if (!session.url) {
      throw new Error('No checkout URL returned from Stripe');
    }

    // Redirect to Stripe Checkout
    redirect(session.url);
  } catch (error) {
    console.error('Error initiating checkout:', error);
    throw error;
  }
}

