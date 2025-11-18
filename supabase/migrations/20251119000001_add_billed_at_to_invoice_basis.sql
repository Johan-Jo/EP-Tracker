-- Add billed_at timestamp to invoice_basis table
-- This field marks when an invoice basis has been successfully exported to Fortnox

ALTER TABLE public.invoice_basis
ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoice_basis_billed_at ON public.invoice_basis(billed_at) WHERE billed_at IS NOT NULL;

COMMENT ON COLUMN public.invoice_basis.billed_at IS 'Timestamp when invoice was successfully exported to Fortnox (marking it as fakturerat)';

