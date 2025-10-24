-- Migration: Fix Billing Tables (Add Missing Columns)
-- Description: Adds any missing columns to existing tables
-- Date: 2024-10-21

-- =============================================
-- 1. FIX SUBSCRIPTIONS TABLE
-- =============================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add organization_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='organization_id') THEN
    ALTER TABLE subscriptions ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Add plan_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='plan_id') THEN
    ALTER TABLE subscriptions ADD COLUMN plan_id UUID NOT NULL REFERENCES pricing_plans(id);
  END IF;

  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='status') THEN
    ALTER TABLE subscriptions ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial'));
  END IF;

  -- Add current_period_start if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='current_period_start') THEN
    ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;

  -- Add current_period_end if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='current_period_end') THEN
    ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 days';
  END IF;

  -- Add cancel_at_period_end if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='cancel_at_period_end') THEN
    ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT false;
  END IF;

  -- Add cancelled_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='subscriptions' AND column_name='cancelled_at') THEN
    ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;

  RAISE NOTICE '✅ Subscriptions table columns updated';
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- =============================================
-- 2. FIX PAYMENT_TRANSACTIONS TABLE
-- =============================================

DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_name='payment_transactions') THEN
    -- Add organization_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='organization_id') THEN
      ALTER TABLE payment_transactions ADD COLUMN organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add subscription_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='subscription_id') THEN
      ALTER TABLE payment_transactions ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
    END IF;

    -- Add amount if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='amount') THEN
      ALTER TABLE payment_transactions ADD COLUMN amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    -- Add currency if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='currency') THEN
      ALTER TABLE payment_transactions ADD COLUMN currency VARCHAR(3) DEFAULT 'SEK';
    END IF;

    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='status') THEN
      ALTER TABLE payment_transactions ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('successful', 'failed', 'pending', 'refunded'));
    END IF;

    -- Add payment_method if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='payment_method') THEN
      ALTER TABLE payment_transactions ADD COLUMN payment_method VARCHAR(50);
    END IF;

    -- Add transaction_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='payment_transactions' AND column_name='transaction_date') THEN
      ALTER TABLE payment_transactions ADD COLUMN transaction_date TIMESTAMPTZ DEFAULT now();
    END IF;

    RAISE NOTICE '✅ Payment transactions table columns updated';
  ELSE
    RAISE NOTICE '⚠ Payment transactions table does not exist, skipping';
  END IF;
END $$;

-- Add indexes (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_organization ON payment_transactions(organization_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date DESC);
  END IF;
END $$;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_transactions') THEN
    ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Subscriptions policies
DROP POLICY IF EXISTS "Organizations can view their subscriptions" ON subscriptions;
CREATE POLICY "Organizations can view their subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM memberships
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

-- Payment Transactions policies (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='payment_transactions') THEN
    DROP POLICY IF EXISTS "Organizations can view their payments" ON payment_transactions;
    CREATE POLICY "Organizations can view their payments"
    ON payment_transactions FOR SELECT
    TO authenticated
    USING (
      organization_id IN (
        SELECT organization_id FROM memberships
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
  END IF;
END $$;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Billing tables fixed successfully!';
  RAISE NOTICE '   Tables: subscriptions, payment_transactions';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next: Run Stripe columns migration';
END$$;

