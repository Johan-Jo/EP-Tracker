-- EP-Tracker: Add materials amount column to ÄTA entries
-- Adds explicit material cost tracking for change orders.

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'ata'
			AND column_name = 'materials_sek'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'ata'
			AND column_name = 'materials_amount_sek'
	) THEN
		ALTER TABLE public.ata
			RENAME COLUMN materials_sek TO materials_amount_sek;
	END IF;
END
$$;

ALTER TABLE public.ata
	ADD COLUMN IF NOT EXISTS materials_amount_sek NUMERIC(12, 2);

ALTER TABLE public.ata
	ALTER COLUMN materials_amount_sek SET DEFAULT 0,
	ALTER COLUMN materials_amount_sek SET NOT NULL;

UPDATE public.ata
SET materials_amount_sek = COALESCE(materials_amount_sek, 0);

COMMENT ON COLUMN public.ata.materials_amount_sek IS 'Additional material cost in SEK linked to the ÄTA record';

