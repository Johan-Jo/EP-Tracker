-- Merge the two "Zippens vardagsrum" projects
-- Keep: 3d184af9-8d14-4091-bf8e-7fca33228542 (older, has project_number 222)
-- Remove: 7ba97841-ce77-4049-9b7f-8fc68b554c63 (newer, no project_number)

DO $$
DECLARE
    keep_id UUID := '3d184af9-8d14-4091-bf8e-7fca33228542';  -- Keep this one (older, has project_number)
    dup_id UUID := '7ba97841-ce77-4049-9b7f-8fc68b554c63';   -- Remove this one (newer, no project_number)
    rows_updated INTEGER;
BEGIN
    RAISE NOTICE 'Starting merge: Keeping project % and removing duplicate %', keep_id, dup_id;
    
    -- Verify projects exist
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = keep_id) THEN
        RAISE EXCEPTION 'Keep project % does not exist', keep_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM projects WHERE id = dup_id) THEN
        RAISE EXCEPTION 'Duplicate project % does not exist', dup_id;
    END IF;
    
    RAISE NOTICE 'Both projects found. Starting migration...';
    
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
    
    -- Migrate diary_entries (handle conflicts - keep entries from the main project)
    DELETE FROM diary_entries de1
    WHERE de1.project_id = dup_id
    AND EXISTS (
        SELECT 1 FROM diary_entries de2 
        WHERE de2.project_id = keep_id 
        AND de2.date = de1.date
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    IF rows_updated > 0 THEN
        RAISE NOTICE '  Deleted % conflicting diary_entries (kept entries from main project)', rows_updated;
    END IF;
    
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
    
    -- Migrate invoice_basis (if table exists)
    BEGIN
        UPDATE invoice_basis SET project_id = keep_id WHERE project_id = dup_id;
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        IF rows_updated > 0 THEN
            RAISE NOTICE '  Migrated % invoice_basis records', rows_updated;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    -- Migrate fixed_time_blocks (if table exists)
    BEGIN
        UPDATE fixed_time_blocks SET project_id = keep_id WHERE project_id = dup_id;
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        IF rows_updated > 0 THEN
            RAISE NOTICE '  Migrated % fixed_time_blocks records', rows_updated;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    -- Migrate project_members (handle conflicts - keep members from main project)
    DELETE FROM project_members pm1
    WHERE pm1.project_id = dup_id
    AND EXISTS (
        SELECT 1 FROM project_members pm2 
        WHERE pm2.project_id = keep_id 
        AND pm2.user_id = pm1.user_id
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    IF rows_updated > 0 THEN
        RAISE NOTICE '  Deleted % conflicting project_members (kept members from main project)', rows_updated;
    END IF;
    
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
        RAISE EXCEPTION 'Error during merge: %', SQLERRM;
END $$;

-- Verify the merge
SELECT 
    id,
    name,
    project_number,
    org_id,
    status,
    created_at,
    CASE 
        WHEN id = '7ba97841-ce77-4049-9b7f-8fc68b554c63' 
        THEN '❌ Still exists (merge failed)'
        ELSE '✅ Exists (this is the kept project)'
    END as status_check
FROM projects 
WHERE id IN (
    '3d184af9-8d14-4091-bf8e-7fca33228542',
    '7ba97841-ce77-4049-9b7f-8fc68b554c63'
)
ORDER BY created_at;


