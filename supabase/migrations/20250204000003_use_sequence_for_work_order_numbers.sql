-- Use sequences for work order number generation to guarantee uniqueness
-- This is a more robust solution than MAX() queries
-- Date: 2025-02-04

-- ============================================================================
-- CREATE SEQUENCE TABLE FOR TRACKING WORK ORDER NUMBER SEQUENCES
-- ============================================================================

-- Table to track sequences per organization and year
CREATE TABLE IF NOT EXISTS work_order_number_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, year)
);

CREATE INDEX IF NOT EXISTS idx_work_order_number_sequences_org_year ON work_order_number_sequences(organization_id, year);

-- ============================================================================
-- FUNCTION: GET OR CREATE SEQUENCE FOR ORG/YEAR
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_work_order_sequence(p_org_id UUID, p_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_last_num INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Use advisory lock to prevent race conditions
    v_lock_key := ('x' || substr(md5(p_org_id::TEXT || p_year::TEXT), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Try to get existing sequence
    SELECT last_number INTO v_last_num
    FROM work_order_number_sequences
    WHERE organization_id = p_org_id AND year = p_year
    FOR UPDATE;  -- Lock the row
    
    -- If not found, create it
    IF v_last_num IS NULL THEN
        -- Get the highest existing number for this org/year
        SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM 8) AS INTEGER)), 0)
        INTO v_last_num
        FROM work_orders
        WHERE organization_id = p_org_id
          AND work_order_number LIKE 'WO-' || p_year || '-%';
        
        -- Insert new sequence record
        INSERT INTO work_order_number_sequences (organization_id, year, last_number)
        VALUES (p_org_id, p_year, v_last_num)
        ON CONFLICT (organization_id, year) DO UPDATE
        SET last_number = GREATEST(work_order_number_sequences.last_number, EXCLUDED.last_number);
        
        -- Get the value we just set
        SELECT last_number INTO v_last_num
        FROM work_order_number_sequences
        WHERE organization_id = p_org_id AND year = p_year;
    END IF;
    
    -- Increment and update
    v_last_num := v_last_num + 1;
    UPDATE work_order_number_sequences
    SET last_number = v_last_num,
        updated_at = NOW()
    WHERE organization_id = p_org_id AND year = p_year;
    
    RETURN v_last_num;
END;
$$;

-- ============================================================================
-- UPDATE: TRIGGER FUNCTION (using sequence table)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_work_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_year INTEGER;
    v_number TEXT;
    v_next_num INTEGER;
BEGIN
    -- Only generate if not already set
    IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
        v_year := EXTRACT(YEAR FROM NOW());
        
        -- Get next number from sequence (atomic operation)
        v_next_num := get_or_create_work_order_sequence(NEW.organization_id, v_year);
        
        -- Format: WO-YYYY-NNN
        v_number := 'WO-' || v_year || '-' || LPAD(v_next_num::TEXT, 3, '0');
        NEW.work_order_number := v_number;
    END IF;
    RETURN NEW;
END;
$$;

