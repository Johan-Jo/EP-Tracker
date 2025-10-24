-- Migration: Drop and Recreate Billing Tables
-- Description: Completely drops and recreates billing tables with correct structure
-- Date: 2024-10-21

-- =============================================
-- DROP EXISTING TABLES (CASCADE)
-- =============================================

DROP TABLE IF EXISTS subscription_invoices CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS usage_metrics CASCADE;
DROP TABLE IF EXISTS export_batches CASCADE;

-- =============================================
-- CREATE SUBSCRIPTIONS TABLE (CORRECT)
-- =============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days',
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =============================================
-- CREATE PAYMENT_TRANSACTIONS TABLE
-- =============================================

CREATE TABLE payment_transactions (
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

CREATE INDEX idx_payment_transactions_organization ON payment_transactions(organization_id);
CREATE INDEX idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_date ON payment_transactions(transaction_date DESC);

-- =============================================
-- CREATE SUBSCRIPTION_INVOICES TABLE
-- =============================================

CREATE TABLE subscription_invoices (
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

CREATE INDEX idx_subscription_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_subscription_invoices_due_date ON subscription_invoices(due_date);

-- =============================================
-- CREATE USAGE_METRICS TABLE
-- =============================================

CREATE TABLE usage_metrics (
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

CREATE INDEX idx_usage_metrics_organization_date ON usage_metrics(organization_id, metric_date DESC);

-- =============================================
-- CREATE EXPORT_BATCHES TABLE
-- =============================================

CREATE TABLE export_batches (
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

CREATE INDEX idx_export_batches_organization ON export_batches(organization_id);
CREATE INDEX idx_export_batches_created_at ON export_batches(created_at DESC);

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_batches ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

CREATE POLICY "Organizations can view their subscriptions"
ON subscriptions FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage subscriptions"
ON subscriptions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL));

CREATE POLICY "Organizations can view their payments"
ON payment_transactions FOR SELECT TO authenticated
USING (organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can manage payments"
ON payment_transactions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL));

CREATE POLICY "Organizations can view their invoices"
ON subscription_invoices FOR SELECT TO authenticated
USING (subscription_id IN (SELECT id FROM subscriptions WHERE organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())));

CREATE POLICY "Super admins can manage invoices"
ON subscription_invoices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL));

CREATE POLICY "Super admins can view usage metrics"
ON usage_metrics FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL));

CREATE POLICY "Super admins can manage exports"
ON export_batches FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM super_admins sa WHERE sa.user_id = auth.uid() AND sa.revoked_at IS NULL));

-- =============================================
-- DONE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Billing tables recreated successfully!';
  RAISE NOTICE '   Next: Run Stripe columns migration';
END$$;

