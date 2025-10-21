-- Phase 2: Super Admin & Billing System Schema
-- Creates tables for: pricing plans, subscriptions, payments, super admins, audit logs

-- ============================================================================
-- 1. Super Admin Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX idx_super_admins_revoked ON super_admins(revoked_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE super_admins IS 'Platform super administrators (site owners)';
COMMENT ON COLUMN super_admins.user_id IS 'Reference to auth.users - the super admin account';
COMMENT ON COLUMN super_admins.granted_by IS 'Which super admin granted this privilege';
COMMENT ON COLUMN super_admins.revoked_at IS 'When super admin access was revoked (null = active)';

-- ============================================================================
-- 2. Pricing Plans Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_sek DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL,
  max_storage_gb INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pricing_plans_active ON pricing_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_pricing_plans_price ON pricing_plans(price_sek);

COMMENT ON TABLE pricing_plans IS 'SaaS pricing tiers (Free Trial, Basic, Pro, Enterprise)';
COMMENT ON COLUMN pricing_plans.price_sek IS 'Monthly price in Swedish Kronor (SEK)';
COMMENT ON COLUMN pricing_plans.max_users IS 'Maximum users allowed on this plan';
COMMENT ON COLUMN pricing_plans.max_storage_gb IS 'Maximum storage in gigabytes';
COMMENT ON COLUMN pricing_plans.features IS 'JSON object with feature flags for this plan';

-- ============================================================================
-- 3. Subscriptions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 month'),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_ends ON subscriptions(trial_ends_at) WHERE status = 'trial';
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

COMMENT ON TABLE subscriptions IS 'Organization subscriptions to pricing plans';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: trial, active, past_due, canceled, suspended';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'When trial period ends (null if not on trial)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for payment tracking';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID';

-- ============================================================================
-- 4. Payments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_sek DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SEK',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  invoice_number TEXT,
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_org ON payments(org_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

COMMENT ON TABLE payments IS 'Payment transactions for subscriptions';
COMMENT ON COLUMN payments.amount_sek IS 'Payment amount in SEK';
COMMENT ON COLUMN payments.status IS 'Payment status: pending, paid, failed, refunded';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN payments.stripe_invoice_id IS 'Stripe Invoice ID';
COMMENT ON COLUMN payments.invoice_number IS 'Human-readable invoice number';

-- ============================================================================
-- 5. Super Admin Audit Log
-- ============================================================================
CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_super_admin ON super_admin_audit_log(super_admin_id);
CREATE INDEX idx_audit_action ON super_admin_audit_log(action);
CREATE INDEX idx_audit_target ON super_admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_created ON super_admin_audit_log(created_at DESC);

COMMENT ON TABLE super_admin_audit_log IS 'Audit trail of all super admin actions';
COMMENT ON COLUMN super_admin_audit_log.action IS 'Action performed: impersonate, suspend_org, delete_org, etc.';
COMMENT ON COLUMN super_admin_audit_log.target_type IS 'Type of entity affected: organization, user, subscription';
COMMENT ON COLUMN super_admin_audit_log.target_id IS 'ID of the affected entity';
COMMENT ON COLUMN super_admin_audit_log.details IS 'Additional context about the action';

-- ============================================================================
-- 6. Feature Flags Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_by UUID REFERENCES super_admins(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;

COMMENT ON TABLE feature_flags IS 'Global feature toggles for the platform';
COMMENT ON COLUMN feature_flags.flag_name IS 'Unique feature flag identifier (e.g. "beta_analytics")';
COMMENT ON COLUMN feature_flags.is_enabled IS 'Whether the feature is currently enabled';

-- ============================================================================
-- 7. Maintenance Mode Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT false,
  message TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  enabled_by UUID REFERENCES super_admins(id),
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE maintenance_mode IS 'Site-wide maintenance mode configuration';
COMMENT ON COLUMN maintenance_mode.is_active IS 'Whether maintenance mode is currently active';
COMMENT ON COLUMN maintenance_mode.message IS 'Message displayed to users during maintenance';

-- ============================================================================
-- 8. Update Organizations Table
-- ============================================================================

-- Add new columns to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES pricing_plans(id),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'deleted')),
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON organizations(trial_ends_at) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN organizations.plan_id IS 'Current pricing plan (references pricing_plans)';
COMMENT ON COLUMN organizations.status IS 'Organization status: active, trial, suspended, deleted';
COMMENT ON COLUMN organizations.storage_used_bytes IS 'Total storage used in bytes';
COMMENT ON COLUMN organizations.trial_ends_at IS 'When trial period ends (null if not on trial)';
COMMENT ON COLUMN organizations.deleted_at IS 'Soft delete timestamp (30-day grace period)';

-- ============================================================================
-- 9. Auto-Update Triggers
-- ============================================================================

-- Trigger for updated_at on pricing_plans
CREATE OR REPLACE FUNCTION update_pricing_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_plans_updated_at();

-- Trigger for updated_at on subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Trigger for updated_at on payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- ============================================================================
-- 10. Helper Functions
-- ============================================================================

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = user_uuid 
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization's current plan details
CREATE OR REPLACE FUNCTION get_org_plan(org_uuid UUID)
RETURNS TABLE (
  plan_name TEXT,
  max_users INTEGER,
  max_storage_gb INTEGER,
  price_sek DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.name,
    pp.max_users,
    pp.max_storage_gb,
    pp.price_sek
  FROM organizations o
  JOIN pricing_plans pp ON o.plan_id = pp.id
  WHERE o.id = org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if organization is within limits
CREATE OR REPLACE FUNCTION check_org_limits(org_uuid UUID)
RETURNS TABLE (
  within_user_limit BOOLEAN,
  within_storage_limit BOOLEAN,
  current_users INTEGER,
  max_users INTEGER,
  current_storage_gb NUMERIC,
  max_storage_gb INTEGER
) AS $$
DECLARE
  v_current_users INTEGER;
  v_max_users INTEGER;
  v_current_storage_gb NUMERIC;
  v_max_storage_gb INTEGER;
BEGIN
  -- Get current user count
  SELECT COUNT(*) INTO v_current_users
  FROM memberships
  WHERE org_id = org_uuid;
  
  -- Get plan limits
  SELECT pp.max_users, pp.max_storage_gb
  INTO v_max_users, v_max_storage_gb
  FROM organizations o
  JOIN pricing_plans pp ON o.plan_id = pp.id
  WHERE o.id = org_uuid;
  
  -- Get current storage usage (in GB)
  SELECT COALESCE(o.storage_used_bytes::numeric / 1073741824, 0)
  INTO v_current_storage_gb
  FROM organizations o
  WHERE o.id = org_uuid;
  
  -- Return comparison
  RETURN QUERY SELECT
    v_current_users <= v_max_users,
    v_current_storage_gb <= v_max_storage_gb,
    v_current_users,
    v_max_users,
    v_current_storage_gb,
    v_max_storage_gb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. RLS Policies for Super Admin Tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Super admins: Only super admins can view/manage
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super admins"
  ON super_admins FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Pricing plans: Super admins can manage, everyone can view active plans
CREATE POLICY "Anyone can view active pricing plans"
  ON pricing_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Super admins can manage pricing plans"
  ON pricing_plans FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Subscriptions: Super admins see all, orgs see their own
CREATE POLICY "Super admins can view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = subscriptions.org_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'finance')
    )
  );

CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Payments: Super admins see all, orgs see their own
CREATE POLICY "Super admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = payments.org_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('admin', 'finance')
    )
  );

CREATE POLICY "Super admins can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Audit log: Super admins only
CREATE POLICY "Super admins can view audit log"
  ON super_admin_audit_log FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create audit entries"
  ON super_admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Feature flags: Super admins manage, everyone can view
CREATE POLICY "Anyone can view feature flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can manage feature flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Maintenance mode: Super admins only
CREATE POLICY "Super admins can view maintenance mode"
  ON maintenance_mode FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage maintenance mode"
  ON maintenance_mode FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Insert initial maintenance mode record
INSERT INTO maintenance_mode (is_active, message)
VALUES (false, 'System under maintenance. We''ll be back soon!')
ON CONFLICT DO NOTHING;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Super Admin & Billing Schema migration complete';
  RAISE NOTICE 'Tables created: super_admins, pricing_plans, subscriptions, payments, audit_log, feature_flags, maintenance_mode';
  RAISE NOTICE 'Organizations table updated with: plan_id, status, storage_used_bytes, trial_ends_at, deleted_at';
  RAISE NOTICE 'Next step: Run 20241021000000_pricing_plans_seed.sql to populate pricing plans';
END $$;

