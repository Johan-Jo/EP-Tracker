-- Fix work order number generation race condition with proper retry logic
-- This migration improves the trigger function to handle concurrent inserts better
-- Date: 2025-02-04

-- ============================================================================
-- UPDATE: TRIGGER FUNCTION (with retry logic and double-check)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year INTEGER;
    v_number TEXT;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 10;
    v_next_num INTEGER;
    v_lock_key BIGINT;
    v_found BOOLEAN;
BEGIN
    -- Only generate if not already set
    IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
        v_year := EXTRACT(YEAR FROM NOW());
        
        -- Use advisory lock to prevent race conditions
        v_lock_key := ('x' || substr(md5(NEW.organization_id::TEXT || v_year::TEXT), 1, 16))::bit(64)::bigint;
        PERFORM pg_advisory_xact_lock(v_lock_key);
        
        -- Retry loop to handle any remaining race conditions
        LOOP
            -- Get the next sequential number for this org and year
            -- Advisory lock already prevents race conditions, no need for FOR UPDATE with aggregates
            SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
            INTO v_next_num
            FROM work_orders
            WHERE organization_id = NEW.organization_id
              AND work_order_number LIKE 'WO-' || v_year || '-%';
            
            -- Format: WO-YYYY-NNN
            v_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
            
            -- Double-check if this number already exists (handles race conditions)
            SELECT EXISTS(
                SELECT 1 FROM work_orders 
                WHERE work_order_number = v_number 
                AND organization_id = NEW.organization_id
            ) INTO v_found;
            
            -- If not found, use this number
            IF NOT v_found THEN
                NEW.work_order_number := v_number;
                EXIT;
            END IF;
            
            -- If found, increment and retry
            v_retry_count := v_retry_count + 1;
            IF v_retry_count >= v_max_retries THEN
                -- Fallback: use timestamp-based number to ensure uniqueness
                v_number := 'WO-' || v_year || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
                NEW.work_order_number := v_number;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

