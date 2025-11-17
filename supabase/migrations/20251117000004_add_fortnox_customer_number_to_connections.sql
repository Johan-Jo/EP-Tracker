-- Migration: Add fortnox_customer_number to fortnox_connections table
-- Description: Stores the Fortnox customer number for the organization (fetched from Fortnox API)
-- Date: 2025-11-17

ALTER TABLE public.fortnox_connections
ADD COLUMN IF NOT EXISTS fortnox_customer_number TEXT;

COMMENT ON COLUMN public.fortnox_connections.fortnox_customer_number IS 'Fortnox customer number for this organization (fetched from Fortnox API when connection is established)';

