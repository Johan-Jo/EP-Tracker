-- Add budget_hours column to projects table
-- This allows tracking of hour-based budgets for projects

ALTER TABLE projects 
ADD COLUMN budget_hours DECIMAL(10, 2);

COMMENT ON COLUMN projects.budget_hours IS 'Budget in hours for the project. Used to track progress against estimated hours.';

