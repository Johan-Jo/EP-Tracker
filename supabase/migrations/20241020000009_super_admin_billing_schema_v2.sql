-- Migration: Super Admin & Billing Schema (SAFE VERSION)
-- Description: Creates all tables for super admin panel and billing system
-- Date: 2024-10-20
-- EPIC: 11 - Billing Management
-- Note: This version safely handles existing objects

-- =============================================
-- 1. SUPER ADMINS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id) WHERE revoked_at IS NULL;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 2. PRICING PLANS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_sek DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  max_users INT NOT NULL,
  max_storage_gb INT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, billing_cycle)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_pricing_plans_active ON pricing_plans(is_active) WHERE is_active = true;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 3. SUBSCRIPTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 4. PAYMENT TRANSACTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SEK',
  status VARCHAR(50) NOT NULL CHECK (status IN ('successful', 'failed', 'pending', 'refunded')),
  payment_method VARCHAR(50),
  transaction_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization ON payment_transactions(organization_id);
  CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
  CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
  CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date DESC);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 5. SUBSCRIPTION INVOICES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'SEK',
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
  CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);
  CREATE INDEX IF NOT EXISTS idx_subscription_invoices_due_date ON subscription_invoices(due_date);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 6. USAGE METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  active_users INT DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  time_entries_count INT DEFAULT 0,
  materials_count INT DEFAULT 0,
  expenses_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, metric_date)
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_usage_metrics_organization_date ON usage_metrics(organization_id, metric_date DESC);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- 7. EXPORT BATCHES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS export_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('salary', 'invoice', 'materials', 'expenses')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT,
  record_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_export_batches_organization ON export_batches(organization_id);
  CREATE INDEX IF NOT EXISTS idx_export_batches_created_at ON export_batches(created_at DESC);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_batches ENABLE ROW LEVEL SECURITY;

-- Super Admins policies
DROP POLICY IF EXISTS "Super admins can view all super admins" ON super_admins;
CREATE POLICY "Super admins can view all super admins"
ON super_admins FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "Super admins can grant/revoke super admin" ON super_admins;
CREATE POLICY "Super admins can grant/revoke super admin"
ON super_admins FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

-- Pricing Plans policies (public read, super admin write)
DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON pricing_plans;
CREATE POLICY "Anyone can view active pricing plans"
ON pricing_plans FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage pricing plans" ON pricing_plans;
CREATE POLICY "Super admins can manage pricing plans"
ON pricing_plans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

-- Subscriptions policies
DROP POLICY IF EXISTS "Organizations can view their subscriptions" ON subscriptions;
CREATE POLICY "Organizations can view their subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Super admins can view all subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;
CREATE POLICY "Super admins can manage subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

-- Payment Transactions policies
DROP POLICY IF EXISTS "Organizations can view their payments" ON payment_transactions;
CREATE POLICY "Organizations can view their payments"
ON payment_transactions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Super admins can view all payments" ON payment_transactions;
CREATE POLICY "Super admins can view all payments"
ON payment_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "Super admins can manage payments" ON payment_transactions;
CREATE POLICY "Super admins can manage payments"
ON payment_transactions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

-- Similar policies for other tables...
DROP POLICY IF EXISTS "Organizations can view their invoices" ON subscription_invoices;
CREATE POLICY "Organizations can view their invoices"
ON subscription_invoices FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT id FROM subscriptions WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Super admins can manage all invoices" ON subscription_invoices;
CREATE POLICY "Super admins can manage all invoices"
ON subscription_invoices FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "Super admins can view all usage metrics" ON usage_metrics;
CREATE POLICY "Super admins can view all usage metrics"
ON usage_metrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

DROP POLICY IF EXISTS "Super admins can manage exports" ON export_batches;
CREATE POLICY "Super admins can manage exports"
ON export_batches FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM super_admins sa
    WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL
  )
);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin & Billing schema applied successfully!';
  RAISE NOTICE '   Tables: super_admins, pricing_plans, subscriptions, payment_transactions';
  RAISE NOTICE '   Tables: subscription_invoices, usage_metrics, export_batches';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next: Run Stripe columns migration';
END$$;

