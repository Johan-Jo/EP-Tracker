-- Migration: Add Stripe Integration Columns
-- Description: Add columns to store Stripe customer, subscription, and payment IDs
-- Date: 2024-10-21
-- EPIC: 15 - Stripe Integration

-- =============================================
-- 1. ADD STRIPE CUSTOMER ID TO ORGANIZATIONS
-- =============================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE;

COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON organizations(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- =============================================
-- 2. ADD STRIPE IDS TO SUBSCRIPTIONS
-- =============================================

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id VARCHAR(255);

COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Stripe Price ID (price_xxx)';
COMMENT ON COLUMN subscriptions.stripe_latest_invoice_id IS 'Stripe Invoice ID (in_xxx)';

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription 
ON subscriptions(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_price 
ON subscriptions(stripe_price_id) 
WHERE stripe_price_id IS NOT NULL;

-- =============================================
-- 3. ADD STRIPE IDS TO PAYMENT_TRANSACTIONS
-- =============================================

ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

COMMENT ON COLUMN payment_transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_xxx)';
COMMENT ON COLUMN payment_transactions.stripe_invoice_id IS 'Stripe Invoice ID (in_xxx)';
COMMENT ON COLUMN payment_transactions.stripe_charge_id IS 'Stripe Charge ID (ch_xxx)';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_payment_intent 
ON payment_transactions(stripe_payment_intent_id) 
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_invoice 
ON payment_transactions(stripe_invoice_id) 
WHERE stripe_invoice_id IS NOT NULL;

-- =============================================
-- 4. ADD STRIPE PRICE IDS TO PRICING_PLANS
-- =============================================

ALTER TABLE pricing_plans
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255);

COMMENT ON COLUMN pricing_plans.stripe_price_id IS 'Stripe Price ID (price_xxx) - maps to this plan';
COMMENT ON COLUMN pricing_plans.stripe_product_id IS 'Stripe Product ID (prod_xxx)';

CREATE INDEX IF NOT EXISTS idx_pricing_plans_stripe_price 
ON pricing_plans(stripe_price_id) 
WHERE stripe_price_id IS NOT NULL;

-- =============================================
-- 5. CREATE WEBHOOK LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE stripe_webhook_events IS 'Log of all Stripe webhook events received';
COMMENT ON COLUMN stripe_webhook_events.event_id IS 'Stripe Event ID (evt_xxx) - ensures idempotency';
COMMENT ON COLUMN stripe_webhook_events.processed IS 'Whether the event was successfully processed';
COMMENT ON COLUMN stripe_webhook_events.error IS 'Error message if processing failed';

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
ON stripe_webhook_events(event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type 
ON stripe_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed 
ON stripe_webhook_events(processed);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at 
ON stripe_webhook_events(created_at DESC);

-- =============================================
-- 6. RLS POLICIES FOR WEBHOOK EVENTS
-- =============================================

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Super admins can view all webhook events
CREATE POLICY "Super admins can view webhook events"
ON stripe_webhook_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
  )
);

-- Service role can insert webhook events (for webhook endpoint)
CREATE POLICY "Service role can insert webhook events"
ON stripe_webhook_events
FOR INSERT
TO service_role
WITH CHECK (true);

-- Super admins can update webhook events (mark as processed, fix errors)
CREATE POLICY "Super admins can update webhook events"
ON stripe_webhook_events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins
    WHERE super_admins.user_id = auth.uid()
  )
);

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to get organization by Stripe customer ID
CREATE OR REPLACE FUNCTION get_org_by_stripe_customer(customer_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id
  FROM organizations
  WHERE stripe_customer_id = customer_id
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

COMMENT ON FUNCTION get_org_by_stripe_customer IS 'Get organization ID by Stripe customer ID';

-- Function to get subscription by Stripe subscription ID
CREATE OR REPLACE FUNCTION get_subscription_by_stripe_id(subscription_id TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_id UUID;
BEGIN
  SELECT id INTO sub_id
  FROM subscriptions
  WHERE stripe_subscription_id = subscription_id
  LIMIT 1;
  
  RETURN sub_id;
END;
$$;

COMMENT ON FUNCTION get_subscription_by_stripe_id IS 'Get subscription ID by Stripe subscription ID';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Stripe integration columns added successfully!';
  RAISE NOTICE '   - Organizations: stripe_customer_id';
  RAISE NOTICE '   - Subscriptions: stripe_subscription_id, stripe_price_id, stripe_latest_invoice_id';
  RAISE NOTICE '   - Payment Transactions: stripe_payment_intent_id, stripe_invoice_id, stripe_charge_id';
  RAISE NOTICE '   - Pricing Plans: stripe_price_id, stripe_product_id';
  RAISE NOTICE '   - New Table: stripe_webhook_events (for event logging)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Create products and prices in Stripe Dashboard';
  RAISE NOTICE '   2. Update pricing_plans table with stripe_price_id values';
  RAISE NOTICE '   3. Configure webhook endpoint in Stripe Dashboard';
  RAISE NOTICE '   4. Add Stripe API keys to environment variables';
END$$;

