-- Update Pricing Plans with Stripe Price IDs
-- Run this in Supabase SQL Editor

-- Update Start (Basic) Monthly
UPDATE pricing_plans
SET stripe_price_id = 'price_1SKQaAJx9q1Y6L5ze0viGOWh'
WHERE name = 'Basic' AND billing_cycle = 'monthly';

-- Update Start (Basic) Yearly
UPDATE pricing_plans
SET stripe_price_id = 'price_1SKQapJx9q1Y6L5zp44lIf71'
WHERE name = 'Basic' AND billing_cycle = 'annual';

-- Update Pro Monthly
UPDATE pricing_plans
SET stripe_price_id = 'price_1SKQb6Jx9q1Y6L5zAQAyFUm7'
WHERE name = 'Pro' AND billing_cycle = 'monthly';

-- Update Pro Yearly
UPDATE pricing_plans
SET stripe_price_id = 'price_1SKQbXJx9q1Y6L5zAnAv4gYT'
WHERE name = 'Pro' AND billing_cycle = 'annual';

-- Verify the updates
SELECT id, name, billing_cycle, price_sek, stripe_price_id
FROM pricing_plans
ORDER BY name, billing_cycle;

