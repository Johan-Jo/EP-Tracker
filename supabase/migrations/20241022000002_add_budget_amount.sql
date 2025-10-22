-- Add budget_amount column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(12, 2);

COMMENT ON COLUMN projects.budget_amount IS 'Budget in currency (SEK) for the project. Used with budget_mode=amount.';

