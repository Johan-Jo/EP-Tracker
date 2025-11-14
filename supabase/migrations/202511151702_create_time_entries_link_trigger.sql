-- Create trigger function for linking time entries to employees/subcontractors
-- Date: 2025-11-15
-- Part 2: Trigger and function (run after schema changes)

-- Function to automatically link time entries to employees/subcontractors based on user_id
CREATE OR REPLACE FUNCTION link_time_entries_to_registers()
RETURNS TRIGGER AS $$
DECLARE
    emp_id UUID;
    sub_id UUID;
BEGIN
    -- Only process if both IDs are NULL and user_id exists
    IF NEW.user_id IS NOT NULL AND NEW.employee_id IS NULL AND NEW.subcontractor_id IS NULL THEN
        -- Try employee first (most common case)
        SELECT id INTO emp_id
        FROM public.employees
        WHERE user_id = NEW.user_id
        AND org_id = NEW.org_id
        AND is_archived = FALSE
        LIMIT 1;

        IF emp_id IS NOT NULL THEN
            NEW.employee_id := emp_id;
        ELSE
            -- Try subcontractor if not found as employee
            SELECT id INTO sub_id
            FROM public.subcontractors
            WHERE user_id = NEW.user_id
            AND org_id = NEW.org_id
            AND is_archived = FALSE
            LIMIT 1;

            IF sub_id IS NOT NULL THEN
                NEW.subcontractor_id := sub_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link time entries
DROP TRIGGER IF EXISTS trigger_link_time_entries_to_registers ON public.time_entries;
CREATE TRIGGER trigger_link_time_entries_to_registers
    BEFORE INSERT OR UPDATE ON public.time_entries
    FOR EACH ROW
    WHEN (NEW.employee_id IS NULL AND NEW.subcontractor_id IS NULL)
    EXECUTE FUNCTION link_time_entries_to_registers();

-- Note: Backfill of existing time entries is handled in a separate migration
-- (202511151701_backfill_time_entries_links.sql) to avoid timeout issues.
-- The trigger above will automatically link all NEW time entries going forward.

