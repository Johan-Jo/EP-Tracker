-- Fix work order number generation race condition
-- Uses advisory locks to prevent duplicate work_order_number values
-- Date: 2025-01-27

-- ============================================================================
-- UPDATE: WORK ORDER NUMBER GENERATION FUNCTION (with advisory lock)
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_work_order_number(p_org_id UUID, p_year INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_next_num INTEGER;
    v_number TEXT;
    v_lock_key BIGINT;
BEGIN
    -- Use advisory lock based on org_id and year to prevent race conditions
    -- Convert UUID to bigint for lock (using hash)
    v_lock_key := ('x' || substr(md5(p_org_id::TEXT || p_year::TEXT), 1, 16))::bit(64)::bigint;
    
    -- Acquire lock (waits until available, released on transaction commit/rollback)
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Get the next sequential number for this org and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
    INTO v_next_num
    FROM work_orders
    WHERE organization_id = p_org_id
      AND work_order_number LIKE 'WO-' || p_year || '-%';
    
    -- Format: WO-YYYY-NNN
    v_number := 'WO-' || p_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
    
    -- Lock is automatically released when transaction commits/rolls back
    RETURN v_number;
END;
$$;

-- ============================================================================
-- UPDATE: TRIGGER FUNCTION (with advisory lock and retry logic)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year INTEGER;
    v_number TEXT;
    v_next_num INTEGER;
    v_lock_key BIGINT;
    v_retry_count INTEGER := 0;
    v_max_retries INTEGER := 10;
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
            SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0) + 1
            INTO v_next_num
            FROM work_orders
            WHERE organization_id = NEW.organization_id
              AND work_order_number LIKE 'WO-' || v_year || '-%';
            
            -- Format: WO-YYYY-NNN
            v_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
            
            -- Check if this number already exists (double-check)
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

