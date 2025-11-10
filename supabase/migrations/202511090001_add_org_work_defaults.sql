-- Add organization defaults for working hours, breaks and VAT details
ALTER TABLE organizations
	ADD COLUMN IF NOT EXISTS default_work_day_start TIME WITHOUT TIME ZONE DEFAULT '07:00',
	ADD COLUMN IF NOT EXISTS default_work_day_end TIME WITHOUT TIME ZONE DEFAULT '16:00',
	ADD COLUMN IF NOT EXISTS standard_work_hours_per_day NUMERIC(4, 2) DEFAULT 8,
	ADD COLUMN IF NOT EXISTS standard_break_minutes_per_day INTEGER DEFAULT 0,
	ADD COLUMN IF NOT EXISTS standard_breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
	ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
	ADD COLUMN IF NOT EXISTS vat_number TEXT,
	ADD COLUMN IF NOT EXISTS default_vat_rate NUMERIC(5, 2);

ALTER TABLE organizations
	ADD CONSTRAINT organizations_default_workday_time CHECK (default_work_day_end > default_work_day_start);

COMMENT ON COLUMN organizations.standard_work_hours_per_day IS 'Ordinarie arbetstimmar per dag för organisationen';
COMMENT ON COLUMN organizations.standard_break_minutes_per_day IS 'Totalt antal raster (minuter) under en standardarbetsdag';
COMMENT ON COLUMN organizations.standard_breaks IS 'JSON-lista med standardraster: [{label, start, end, duration_minutes}]';
COMMENT ON COLUMN organizations.default_work_day_start IS 'Standard starttid för arbetsdagen (HH:MM)';
COMMENT ON COLUMN organizations.default_work_day_end IS 'Standard sluttid för arbetsdagen (HH:MM)';
COMMENT ON COLUMN organizations.vat_registered IS 'True om bolaget är momsregistrerat';
COMMENT ON COLUMN organizations.vat_number IS 'Momsregistreringsnummer (VAT)';
COMMENT ON COLUMN organizations.default_vat_rate IS 'Standard momssats i procent';

