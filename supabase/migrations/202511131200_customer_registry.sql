-- M1: Customer Registry Foundation
-- Creates customers and customer_contacts tables, links projects to customers
-- Date: 2025-11-13

-- ============================================================================
-- CUSTOMER TYPE AND INVOICE METHOD ENUMS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
        CREATE TYPE customer_type AS ENUM ('COMPANY', 'PRIVATE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_method') THEN
        CREATE TYPE invoice_method AS ENUM ('EMAIL', 'EFAKTURA', 'PAPER');
    END IF;
END $$;

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_no TEXT NOT NULL,
    type customer_type NOT NULL,
    
    -- Company fields
    company_name TEXT,
    org_no TEXT,
    vat_no TEXT,
    f_tax BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Private customer fields
    first_name TEXT,
    last_name TEXT,
    personal_identity_no TEXT,
    rot_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    property_designation TEXT,
    housing_assoc_org_no TEXT,
    apartment_no TEXT,
    ownership_share DECIMAL(5, 2),
    rot_consent_at TIMESTAMPTZ,
    
    -- Invoice settings
    invoice_email TEXT,
    invoice_method invoice_method NOT NULL DEFAULT 'EMAIL',
    peppol_id TEXT,
    gln TEXT,
    terms INTEGER,
    default_vat_rate INTEGER NOT NULL DEFAULT 25 CHECK (default_vat_rate IN (0, 6, 12, 25)),
    bankgiro TEXT,
    plusgiro TEXT,
    reference TEXT,
    
    -- Addresses
    invoice_address_street TEXT,
    invoice_address_zip TEXT,
    invoice_address_city TEXT,
    invoice_address_country TEXT,
    delivery_address_street TEXT,
    delivery_address_zip TEXT,
    delivery_address_city TEXT,
    delivery_address_country TEXT,
    
    -- Contact
    phone_mobile TEXT,
    notes TEXT,
    
    -- Metadata
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customers_org_customer_no_unique UNIQUE (org_id, customer_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_customer_no ON public.customers(customer_no);
CREATE INDEX IF NOT EXISTS idx_customers_org_no ON public.customers(org_no) WHERE org_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_personal_id ON public.customers(personal_identity_no) WHERE personal_identity_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_is_archived ON public.customers(is_archived) WHERE is_archived = FALSE;

-- Partial unique indexes (for conditional uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_org_no_unique 
    ON public.customers(org_id, org_no) 
    WHERE org_no IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_org_personal_id_unique 
    ON public.customers(org_id, personal_identity_no) 
    WHERE personal_identity_no IS NOT NULL;

-- ============================================================================
-- CUSTOMER CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    phone TEXT,
    reference_code TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_org_id ON public.customer_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_is_primary ON public.customer_contacts(is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- LINK PROJECTS TO CUSTOMERS
-- ============================================================================

-- Add customer_id column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Create index for customer_id
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON public.projects(customer_id) WHERE customer_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- Customers: Users can only see customers in their organization
CREATE POLICY "Users can view customers in their organization"
    ON public.customers FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Customers: Only admin and foreman can insert/update/delete
CREATE POLICY "Admin and foreman can manage customers"
    ON public.customers FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid() 
            AND is_active = TRUE 
            AND role IN ('admin', 'foreman')
        )
    );

-- Customer contacts: Same rules as customers
CREATE POLICY "Users can view customer contacts in their organization"
    ON public.customer_contacts FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

CREATE POLICY "Admin and foreman can manage customer contacts"
    ON public.customer_contacts FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid() 
            AND is_active = TRUE 
            AND role IN ('admin', 'foreman')
        )
    );

-- ============================================================================
-- DATA MIGRATION: Seed customers from existing projects
-- ============================================================================

-- Migrate existing client_name values to customers table
-- This creates a customer for each unique client_name in projects
DO $$
DECLARE
    project_record RECORD;
    new_customer_id UUID;
    customer_no_counter INTEGER := 1;
BEGIN
    -- Only run if customers table is empty
    IF (SELECT COUNT(*) FROM public.customers) = 0 THEN
        FOR project_record IN 
            SELECT DISTINCT 
                p.org_id,
                p.client_name,
                p.created_by
            FROM public.projects p
            WHERE p.client_name IS NOT NULL 
            AND p.client_name != ''
            ORDER BY p.org_id, p.client_name
        LOOP
            -- Generate customer number
            new_customer_id := uuid_generate_v4();
            
            -- Insert customer
            INSERT INTO public.customers (
                id,
                org_id,
                customer_no,
                type,
                company_name,
                created_by
            ) VALUES (
                new_customer_id,
                project_record.org_id,
                'C-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(customer_no_counter::TEXT, 4, '0'),
                'COMPANY',
                project_record.client_name,
                project_record.created_by
            )
            ON CONFLICT DO NOTHING;
            
            -- Update projects to link to this customer
            UPDATE public.projects
            SET customer_id = new_customer_id
            WHERE org_id = project_record.org_id
            AND client_name = project_record.client_name
            AND customer_id IS NULL;
            
            customer_no_counter := customer_no_counter + 1;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Master register for customers (companies and private individuals)';
COMMENT ON TABLE public.customer_contacts IS 'Contact persons associated with customers';
COMMENT ON COLUMN public.projects.customer_id IS 'Reference to customer in master register';

