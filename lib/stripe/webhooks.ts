import Stripe from 'stripe';
import { stripe } from './client';
import { createClient } from '@/lib/supabase/server';

/**
 * Stripe Webhook Handlers
 * 
 * Process Stripe webhook events and update the local database.
 */

/**
 * Verify Webhook Signature
 * 
 * Ensures the webhook event is authentic and sent by Stripe.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err);
    throw new Error('Invalid signature');
  }
}

/**
 * Log Webhook Event
 * 
 * Store webhook event in database for debugging and idempotency.
 */
async function logWebhookEvent(event: Stripe.Event, processed: boolean, error?: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      event_type: event.type,
      event_data: event.data.object as any,
      processed,
      processed_at: processed ? new Date().toISOString() : null,
      error: error || null,
    });
}

/**
 * Check if Event Already Processed
 * 
 * Prevents duplicate processing of the same webhook event.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('event_id', eventId)
    .eq('processed', true)
    .maybeSingle();

  return !!data && !error;
}

/**
 * Handle Webhook Event
 * 
 * Routes events to appropriate handlers.
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // Check if already processed
  if (await isEventProcessed(event.id)) {
    console.log(`✅ Event ${event.id} already processed, skipping`);
    return;
  }

  console.log(`📨 Processing webhook event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`⚠️  Unhandled event type: ${event.type}`);
    }

    // Log as processed
    await logWebhookEvent(event, true);
    console.log(`✅ Successfully processed event: ${event.type}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error processing event ${event.type}:`, error);
    await logWebhookEvent(event, false, errorMessage);
    throw error;
  }
}

/**
 * Handle: checkout.session.completed
 * 
 * When a customer completes checkout and creates a subscription.
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const supabase = await createClient();

  const organizationId = session.metadata?.organization_id;
  if (!organizationId) {
    throw new Error('Missing organization_id in checkout session metadata');
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error('No subscription in checkout session');
  }

  // Get the full subscription object from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Get plan ID from metadata
  const planId = session.metadata?.plan_id;
  if (!planId) {
    throw new Error('Missing plan_id in checkout session metadata');
  }

  // Create or update subscription
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      organization_id: organizationId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: false,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: subscription.items.data[0]?.price.id,
      stripe_latest_invoice_id: typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id,
      updated_at: now,
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) throw error;

  // Update organization status to active
  await supabase
    .from('organizations')
    .update({
      status: 'active',
      updated_at: now,
    })
    .eq('id', organizationId);
}

/**
 * Handle: invoice.paid
 * 
 * When a subscription payment succeeds.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient();

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    console.log('Invoice not associated with a subscription, skipping');
    return;
  }

  // Get subscription from database
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.error(`Subscription not found for Stripe subscription: ${subscriptionId}`);
    return;
  }

  // Record payment
  const now = new Date().toISOString();
  await supabase
    .from('payment_transactions')
    .insert({
      organization_id: subscription.organization_id,
      subscription_id: subscription.plan_id, // This might need fixing - should be subscription ID not plan ID
      amount: invoice.amount_paid / 100, // Convert from cents to SEK
      currency: 'SEK',
      status: 'successful',
      payment_method: 'stripe',
      stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id,
      stripe_invoice_id: invoice.id,
      stripe_charge_id: typeof invoice.charge === 'string'
        ? invoice.charge
        : invoice.charge?.id,
      created_at: now,
      updated_at: now,
    });

  // Update subscription status
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      stripe_latest_invoice_id: invoice.id,
      updated_at: now,
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Ensure organization is active
  await supabase
    .from('organizations')
    .update({
      status: 'active',
      updated_at: now,
    })
    .eq('id', subscription.organization_id);
}

/**
 * Handle: invoice.payment_failed
 * 
 * When a subscription payment fails.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const supabase = await createClient();

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) {
    console.log('Invoice not associated with a subscription, skipping');
    return;
  }

  // Get subscription from database
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('organization_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!subscription) {
    console.error(`Subscription not found for Stripe subscription: ${subscriptionId}`);
    return;
  }

  // Record failed payment
  const now = new Date().toISOString();
  await supabase
    .from('payment_transactions')
    .insert({
      organization_id: subscription.organization_id,
      subscription_id: subscription.plan_id,
      amount: invoice.amount_due / 100,
      currency: 'SEK',
      status: 'failed',
      payment_method: 'stripe',
      stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id,
      stripe_invoice_id: invoice.id,
      created_at: now,
      updated_at: now,
    });

  // Update subscription status to past_due
  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: now,
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Optionally: Send notification email to customer
  console.log(`⚠️  Payment failed for organization: ${subscription.organization_id}`);
}

/**
 * Handle: customer.subscription.updated
 * 
 * When a subscription is updated (plan change, renewal, etc).
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient();

  // Find local subscription
  const { data: localSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!localSub) {
    console.error(`Subscription not found for Stripe subscription: ${subscription.id}`);
    return;
  }

  // Map Stripe status to our status
  let status: string = subscription.status;
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    status = 'active';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'cancelled';
  }

  // Update subscription
  const now = new Date().toISOString();
  await supabase
    .from('subscriptions')
    .update({
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_price_id: subscription.items.data[0]?.price.id,
      stripe_latest_invoice_id: typeof subscription.latest_invoice === 'string'
        ? subscription.latest_invoice
        : subscription.latest_invoice?.id,
      updated_at: now,
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update organization status
  const orgStatus = status === 'active' ? 'active' : status === 'cancelled' ? 'suspended' : 'active';
  await supabase
    .from('organizations')
    .update({
      status: orgStatus,
      updated_at: now,
    })
    .eq('id', localSub.organization_id);
}

/**
 * Handle: customer.subscription.deleted
 * 
 * When a subscription is cancelled.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const supabase = await createClient();

  // Find local subscription
  const { data: localSub } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!localSub) {
    console.error(`Subscription not found for Stripe subscription: ${subscription.id}`);
    return;
  }

  // Update subscription status
  const now = new Date().toISOString();
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancel_at_period_end: false,
      updated_at: now,
    })
    .eq('stripe_subscription_id', subscription.id);

  // Suspend organization
  await supabase
    .from('organizations')
    .update({
      status: 'suspended',
      updated_at: now,
    })
    .eq('id', localSub.organization_id);
}

