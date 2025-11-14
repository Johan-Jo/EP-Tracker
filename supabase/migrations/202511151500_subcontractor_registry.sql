-- M3: Subcontractor (UE) Registry Foundation
-- Creates subcontractors table for the shared master register
-- Date: 2025-11-15

-- ============================================================================
-- SUBCONTRACTORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subcontractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subcontractor_no TEXT NOT NULL,
    
    -- Company information (UE are always companies)
    company_name TEXT NOT NULL,
    org_no TEXT NOT NULL,
    vat_no TEXT,
    f_tax BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Contact person (for UE companies)
    contact_person_name TEXT,
    contact_person_phone TEXT,
    
    -- Contact information
    email TEXT,
    phone_mobile TEXT,
    phone_work TEXT,
    
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
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subcontractors_org_subcontractor_no_unique UNIQUE (org_id, subcontractor_no)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subcontractors_org_id ON public.subcontractors(org_id);
CREATE INDEX IF NOT EXISTS idx_subcontractors_subcontractor_no ON public.subcontractors(subcontractor_no);
CREATE INDEX IF NOT EXISTS idx_subcontractors_org_no ON public.subcontractors(org_no) WHERE org_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subcontractors_is_archived ON public.subcontractors(is_archived) WHERE is_archived = FALSE;

-- Partial unique index for org_no (one per organization)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subcontractors_org_org_no_unique 
    ON public.subcontractors(org_id, org_no) 
    WHERE org_no IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

-- Subcontractors: Users can view subcontractors in their organization
CREATE POLICY "Users can view subcontractors in their organization"
    ON public.subcontractors FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid() AND is_active = TRUE
        )
    );

-- Subcontractors: Only admin and foreman can manage subcontractors
CREATE POLICY "Admin and foreman can manage subcontractors"
    ON public.subcontractors FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND role IN ('admin', 'foreman')
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.subcontractors IS 'Master register for subcontractors (UE - Underentreprenörer)';
COMMENT ON COLUMN public.subcontractors.subcontractor_no IS 'Unique identifier for the subcontractor within the organization (e.g., UE-2025-0001)';
COMMENT ON COLUMN public.subcontractors.company_name IS 'Company name of the subcontractor';
COMMENT ON COLUMN public.subcontractors.org_no IS 'Swedish organization number (organisationsnummer)';
COMMENT ON COLUMN public.subcontractors.vat_no IS 'VAT registration number (momsregistreringsnummer)';
COMMENT ON COLUMN public.subcontractors.f_tax IS 'F-tax status (F-skatt)';
COMMENT ON COLUMN public.subcontractors.contact_person_name IS 'Name of the primary contact person for the subcontractor';
COMMENT ON COLUMN public.subcontractors.contact_person_phone IS 'Phone number of the primary contact person';
COMMENT ON COLUMN public.subcontractors.invoice_method IS 'Invoice delivery method: EMAIL, EFAKTURA, or PAPER';

