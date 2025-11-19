-- Script to identify and remove duplicate projects
-- This script identifies duplicates by name and org_id, keeps the oldest project,
-- migrates all related data, and deletes the duplicates.
--
-- IMPORTANT: Run scripts/find-duplicate-projects.sql first to see what will be deleted!

-- ============================================================================
-- STEP 1: Identify duplicate projects
-- ============================================================================
-- First, let's see what duplicates exist
-- Groups by org_id and name (project_number can be NULL, so we group separately)
WITH duplicate_groups AS (
    SELECT 
        org_id,
        name,
        COALESCE(project_number, '') as project_number_key,
        COUNT(*) as duplicate_count,
        array_agg(id ORDER BY created_at ASC) as project_ids,
        array_agg(created_at ORDER BY created_at ASC) as created_dates
    FROM projects
    WHERE name IS NOT NULL
    GROUP BY org_id, name, COALESCE(project_number, '')
    HAVING COUNT(*) > 1
)
SELECT 
    org_id,
    name,
    CASE WHEN project_number_key = '' THEN NULL ELSE project_number_key END as project_number,
    duplicate_count,
    project_ids[1] as keep_project_id,  -- Keep the oldest (first created)
    project_ids[2:] as duplicate_project_ids  -- All others are duplicates
FROM duplicate_groups
ORDER BY org_id, name;

-- ============================================================================
-- STEP 2: Create a function to merge duplicate projects
-- ============================================================================
-- This function will:
-- 1. Keep the oldest project (by created_at)
-- 2. Migrate all related data from duplicates to the kept project
-- 3. Delete the duplicate projects

DO $$
DECLARE
    dup_record RECORD;
    keep_id UUID;
    dup_id UUID;
    rows_updated INTEGER;
    error_message TEXT;
BEGIN
    -- Loop through each group of duplicates
    FOR dup_record IN 
        WITH duplicate_groups AS (
            SELECT 
                org_id,
                name,
                COALESCE(project_number, '') as project_number_key,
                array_agg(id ORDER BY created_at ASC) as project_ids
            FROM projects
            WHERE name IS NOT NULL
            GROUP BY org_id, name, COALESCE(project_number, '')
            HAVING COUNT(*) > 1
        )
        SELECT 
            org_id,
            name,
            project_number_key as project_number,
            project_ids[1] as keep_project_id,
            project_ids[2:] as duplicate_project_ids
        FROM duplicate_groups
    LOOP
        keep_id := dup_record.keep_project_id;
        
        RAISE NOTICE 'Processing duplicates for project: % (org: %)', dup_record.name, dup_record.org_id;
        RAISE NOTICE '  Keeping project ID: %', keep_id;
        
        -- Process each duplicate project
        FOREACH dup_id IN ARRAY dup_record.duplicate_project_ids
        LOOP
            BEGIN
                RAISE NOTICE '  Migrating data from duplicate project ID: %', dup_id;
                
                -- Migrate phases
                UPDATE phases SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % phases', rows_updated;
                END IF;
                
                -- Migrate work_orders
                UPDATE work_orders SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % work_orders', rows_updated;
                END IF;
                
                -- Migrate time_entries
                UPDATE time_entries SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % time_entries', rows_updated;
                END IF;
                
                -- Migrate materials
                UPDATE materials SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % materials', rows_updated;
                END IF;
                
                -- Migrate expenses
                UPDATE expenses SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % expenses', rows_updated;
                END IF;
                
                -- Migrate mileage
                UPDATE mileage SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % mileage records', rows_updated;
                END IF;
                
                -- Migrate travel_time
                UPDATE travel_time SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % travel_time records', rows_updated;
                END IF;
                
                -- Migrate ata
                UPDATE ata SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % ata records', rows_updated;
                END IF;
                
                -- Migrate diary_entries (handle conflicts)
                DELETE FROM diary_entries de1
                WHERE de1.project_id = dup_id
                AND EXISTS (
                    SELECT 1 FROM diary_entries de2 
                    WHERE de2.project_id = keep_id 
                    AND de2.date = de1.date
                );
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Deleted % conflicting diary_entries', rows_updated;
                END IF;
                
                UPDATE diary_entries SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % diary_entries', rows_updated;
                END IF;
                
                -- Migrate checklists
                UPDATE checklists SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % checklists', rows_updated;
                END IF;
                
                -- Migrate assignments
                UPDATE assignments SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % assignments', rows_updated;
                END IF;
                
                -- Migrate invoice_basis (if table exists)
                BEGIN
                    UPDATE invoice_basis SET project_id = keep_id WHERE project_id = dup_id;
                    GET DIAGNOSTICS rows_updated = ROW_COUNT;
                    IF rows_updated > 0 THEN
                        RAISE NOTICE '    Migrated % invoice_basis records', rows_updated;
                    END IF;
                EXCEPTION WHEN undefined_table THEN
                    -- Table doesn't exist, skip
                    NULL;
                END;
                
                -- Migrate fixed_time_blocks (if table exists)
                BEGIN
                    UPDATE fixed_time_blocks SET project_id = keep_id WHERE project_id = dup_id;
                    GET DIAGNOSTICS rows_updated = ROW_COUNT;
                    IF rows_updated > 0 THEN
                        RAISE NOTICE '    Migrated % fixed_time_blocks records', rows_updated;
                    END IF;
                EXCEPTION WHEN undefined_table THEN
                    -- Table doesn't exist, skip
                    NULL;
                END;
                
                -- Migrate project_members (handle conflicts)
                DELETE FROM project_members pm1
                WHERE pm1.project_id = dup_id
                AND EXISTS (
                    SELECT 1 FROM project_members pm2 
                    WHERE pm2.project_id = keep_id 
                    AND pm2.user_id = pm1.user_id
                );
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Deleted % conflicting project_members', rows_updated;
                END IF;
                
                UPDATE project_members SET project_id = keep_id WHERE project_id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                IF rows_updated > 0 THEN
                    RAISE NOTICE '    Migrated % project_members', rows_updated;
                END IF;
                
                -- Delete the duplicate project
                DELETE FROM projects WHERE id = dup_id;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                
                IF rows_updated = 1 THEN
                    RAISE NOTICE '  ✅ Successfully deleted duplicate project ID: %', dup_id;
                ELSE
                    RAISE WARNING '  ⚠️  Expected to delete 1 project but deleted %', rows_updated;
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                error_message := SQLERRM;
                RAISE WARNING '  ❌ Error processing duplicate project %: %', dup_id, error_message;
                -- Continue with next duplicate instead of stopping
            END;
        END LOOP;
        
        RAISE NOTICE 'Completed processing for project: %', dup_record.name;
    END LOOP;
    
    RAISE NOTICE '✅ Finished processing all duplicate projects';
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Fatal error: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Verify no duplicates remain
-- ============================================================================
SELECT 
    org_id,
    name,
    COALESCE(project_number, '') as project_number,
    COUNT(*) as count
FROM projects
WHERE name IS NOT NULL
GROUP BY org_id, name, COALESCE(project_number, '')
HAVING COUNT(*) > 1;

-- If the above query returns no rows, all duplicates have been removed successfully.

