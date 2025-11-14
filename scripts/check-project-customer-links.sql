-- Check which projects have customers linked
-- This script helps identify projects that need customer linking

-- Step 1: List all projects with their customer information
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    p.customer_id,
    CASE 
        WHEN p.customer_id IS NULL THEN '❌ Ingen kund kopplad'
        WHEN c.id IS NULL THEN '⚠️ Ogiltigt customer_id'
        ELSE '✅ Kund kopplad'
    END as customer_status,
    c.customer_no,
    c.type as customer_type,
    CASE 
        WHEN c.type = 'COMPANY' THEN c.company_name
        ELSE CONCAT(c.first_name, ' ', c.last_name)
    END as customer_name,
    c.org_no,
    c.terms as payment_terms,
    c.reference,
    c.rot_enabled,
    c.invoice_address_street,
    c.delivery_address_street
FROM public.projects p
LEFT JOIN public.customers c ON c.id = p.customer_id
ORDER BY 
    CASE 
        WHEN p.customer_id IS NULL THEN 1
        WHEN c.id IS NULL THEN 2
        ELSE 3
    END,
    p.name;

-- Step 2: Find projects without customer_id (these need to be linked)
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    'Ingen kund kopplad' as status
FROM public.projects p
WHERE p.customer_id IS NULL
ORDER BY p.name;

-- Step 3: Find projects with invalid customer_id (customer doesn't exist)
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    p.customer_id,
    'Ogiltigt customer_id - kunden finns inte' as status
FROM public.projects p
WHERE p.customer_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id = p.customer_id
)
ORDER BY p.name;

-- Step 4: Find customer "Snickarna AB" and show which projects should be linked
SELECT 
    c.id as customer_id,
    c.customer_no,
    c.company_name,
    c.org_no,
    c.terms,
    c.reference,
    c.rot_enabled,
    COUNT(p.id) as linked_projects_count,
    STRING_AGG(p.name, ', ') as linked_projects
FROM public.customers c
LEFT JOIN public.projects p ON p.customer_id = c.id
WHERE c.company_name ILIKE '%Snickarna%'
   OR c.company_name ILIKE '%snickarna%'
GROUP BY c.id, c.customer_no, c.company_name, c.org_no, c.terms, c.reference, c.rot_enabled;

-- Step 5: Show detailed info for projects linked to "Snickarna Ab"
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.project_number,
    p.customer_id,
    c.company_name,
    c.terms as customer_terms,
    c.reference as customer_reference,
    c.rot_enabled as customer_rot_enabled,
    c.invoice_address_street,
    c.delivery_address_street
FROM public.projects p
INNER JOIN public.customers c ON c.id = p.customer_id
WHERE c.id = '944ff0fd-d585-4925-966b-3689ec70c6ca'
ORDER BY p.name;

-- Step 6: Check invoice_basis data for "Fast och Löpande" project
SELECT 
    ib.id,
    ib.project_id,
    p.name as project_name,
    ib.period_start,
    ib.period_end,
    ib.customer_id,
    ib.payment_terms_days,
    ib.your_ref,
    ib.rot_rut_flag,
    ib.invoice_address_json,
    ib.delivery_address_json,
    ib.customer_snapshot,
    ib.locked,
    ib.updated_at
FROM public.invoice_basis ib
INNER JOIN public.projects p ON p.id = ib.project_id
WHERE p.name = 'Fast och Löpande'
ORDER BY ib.period_start DESC, ib.period_end DESC
LIMIT 5;

