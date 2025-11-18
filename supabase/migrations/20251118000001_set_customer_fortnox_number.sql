-- Fortnox Customer Number Migration
-- 
-- This migration sets fortnox_customer_number for customers that were imported from Fortnox.
-- When customers are imported from Fortnox, the internal customer_no is set to the Fortnox CustomerNumber.
-- So for customers where customer_no looks like a Fortnox CustomerNumber (numeric, 1-99999),
-- and fortnox_customer_number is NULL, we set fortnox_customer_number = customer_no.
--
-- IMPORTANT: After running this migration, you should:
-- 1. Go to Settings > Fortnox Integration
-- 2. Click "Importera kunder" (Import Customers) to update any remaining customers
--
-- The import logic will match customers by:
-- 1. org_no/personal_identity_no (handling dash variations)
-- 2. fortnox_customer_number (if already set)
-- 3. customer_no (as fallback)

-- Set fortnox_customer_number = customer_no for customers imported from Fortnox
-- Fortnox CustomerNumbers are typically numeric (1-99999)
-- We only update if fortnox_customer_number is NULL or empty
-- We skip customer_no values that look like auto-generated (e.g., "C-XXXXXX")
UPDATE customers
SET fortnox_customer_number = customer_no
WHERE (fortnox_customer_number IS NULL OR fortnox_customer_number = '')
  AND customer_no ~ '^\d+$'  -- Only numeric customer_no (Fortnox format)
  AND customer_no::INTEGER BETWEEN 1 AND 99999  -- Reasonable Fortnox CustomerNumber range
  AND customer_no NOT LIKE 'C-%';  -- Skip auto-generated customer numbers

-- Normalize org_no format for better matching
-- This helps ensure customers can be matched even if org_no is stored with/without dash
UPDATE customers
SET org_no = CASE 
    WHEN type = 'COMPANY' AND org_no IS NOT NULL AND LENGTH(REPLACE(org_no, '-', '')) = 10 THEN
        -- Format as YYYYMM-DDDD (10 digits without dash becomes 10 digits with dash)
        LEFT(REPLACE(org_no, '-', ''), 6) || '-' || RIGHT(REPLACE(org_no, '-', ''), 4)
    ELSE
        org_no
END
WHERE type = 'COMPANY' 
  AND org_no IS NOT NULL
  AND LENGTH(REPLACE(org_no, '-', '')) = 10
  AND org_no NOT LIKE '%-%';

-- Report customers missing Fortnox customer numbers
DO $$
DECLARE
    missing_count INTEGER;
    company_missing INTEGER;
    private_missing INTEGER;
    normalized_count INTEGER;
    updated_count INTEGER;
BEGIN
    -- Count customers that got fortnox_customer_number set from customer_no
    SELECT COUNT(*) INTO updated_count
    FROM customers
    WHERE fortnox_customer_number IS NOT NULL
      AND fortnox_customer_number != ''
      AND customer_no ~ '^\d+$'
      AND customer_no::INTEGER BETWEEN 1 AND 99999
      AND fortnox_customer_number = customer_no;
    
    -- Count total customers missing Fortnox numbers
    SELECT COUNT(*) INTO missing_count
    FROM customers
    WHERE fortnox_customer_number IS NULL OR fortnox_customer_number = '';
    
    -- Count COMPANY customers missing Fortnox numbers
    SELECT COUNT(*) INTO company_missing
    FROM customers
    WHERE type = 'COMPANY'
       AND (fortnox_customer_number IS NULL OR fortnox_customer_number = '');
    
    -- Count PRIVATE customers missing Fortnox numbers
    SELECT COUNT(*) INTO private_missing
    FROM customers
    WHERE type = 'PRIVATE'
       AND (fortnox_customer_number IS NULL OR fortnox_customer_number = '');
    
    -- Count normalized org_no records
    SELECT COUNT(*) INTO normalized_count
    FROM customers
    WHERE type = 'COMPANY'
      AND org_no IS NOT NULL
      AND org_no LIKE '%-%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fortnox Customer Number Migration';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Set fortnox_customer_number from customer_no for % customer(s)', updated_count;
    RAISE NOTICE 'Normalized org_no format for % customer(s)', normalized_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Status Report:';
    RAISE NOTICE '  Total customers missing Fortnox number: %', missing_count;
    RAISE NOTICE '    - COMPANY customers: %', company_missing;
    RAISE NOTICE '    - PRIVATE customers: %', private_missing;
    RAISE NOTICE '';
    IF missing_count > 0 THEN
        RAISE NOTICE 'NEXT STEP - IMPORT REMAINING CUSTOMERS:';
        RAISE NOTICE '1. Go to Settings > Fortnox Integration';
        RAISE NOTICE '2. Click "Importera kunder" button';
        RAISE NOTICE '3. This will match remaining customers by org_no/personal_identity_no';
        RAISE NOTICE '   and set fortnox_customer_number for all matched customers.';
    ELSE
        RAISE NOTICE '✅ All customers have Fortnox customer numbers set!';
    END IF;
    RAISE NOTICE '========================================';
END $$;

