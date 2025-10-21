-- Phase 2: Super Admin & Billing System Schema (SAFE VERSION)
-- This version uses IF NOT EXISTS to avoid conflicts with existing objects

-- ============================================================================
-- 1. Super Admin Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'super_admins_user_id_key'
  ) THEN
    ALTER TABLE super_admins ADD CONSTRAINT super_admins_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_revoked ON super_admins(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- 2. Pricing Plans Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_sek DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_users INTEGER NOT NULL,
  max_storage_gb INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_plans_name_key'
  ) THEN
    ALTER TABLE pricing_plans ADD CONSTRAINT pricing_plans_name_key UNIQUE (name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_plans_price ON pricing_plans(price_sek);

-- ============================================================================
-- 3. Subscriptions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 month'),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check 
      CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'suspended'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_org_id_key'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_org_id_key UNIQUE (org_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- 4. Payments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_sek DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SEK',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  invoice_number TEXT,
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_status_check 
      CHECK (status IN ('pending', 'paid', 'failed', 'refunded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

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

CREATE INDEX IF NOT EXISTS idx_audit_super_admin ON super_admin_audit_log(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON super_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_target ON super_admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON super_admin_audit_log(created_at DESC);

-- ============================================================================
-- 6. Feature Flags Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_by UUID REFERENCES super_admins(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feature_flags_flag_name_key'
  ) THEN
    ALTER TABLE feature_flags ADD CONSTRAINT feature_flags_flag_name_key UNIQUE (flag_name);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;

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

-- ============================================================================
-- 8. Update Organizations Table
-- ============================================================================
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'plan_id') THEN
    ALTER TABLE organizations ADD COLUMN plan_id UUID REFERENCES pricing_plans(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'status') THEN
    ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'storage_used_bytes') THEN
    ALTER TABLE organizations ADD COLUMN storage_used_bytes BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'deleted_at') THEN
    ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
  -- Add constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_status_check') THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_status_check 
      CHECK (status IN ('active', 'trial', 'suspended', 'deleted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON organizations(trial_ends_at) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 9. Auto-Update Triggers (idempotent)
-- ============================================================================

-- Pricing plans trigger
CREATE OR REPLACE FUNCTION update_pricing_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pricing_plans_updated_at ON pricing_plans;
CREATE TRIGGER pricing_plans_updated_at
  BEFORE UPDATE ON pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_plans_updated_at();

-- Subscriptions trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- Payments trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- ============================================================================
-- 10. Helper Functions (idempotent)
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
  SELECT COUNT(*) INTO v_current_users
  FROM memberships
  WHERE org_id = org_uuid;
  
  SELECT pp.max_users, pp.max_storage_gb
  INTO v_max_users, v_max_storage_gb
  FROM organizations o
  JOIN pricing_plans pp ON o.plan_id = pp.id
  WHERE o.id = org_uuid;
  
  SELECT COALESCE(o.storage_used_bytes::numeric / 1073741824, 0)
  INTO v_current_storage_gb
  FROM organizations o
  WHERE o.id = org_uuid;
  
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
-- 11. RLS Policies (idempotent)
-- ============================================================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;
DROP POLICY IF EXISTS "Super admins can manage super admins" ON super_admins;
DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON pricing_plans;
DROP POLICY IF EXISTS "Super admins can manage pricing plans" ON pricing_plans;
DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Org admins can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Super admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Org admins can view own payments" ON payments;
DROP POLICY IF EXISTS "Super admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Super admins can view audit log" ON super_admin_audit_log;
DROP POLICY IF EXISTS "Super admins can create audit entries" ON super_admin_audit_log;
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Super admins can manage feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Super admins can view maintenance mode" ON maintenance_mode;
DROP POLICY IF EXISTS "Super admins can manage maintenance mode" ON maintenance_mode;

-- Recreate policies
CREATE POLICY "Super admins can view all super admins" ON super_admins FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage super admins" ON super_admins FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Anyone can view active pricing plans" ON pricing_plans FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Super admins can manage pricing plans" ON pricing_plans FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view all subscriptions" ON subscriptions FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Org admins can view own subscription" ON subscriptions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships WHERE memberships.org_id = subscriptions.org_id AND memberships.user_id = auth.uid() AND memberships.role IN ('admin', 'finance'))
);
CREATE POLICY "Super admins can manage subscriptions" ON subscriptions FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view all payments" ON payments FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Org admins can view own payments" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM memberships WHERE memberships.org_id = payments.org_id AND memberships.user_id = auth.uid() AND memberships.role IN ('admin', 'finance'))
);
CREATE POLICY "Super admins can manage payments" ON payments FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view audit log" ON super_admin_audit_log FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can create audit entries" ON super_admin_audit_log FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Anyone can view feature flags" ON feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage feature flags" ON feature_flags FOR ALL TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view maintenance mode" ON maintenance_mode FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can manage maintenance mode" ON maintenance_mode FOR ALL TO authenticated USING (is_super_admin(auth.uid()));

-- ============================================================================
-- 12. Initial Data
-- ============================================================================

-- Insert initial maintenance mode record
INSERT INTO maintenance_mode (is_active, message)
VALUES (false, 'System under maintenance. We''ll be back soon!')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin & Billing Schema migration complete (safe version)';
  RAISE NOTICE 'Tables ready: super_admins, pricing_plans, subscriptions, payments, audit_log, feature_flags, maintenance_mode';
  RAISE NOTICE 'Organizations table updated with: plan_id, status, storage_used_bytes, trial_ends_at, deleted_at';
  RAISE NOTICE 'Next step: Run 20241021000000_pricing_plans_seed.sql to populate pricing plans';
END $$;

