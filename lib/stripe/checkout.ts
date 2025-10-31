import { stripe, getStripePriceId } from './client';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * Checkout Session Helpers
 * 
 * Functions to create and manage Stripe Checkout sessions.
 */

interface CreateCheckoutSessionParams {
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session
 * 
 * Creates a hosted checkout page for the customer to enter payment details
 * and subscribe to a plan.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const { organizationId, planId, billingCycle, successUrl, cancelUrl } = params;

  const supabase = await createClient();

  // Get organization details
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', organizationId)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  // Get pricing plan details
  const { data: plan, error: planError } = await supabase
    .from('pricing_plans')
    .select('*')
    .eq('id', planId)
    .eq('billing_cycle', billingCycle)
    .single();

  if (planError || !plan) {
    throw new Error('Pricing plan not found');
  }

  // Get Stripe Price ID (from plan or environment)
  const stripePriceId = plan.stripe_price_id || getStripePriceId(plan.name, billingCycle);

  if (!stripePriceId) {
    throw new Error(`No Stripe Price ID configured for plan: ${plan.name} (${billingCycle})`);
  }

  // Create or use existing Stripe customer
  let customerId = org.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: {
        organization_id: organizationId,
      },
    });

    customerId = customer.id;

    // Update organization with Stripe customer ID
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organizationId);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organization_id: organizationId,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
    subscription_data: {
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
      },
      // No trial period - organizations already had their 14-day trial
    },
    // Allow customer to update their address in checkout
    customer_update: {
      address: 'auto',
    },
    // Automatically calculate and add Swedish VAT
    automatic_tax: {
      enabled: true,
    },
    // Allow promotion codes
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Get Checkout Session
 * 
 * Retrieve details of an existing checkout session.
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'subscription'],
  });

  return session;
}

/**
 * Handle Successful Checkout
 * 
 * Called when checkout is completed successfully.
 * Updates the local database with subscription details.
 */
export async function handleSuccessfulCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = await createClient();

  const organizationId = session.metadata?.organization_id;
  const planId = session.metadata?.plan_id;

  if (!organizationId || !planId) {
    throw new Error('Missing metadata in checkout session');
  }

  const subscriptionId = typeof session.subscription === 'string' 
    ? session.subscription 
    : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error('No subscription ID in checkout session');
  }

  // Get the Stripe subscription to get pricing details
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create subscription record
  const now = new Date().toISOString();
  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      organization_id: organizationId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
      cancel_at_period_end: false,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: (stripeSubscription as any).items.data[0]?.price.id,
      stripe_latest_invoice_id: typeof (stripeSubscription as any).latest_invoice === 'string'
        ? (stripeSubscription as any).latest_invoice
        : (stripeSubscription as any).latest_invoice?.id,
      created_at: now,
      updated_at: now,
    });

  if (subError) {
    console.error('Error creating subscription:', subError);
    throw subError;
  }

  // Update organization status
  await supabase
    .from('organizations')
    .update({
      status: 'active',
      updated_at: now,
    })
    .eq('id', organizationId);
}

