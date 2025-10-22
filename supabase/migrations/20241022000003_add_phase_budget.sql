-- Add budget columns to phases table
ALTER TABLE phases
ADD COLUMN IF NOT EXISTS budget_hours DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2);

COMMENT ON COLUMN phases.budget_hours IS 'Budget in hours for this phase. Part of the project budget breakdown.';
COMMENT ON COLUMN phases.budget_amount IS 'Budget in currency (SEK) for this phase. Part of the project budget breakdown.';

