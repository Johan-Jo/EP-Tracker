-- EPIC 33: Add salary_per_hour_sek column to memberships
-- Distinguishes between billing rate (hourly_rate_sek) and actual salary (salary_per_hour_sek)

-- Add salary_per_hour_sek column for actual employee salary
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS salary_per_hour_sek DECIMAL(10, 2);

-- Add comment to clarify the distinction
COMMENT ON COLUMN public.memberships.hourly_rate_sek IS 'Faktureringsvärde per timme som faktureras kunden (billing rate)';
COMMENT ON COLUMN public.memberships.salary_per_hour_sek IS 'Faktisk lön per timme för den anställde (employee salary)';

