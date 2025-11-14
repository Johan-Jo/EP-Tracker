-- Add contact person fields for companies
-- Date: 2025-11-15

-- Add contact person name and phone fields to customers table
ALTER TABLE IF EXISTS public.customers
    ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_person_phone TEXT;

-- Add comments
COMMENT ON COLUMN public.customers.contact_person_name IS 'Kontaktpersonens namn (endast för företag)';
COMMENT ON COLUMN public.customers.contact_person_phone IS 'Kontaktpersonens telefonnummer (endast för företag)';

