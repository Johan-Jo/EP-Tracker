-- Seed Pricing Plans for EP Time Tracker
-- Based on decisions: 199 SEK (Basic), 299 SEK (Pro), Custom (Enterprise)
-- Trial: 14 days, Storage: 2GB/25GB/100GB, Users: 5/25/100

-- Insert pricing plans
INSERT INTO pricing_plans (id, name, price_sek, max_users, max_storage_gb, features, is_active)
VALUES
  -- Free Trial (converts to Basic after 14 days)
  (
    'b4d8f8e0-0000-0000-0000-000000000001',
    'Free Trial',
    0.00,
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
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "custom_integrations": false,
      "sso": false,
      "white_label": false
    }'::jsonb,
    true
  ),
  
  -- Basic Plan - 199 SEK/month
  (
    'b4d8f8e0-0000-0000-0000-000000000002',
    'Basic',
    199.00,
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
      "priority_support": false,
      "phone_support": false,
      "api_access": false,
      "custom_integrations": false,
      "sso": false,
      "white_label": false,
      "uptime_sla": "99.5%"
    }'::jsonb,
    true
  ),
  
  -- Pro Plan - 299 SEK/month (Most Popular)
  (
    'b4d8f8e0-0000-0000-0000-000000000003',
    'Pro',
    299.00,
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
      "phone_support": false,
      "api_access": true,
      "custom_checklist_templates": true,
      "bulk_operations": true,
      "advanced_analytics": true,
      "custom_integrations": false,
      "sso": false,
      "white_label": false,
      "uptime_sla": "99.9%",
      "support_response_time": "< 12h"
    }'::jsonb,
    true
  ),
  
  -- Enterprise Plan - Custom pricing (starting 999+ SEK/month)
  (
    'b4d8f8e0-0000-0000-0000-000000000004',
    'Enterprise',
    999.00, -- Starting price, actual price negotiated
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
      "priority_support": true,
      "phone_support": true,
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
      "support_response_time": "< 4h",
      "unlimited_users": true,
      "unlimited_storage": true
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
  max_users,
  max_storage_gb,
  features->>'uptime_sla' as uptime_sla,
  features->>'support_response_time' as support_response_time,
  (features->>'email_support')::boolean as email_support,
  (features->>'priority_support')::boolean as priority_support,
  (features->>'phone_support')::boolean as phone_support,
  (features->>'api_access')::boolean as api_access,
  (features->>'custom_integrations')::boolean as custom_integrations,
  (features->>'sso')::boolean as sso,
  is_active,
  created_at
FROM pricing_plans
ORDER BY price_sek ASC;

COMMENT ON VIEW pricing_plans_summary IS 'Easy-to-read summary of pricing plans with key features';

