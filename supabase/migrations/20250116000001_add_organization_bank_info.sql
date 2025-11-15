-- Add bank information fields to organizations table
-- These fields are used for invoice generation

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS bankgiro TEXT,
ADD COLUMN IF NOT EXISTS plusgiro TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.bankgiro IS 'Bankgiro number for invoice payments (Swedish format: 123-4567)';
COMMENT ON COLUMN organizations.plusgiro IS 'Plusgiro number for invoice payments (Swedish format: 12 34 56-7)';
COMMENT ON COLUMN organizations.iban IS 'IBAN (International Bank Account Number) for international payments';
COMMENT ON COLUMN organizations.bic IS 'BIC/SWIFT code for international bank transfers';

