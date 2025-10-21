-- =====================================================
-- Add missing billing_cycle column to pricing_plans
-- =====================================================

-- Add billing_cycle column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_plans' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE pricing_plans 
    ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'monthly' 
    CHECK (billing_cycle IN ('monthly', 'annual'));
    
    RAISE NOTICE '✅ Added billing_cycle column to pricing_plans';
  ELSE
    RAISE NOTICE '⚠️  billing_cycle column already exists';
  END IF;
END $$;

-- Remove the default after adding (so future inserts must specify it)
DO $$ 
BEGIN
  ALTER TABLE pricing_plans ALTER COLUMN billing_cycle DROP DEFAULT;
  RAISE NOTICE '✅ Patch complete! Now you can run the seed data migration.';
END $$;

