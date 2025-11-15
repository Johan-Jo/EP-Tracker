-- Standardize ÄTA status: Change 'pending_approval' to 'submitted'
-- This aligns ÄTA status values with other approval types (time_entries, materials, expenses, mileage)

-- Step 1: Drop the old check constraint first to allow updates
ALTER TABLE ata DROP CONSTRAINT IF EXISTS ata_status_check;

-- Step 2: Update existing ÄTA records with status 'pending_approval' to 'submitted'
-- This must happen AFTER dropping the constraint
UPDATE ata 
SET status = 'submitted'
WHERE status = 'pending_approval';

-- Step 3: Add new check constraint with 'submitted' instead of 'pending_approval'
ALTER TABLE ata 
ADD CONSTRAINT ata_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'invoiced'));

-- Verify: Count of updated records
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM ata 
    WHERE status = 'submitted';
    
    RAISE NOTICE 'Migration complete: % ÄTA records now have status ''submitted''', updated_count;
END $$;

