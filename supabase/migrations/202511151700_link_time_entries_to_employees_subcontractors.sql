-- Link time_entries to employees and subcontractors
-- Date: 2025-11-15
-- Part 1: Schema changes only (fast)

-- Add employee_id and subcontractor_id columns to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL;

-- Create indexes for the new columns (CONCURRENTLY if possible, but IF NOT EXISTS is safer)
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON public.time_entries(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_subcontractor_id ON public.time_entries(subcontractor_id) WHERE subcontractor_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.time_entries.employee_id IS 'Link to employees table if this time entry is from an employee';
COMMENT ON COLUMN public.time_entries.subcontractor_id IS 'Link to subcontractors table if this time entry is from a subcontractor (UE)';
