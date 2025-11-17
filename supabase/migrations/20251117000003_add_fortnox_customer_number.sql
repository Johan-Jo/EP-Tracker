-- Migration: Add Fortnox customer number to customers table
-- Description: Stores Fortnox customer number for each customer to enable invoice export
-- Date: 2025-11-17

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS fortnox_customer_number TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_fortnox_customer_number 
    ON public.customers(fortnox_customer_number) 
    WHERE fortnox_customer_number IS NOT NULL;

COMMENT ON COLUMN public.customers.fortnox_customer_number IS 'Fortnox customer number for invoice export integration';


