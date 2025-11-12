-- ÄTA hours & materials enhancement
-- Adds materials amount column to ata entries for combined totals.

ALTER TABLE ata
	ADD COLUMN IF NOT EXISTS materials_sek NUMERIC(12, 2);

COMMENT ON COLUMN ata.materials_sek IS 'Additional material cost (SEK) associated with the ÄTA entry.';

