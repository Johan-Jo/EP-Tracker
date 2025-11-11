-- Add explicit OB detail columns to payroll_basis
ALTER TABLE payroll_basis
	ADD COLUMN IF NOT EXISTS ob_hours_actual NUMERIC,
	ADD COLUMN IF NOT EXISTS ob_hours_multiplier NUMERIC;



