-- Add hourly_rate_sek to subcontractors table
-- Date: 2025-11-15

-- Add hourly_rate_sek column for billing subcontractors
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS hourly_rate_sek DECIMAL(10, 2);

-- Add comment
COMMENT ON COLUMN public.subcontractors.hourly_rate_sek IS 'Hourly rate for billing subcontractor services in SEK';

