-- =====================================================
-- Pricing Plans Seed Data (SAFE VERSION - handles duplicates)
-- =====================================================

-- Delete existing plans and reseed (safest for updates)
DELETE FROM pricing_plans;

-- Insert pricing plans with ON CONFLICT handling
INSERT INTO pricing_plans (id, name, price_sek, billing_cycle, max_users, max_storage_gb, features, is_active)
VALUES
  -- Free Trial (14 days)
  (
    'b4d8f8e0-0000-0000-0000-000000000001',
    'Free Trial',
    0.00,
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
      "export_watermark": true,
      "email_support": false,
      "support_response_time": "community",
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "uptime_sla": "99%",
      "trial_days": 14,
      "vat_excluded": true,
      "price_with_vat": 0.00
    }'::jsonb,
    true
  ),
  
  -- Basic Monthly
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
  
  -- Basic Annual (10% discount)
  (
    'b4d8f8e0-0000-0000-0000-000000000003',
    'Basic',
    2149.00,
    'annual',
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
      "price_with_vat": 2686.25,
      "annual_discount_percent": 10,
      "monthly_equivalent": 179.08
    }'::jsonb,
    true
  ),
  
  -- Pro Monthly
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
      "support_response_time": "< 24h",
      "priority_support": true,
      "phone_support": false,
      "api_access": true,
      "uptime_sla": "99.9%",
      "most_popular": true,
      "vat_excluded": true,
      "price_with_vat": 373.75
    }'::jsonb,
    true
  ),
  
  -- Pro Annual (10% discount)
  (
    'b4d8f8e0-0000-0000-0000-000000000005',
    'Pro',
    3229.00,
    'annual',
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
      "support_response_time": "< 24h",
      "priority_support": true,
      "phone_support": false,
      "api_access": true,
      "uptime_sla": "99.9%",
      "most_popular": true,
      "vat_excluded": true,
      "price_with_vat": 4036.25,
      "annual_discount_percent": 10,
      "monthly_equivalent": 269.08
    }'::jsonb,
    true
  ),
  
  -- Enterprise (Contact for pricing)
  (
    'b4d8f8e0-0000-0000-0000-000000000006',
    'Enterprise',
    0.00,
    'monthly',
    100,
    100,
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
      "support_response_time": "< 4h",
      "priority_support": true,
      "phone_support": true,
      "api_access": true,
      "uptime_sla": "99.95%",
      "custom_pricing": true,
      "dedicated_support": true,
      "custom_integrations": true,
      "sso": true,
      "audit_logs": true,
      "vat_excluded": true,
      "price_with_vat": 0.00
    }'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_sek = EXCLUDED.price_sek,
  billing_cycle = EXCLUDED.billing_cycle,
  max_users = EXCLUDED.max_users,
  max_storage_gb = EXCLUDED.max_storage_gb,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- =====================================================
-- Create helper views
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS pricing_plans_summary CASCADE;
DROP VIEW IF EXISTS pricing_comparison CASCADE;

-- Summary view with calculated fields
CREATE VIEW pricing_plans_summary AS
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

-- Comparison view for displaying on pricing page
CREATE VIEW pricing_comparison AS
SELECT 
  name,
  billing_cycle,
  price_sek,
  CASE 
    WHEN billing_cycle = 'annual' THEN 
      ROUND(price_sek / 12, 2)
    ELSE price_sek
  END as display_price_sek,
  max_users,
  max_storage_gb,
  features,
  (features->>'most_popular')::boolean as is_most_popular,
  (features->>'custom_pricing')::boolean as is_custom_pricing
FROM pricing_plans
WHERE is_active = true
ORDER BY 
  CASE name 
    WHEN 'Free Trial' THEN 1
    WHEN 'Basic' THEN 2
    WHEN 'Pro' THEN 3
    WHEN 'Enterprise' THEN 4
  END,
  CASE billing_cycle WHEN 'monthly' THEN 1 ELSE 2 END;

-- Grant permissions
GRANT SELECT ON pricing_plans_summary TO authenticated, anon;
GRANT SELECT ON pricing_comparison TO authenticated, anon;

-- =====================================================
-- Verify seed data
-- =====================================================

DO $$
DECLARE
  plan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM pricing_plans WHERE is_active = true;
  
  IF plan_count = 6 THEN
    RAISE NOTICE '✅ Pricing plans seed data loaded successfully';
    RAISE NOTICE '   6 plans created: Free Trial, Basic (Monthly/Annual), Pro (Monthly/Annual), Enterprise';
  ELSE
    RAISE WARNING '⚠️  Expected 6 plans, found %', plan_count;
  END IF;
END $$;

