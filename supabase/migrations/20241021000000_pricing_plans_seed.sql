-- Seed Pricing Plans for EP Time Tracker
-- Based on finalized decisions:
-- Prices: 199 SEK (Basic), 299 SEK (Pro), Custom (Enterprise)
-- Prices EXCLUDE 25% Swedish VAT (added at checkout)
-- Trial: 14 days, no credit card required
-- Storage: 2GB/25GB/100GB, Users: 5/25/100
-- Annual billing: 10% discount
-- Currency: SEK only (EUR support future)

-- First, add billing_cycle column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_plans' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE pricing_plans ADD COLUMN billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));
    CREATE INDEX idx_pricing_plans_billing_cycle ON pricing_plans(billing_cycle);
  END IF;
END $$;

-- Insert pricing plans (including annual variants)
INSERT INTO pricing_plans (id, name, price_sek, billing_cycle, max_users, max_storage_gb, features, is_active)
VALUES
  -- Free Trial (14 days, converts to Basic after)
  (
    'b4d8f8e0-0000-0000-0000-000000000001',
    'Free Trial',
    0.00,
    'monthly',
    5,
    2,
    '{
      "trial_duration_days": 14,
      "requires_credit_card": false,
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": true,
      "email_support": false,
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "vat_excluded": true
    }'::jsonb,
    true
  ),
  
  -- Basic Plan - Monthly (199 SEK/month + VAT)
  (
    'b4d8f8e0-0000-0000-0000-000000000002',
    'Basic',
    199.00,
    'monthly',
    5,
    2,
    '{
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": false,
      "email_support": true,
      "support_response_time": "< 48h",
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "uptime_sla": "99.5%",
      "vat_excluded": true,
      "price_with_vat": 248.75
    }'::jsonb,
    true
  ),
  
  -- Basic Plan - Annual (2149 SEK/year + VAT, 10% discount)
  (
    'b4d8f8e0-0000-0000-0000-000000000003',
    'Basic Annual',
    2149.00,
    'annual',
    5,
    2,
    '{
      "annual_discount_percent": 10,
      "monthly_equivalent": 179.08,
      "savings_per_year": 239,
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": false,
      "email_support": true,
      "support_response_time": "< 48h",
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "uptime_sla": "99.5%",
      "vat_excluded": true,
      "price_with_vat": 2686.25
    }'::jsonb,
    true
  ),
  
  -- Pro Plan - Monthly (299 SEK/month + VAT)
  (
    'b4d8f8e0-0000-0000-0000-000000000004',
    'Pro',
    299.00,
    'monthly',
    25,
    25,
    '{
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": false,
      "email_support": true,
      "priority_support": true,
      "support_response_time": "< 12h",
      "phone_support": false,
      "api_access": true,
      "custom_checklist_templates": true,
      "bulk_operations": true,
      "advanced_analytics": true,
      "uptime_sla": "99.9%",
      "most_popular": true,
      "vat_excluded": true,
      "price_with_vat": 373.75
    }'::jsonb,
    true
  ),
  
  -- Pro Plan - Annual (3229 SEK/year + VAT, 10% discount)
  (
    'b4d8f8e0-0000-0000-0000-000000000005',
    'Pro Annual',
    3229.00,
    'annual',
    25,
    25,
    '{
      "annual_discount_percent": 10,
      "monthly_equivalent": 269.08,
      "savings_per_year": 359,
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": false,
      "email_support": true,
      "priority_support": true,
      "support_response_time": "< 12h",
      "phone_support": false,
      "api_access": true,
      "custom_checklist_templates": true,
      "bulk_operations": true,
      "advanced_analytics": true,
      "uptime_sla": "99.9%",
      "most_popular": true,
      "vat_excluded": true,
      "price_with_vat": 4036.25
    }'::jsonb,
    true
  ),
  
  -- Enterprise Plan - Custom pricing (starting 999 SEK/month + VAT)
  (
    'b4d8f8e0-0000-0000-0000-000000000006',
    'Enterprise',
    999.00,
    'monthly',
    100,
    100,
    '{
      "custom_pricing": true,
      "time_tracking": true,
      "materials": true,
      "expenses": true,
      "mileage": true,
      "ata": true,
      "diary": true,
      "checklists": true,
      "approvals": true,
      "csv_exports": true,
      "offline_mode": true,
      "pwa_install": true,
      "export_watermark": false,
      "email_support": true,
      "priority_support": true,
      "phone_support": true,
      "support_response_time": "< 4h",
      "api_access": true,
      "custom_checklist_templates": true,
      "bulk_operations": true,
      "advanced_analytics": true,
      "custom_integrations": true,
      "fortnox_integration": true,
      "visma_integration": true,
      "sso": true,
      "white_label": true,
      "dedicated_account_manager": true,
      "custom_training": true,
      "custom_sla": true,
      "uptime_sla": "99.95%",
      "unlimited_users": true,
      "unlimited_storage": true,
      "volume_discounts": true,
      "flexible_payment_terms": true,
      "priority_feature_requests": true,
      "vat_excluded": true,
      "starting_price_with_vat": 1248.75
    }'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE pricing_plans IS 'SaaS pricing tiers for EP Time Tracker';
COMMENT ON COLUMN pricing_plans.price_sek IS 'Monthly price in Swedish Kronor (SEK)';
COMMENT ON COLUMN pricing_plans.max_users IS 'Maximum users allowed on this plan';
COMMENT ON COLUMN pricing_plans.max_storage_gb IS 'Maximum storage in gigabytes';
COMMENT ON COLUMN pricing_plans.features IS 'JSON object with feature flags for this plan';

-- Example: Assign default trial plan to existing organizations (if any)
-- This would be run after migration if there are existing orgs
/*
UPDATE organizations 
SET 
  plan_id = 'b4d8f8e0-0000-0000-0000-000000000001',
  status = 'trial',
  trial_ends_at = NOW() + INTERVAL '14 days'
WHERE plan_id IS NULL;
*/

-- Create a view for easy plan comparison
CREATE OR REPLACE VIEW pricing_plans_summary AS
SELECT 
  id,
  name,
  price_sek,
  billing_cycle,
  CASE 
    WHEN billing_cycle = 'annual' THEN ROUND(price_sek / 12, 2)
    ELSE price_sek
  END as monthly_equivalent_sek,
  CASE 
    WHEN features->>'vat_excluded' = 'true' THEN ROUND(price_sek * 1.25, 2)
    ELSE price_sek
  END as price_with_vat_sek,
  max_users,
  max_storage_gb,
  features->>'uptime_sla' as uptime_sla,
  features->>'support_response_time' as support_response_time,
  (features->>'email_support')::boolean as email_support,
  (features->>'priority_support')::boolean as priority_support,
  (features->>'phone_support')::boolean as phone_support,
  (features->>'api_access')::boolean as api_access,
  (features->>'most_popular')::boolean as most_popular,
  (features->>'annual_discount_percent')::integer as annual_discount_percent,
  (features->>'custom_pricing')::boolean as custom_pricing,
  is_active,
  created_at
FROM pricing_plans
WHERE is_active = true
ORDER BY 
  CASE billing_cycle WHEN 'monthly' THEN 1 ELSE 2 END,
  price_sek ASC;

COMMENT ON VIEW pricing_plans_summary IS 'Easy-to-read summary of pricing plans with VAT calculations and key features';

-- Create a view for pricing page (public-facing)
CREATE OR REPLACE VIEW public_pricing_plans AS
SELECT 
  id,
  name,
  CASE 
    WHEN name LIKE '%Annual%' THEN REPLACE(name, ' Annual', '')
    ELSE name
  END as display_name,
  price_sek,
  billing_cycle,
  CASE 
    WHEN billing_cycle = 'annual' THEN ROUND(price_sek / 12, 2)
    ELSE price_sek
  END as monthly_equivalent,
  ROUND(price_sek * 1.25, 2) as price_with_vat,
  max_users,
  max_storage_gb,
  features->>'support_response_time' as support_time,
  (features->>'most_popular')::boolean as is_popular,
  (features->>'annual_discount_percent')::integer as annual_discount,
  features->'savings_per_year' as annual_savings,
  is_active
FROM pricing_plans
WHERE is_active = true
  AND name != 'Free Trial'
ORDER BY 
  CASE name 
    WHEN 'Basic' THEN 1
    WHEN 'Basic Annual' THEN 2
    WHEN 'Pro' THEN 3
    WHEN 'Pro Annual' THEN 4
    WHEN 'Enterprise' THEN 5
    ELSE 6
  END;

COMMENT ON VIEW public_pricing_plans IS 'Pricing plans formatted for public pricing page';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Pricing plans seed data loaded successfully';
  RAISE NOTICE '6 plans created: Free Trial, Basic (Monthly/Annual), Pro (Monthly/Annual), Enterprise';
  RAISE NOTICE 'All prices exclude 25%% Swedish VAT';
  RAISE NOTICE 'Annual plans offer 10%% discount';
END $$;

