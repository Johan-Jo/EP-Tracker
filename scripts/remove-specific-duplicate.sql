-- Script to remove a specific duplicate project
-- Use this if you know the exact project IDs to merge
--
-- Replace these UUIDs with your actual values:
-- keep_id: The project to keep (the oldest one)
-- dup_id: The duplicate project to remove

DO $$
DECLARE
    keep_id UUID := '3d184af9-8d14-4091-bf8e-7fca33228542';  -- Project to keep
    dup_id UUID := '1e20ebb5-7efc-4261-b093-a128cad40956';   -- Duplicate to remove
    rows_updated INTEGER;
BEGIN
    RAISE NOTICE 'Starting merge: Keeping project % and removing duplicate %', keep_id, dup_id;
    
    -- Verify projects exist
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = keep_id) THEN
        RAISE WARNING 'Keep project % does not exist - skipping', keep_id;
        RETURN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = dup_id) THEN
        RAISE NOTICE 'Duplicate project % does not exist - may already be deleted', dup_id;
        RAISE NOTICE 'Checking if it still exists in database...';
        
        -- Check if project exists but might be filtered by RLS
        PERFORM 1 FROM projects WHERE id = dup_id;
        IF FOUND THEN
            RAISE WARNING 'Project exists but may be filtered by RLS policies. Try running with service role key.';
        ELSE
            RAISE NOTICE 'Project does not exist in database - nothing to do';
        END IF;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Both projects found. Keep: %, Remove: %', keep_id, dup_id;
    
    -- Migrate phases
    UPDATE phases SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % phases', rows_updated;
    
    -- Migrate work_orders
    UPDATE work_orders SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % work_orders', rows_updated;
    
    -- Migrate time_entries
    UPDATE time_entries SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % time_entries', rows_updated;
    
    -- Migrate materials
    UPDATE materials SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % materials', rows_updated;
    
    -- Migrate expenses
    UPDATE expenses SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % expenses', rows_updated;
    
    -- Migrate mileage
    UPDATE mileage SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % mileage records', rows_updated;
    
    -- Migrate travel_time
    UPDATE travel_time SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % travel_time records', rows_updated;
    
    -- Migrate ata
    UPDATE ata SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % ata records', rows_updated;
    
    -- Migrate diary_entries (handle conflicts)
    DELETE FROM diary_entries de1
    WHERE de1.project_id = dup_id
    AND EXISTS (
        SELECT 1 FROM diary_entries de2 
        WHERE de2.project_id = keep_id 
        AND de2.date = de1.date
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Deleted % conflicting diary_entries', rows_updated;
    
    UPDATE diary_entries SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % diary_entries', rows_updated;
    
    -- Migrate checklists
    UPDATE checklists SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % checklists', rows_updated;
    
    -- Migrate assignments
    UPDATE assignments SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % assignments', rows_updated;
    
    -- Migrate project_members (handle conflicts)
    DELETE FROM project_members pm1
    WHERE pm1.project_id = dup_id
    AND EXISTS (
        SELECT 1 FROM project_members pm2 
        WHERE pm2.project_id = keep_id 
        AND pm2.user_id = pm1.user_id
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Deleted % conflicting project_members', rows_updated;
    
    UPDATE project_members SET project_id = keep_id WHERE project_id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE '  Migrated % project_members', rows_updated;
    
    -- Delete the duplicate project
    DELETE FROM projects WHERE id = dup_id;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    IF rows_updated = 1 THEN
        RAISE NOTICE '✅ Successfully deleted duplicate project %', dup_id;
    ELSE
        RAISE WARNING '⚠️  Expected to delete 1 project but deleted %', rows_updated;
    END IF;
    
    RAISE NOTICE '✅ Merge completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error during merge: %', SQLERRM;
        RAISE NOTICE 'This may be due to RLS policies. Try running with service role key or as super admin.';
END $$;

-- Verify the duplicate was removed
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM projects WHERE id = '1e20ebb5-7efc-4261-b093-a128cad40956') 
        THEN '❌ Duplicate still exists'
        ELSE '✅ Duplicate removed successfully'
    END as status;


