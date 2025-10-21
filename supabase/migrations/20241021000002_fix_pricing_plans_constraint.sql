-- =====================================================
-- Fix pricing_plans unique constraint
-- Should be on (name, billing_cycle) not just name
-- =====================================================

-- Drop the old constraint
ALTER TABLE pricing_plans DROP CONSTRAINT IF EXISTS pricing_plans_name_key;

-- Add new compound unique constraint
ALTER TABLE pricing_plans 
ADD CONSTRAINT pricing_plans_name_billing_cycle_key 
UNIQUE (name, billing_cycle);

-- Notify success
DO $$ 
BEGIN
  RAISE NOTICE '✅ Fixed unique constraint: now allows same plan name with different billing cycles';
END $$;

