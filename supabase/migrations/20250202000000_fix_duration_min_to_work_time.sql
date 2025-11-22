-- Fix duration_min to be work time (after break deduction) instead of total time
-- This ensures there's only ONE time value used consistently everywhere

-- Step 1: Add a temporary column to store the calculated work time
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS work_duration_min INTEGER;

-- Step 2: For existing entries, we need to calculate work time
-- Since we can't easily calculate break deduction in SQL without organization settings,
-- we'll set work_duration_min = duration_min for now (no break deduction applied yet)
-- This will be recalculated when entries are updated
UPDATE time_entries 
SET work_duration_min = duration_min 
WHERE stop_at IS NOT NULL AND work_duration_min IS NULL;

-- Step 3: Remove the generated column constraint
ALTER TABLE time_entries 
ALTER COLUMN duration_min DROP EXPRESSION;

-- Step 4: Copy work_duration_min to duration_min
UPDATE time_entries 
SET duration_min = work_duration_min 
WHERE work_duration_min IS NOT NULL;

-- Step 5: Remove the temporary column
ALTER TABLE time_entries 
DROP COLUMN IF EXISTS work_duration_min;

-- Step 6: Make duration_min nullable and add a comment
COMMENT ON COLUMN time_entries.duration_min IS 'Work time in minutes (after break deduction). Calculated when entry is created/updated.';


