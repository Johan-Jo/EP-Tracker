-- Delete user johan@estimatepro.se and all related data
-- Run this in Supabase SQL Editor

-- 1. Get the user ID first
DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- Find user ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'johan@estimatepro.se';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User johan@estimatepro.se not found';
        RETURN;
    END IF;

    RAISE NOTICE 'Found user: %', v_user_id;

    -- Find organization ID
    SELECT org_id INTO v_org_id
    FROM public.memberships
    WHERE user_id = v_user_id
    LIMIT 1;

    RAISE NOTICE 'Found organization: %', v_org_id;

    -- Delete in order (respecting foreign keys)
    
    -- Time entries
    DELETE FROM public.time_entries WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted time entries';

    -- Materials
    DELETE FROM public.materials WHERE created_by = v_user_id;
    RAISE NOTICE 'Deleted materials';

    -- Expenses
    DELETE FROM public.expenses WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted expenses';

    -- Diary entries
    DELETE FROM public.diary_entries WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted diary entries';

    -- ATA entries
    DELETE FROM public.ata_entries WHERE created_by = v_user_id;
    RAISE NOTICE 'Deleted ATA entries';

    -- Checklist items
    DELETE FROM public.checklist_items WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted checklist items';

    -- Planning assignments
    DELETE FROM public.planning_assignments WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted planning assignments';

    -- Approvals
    DELETE FROM public.approvals WHERE approved_by = v_user_id;
    RAISE NOTICE 'Deleted approvals';

    -- Project members
    DELETE FROM public.project_members WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted project members';

    -- Memberships
    DELETE FROM public.memberships WHERE user_id = v_user_id;
    RAISE NOTICE 'Deleted memberships';

    -- Profile
    DELETE FROM public.profiles WHERE id = v_user_id;
    RAISE NOTICE 'Deleted profile';

    -- Delete organization if it's now empty
    IF v_org_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.memberships WHERE org_id = v_org_id) THEN
            -- Delete organization data
            DELETE FROM public.projects WHERE org_id = v_org_id;
            DELETE FROM public.organizations WHERE id = v_org_id;
            RAISE NOTICE 'Deleted empty organization: %', v_org_id;
        END IF;
    END IF;

    -- Finally, delete from auth.users (this requires service_role)
    DELETE FROM auth.users WHERE id = v_user_id;
    RAISE NOTICE 'Deleted user from auth.users';

    RAISE NOTICE 'Successfully deleted user johan@estimatepro.se';
END $$;

