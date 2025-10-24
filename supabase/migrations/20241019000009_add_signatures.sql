-- Add signature fields to ÄTA table
ALTER TABLE ata ADD COLUMN IF NOT EXISTS signed_by_name TEXT;
ALTER TABLE ata ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add signature fields to diary_entries table  
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS signed_by_name TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Add approval signature fields to ÄTA (for the person approving)
ALTER TABLE ata ADD COLUMN IF NOT EXISTS approved_by_name TEXT;

