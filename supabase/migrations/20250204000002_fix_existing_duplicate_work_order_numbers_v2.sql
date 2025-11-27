-- Fix any existing duplicate work_order_number values
-- This migration fixes duplicates that may have been created before the race condition fix
-- Date: 2025-02-04

-- ============================================================================
-- FIX EXISTING DUPLICATE WORK ORDER NUMBERS
-- ============================================================================

DO $$
DECLARE
    v_duplicate RECORD;
    v_new_number TEXT;
    v_year INTEGER;
    v_next_num INTEGER;
    v_org_id UUID;
    v_work_order RECORD;
    v_counter INTEGER;
BEGIN
    -- Find all duplicate work_order_numbers
    FOR v_duplicate IN
        SELECT organization_id, work_order_number, COUNT(*) as cnt
        FROM work_orders
        GROUP BY organization_id, work_order_number
        HAVING COUNT(*) > 1
        ORDER BY organization_id, work_order_number
    LOOP
        -- Get the year from the work_order_number (format: WO-YYYY-NNN)
        v_year := CAST(SUBSTRING(v_duplicate.work_order_number FROM 4 FOR 4) AS INTEGER);
        v_org_id := v_duplicate.organization_id;
        
        -- Get all but the first occurrence of each duplicate (ordered by created_at)
        v_counter := 0;
        FOR v_work_order IN
            SELECT id, work_order_number, created_at
            FROM work_orders
            WHERE organization_id = v_org_id
              AND work_order_number = v_duplicate.work_order_number
            ORDER BY created_at
        LOOP
            -- Skip the first one (keep the oldest)
            IF v_counter = 0 THEN
                v_counter := v_counter + 1;
                CONTINUE;
            END IF;
            
            -- Generate a new unique number
            SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
            INTO v_next_num
            FROM work_orders
            WHERE organization_id = v_org_id
              AND work_order_number LIKE 'WO-' || v_year || '-%';
            
            -- Format: WO-YYYY-NNN
            v_new_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
            
            -- Double-check if this number already exists
            WHILE EXISTS (
                SELECT 1 FROM work_orders 
                WHERE organization_id = v_org_id 
                AND work_order_number = v_new_number
            ) LOOP
                v_next_num := v_next_num + 1;
                v_new_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
            END LOOP;
            
            -- Update the duplicate with the new number
            UPDATE work_orders
            SET work_order_number = v_new_number,
                updated_at = NOW()
            WHERE id = v_work_order.id;
            
            RAISE NOTICE 'Fixed duplicate work_order_number: % -> % (org: %, created: %)', 
                v_work_order.work_order_number, v_new_number, v_org_id, v_work_order.created_at;
            
            v_counter := v_counter + 1;
        END LOOP;
    END LOOP;
END;
$$;

