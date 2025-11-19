-- Migration: Create fortnox_payroll_links table
-- Description: Links locked payroll_basis records to exported Fortnox payroll transactions
-- Date: 2025-01-18

CREATE TABLE IF NOT EXISTS public.fortnox_payroll_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payroll_basis_id UUID NOT NULL REFERENCES payroll_basis(id) ON DELETE CASCADE,
    fortnox_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'exported' CHECK (status IN ('exported', 'failed')),
    error_message TEXT,
    payload_json JSONB,
    response_json JSONB,
    exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exported_by UUID NOT NULL REFERENCES profiles(id),
    UNIQUE(org_id, payroll_basis_id)
);

CREATE INDEX IF NOT EXISTS idx_fortnox_payroll_links_org_id ON public.fortnox_payroll_links(org_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_payroll_links_payroll_basis_id ON public.fortnox_payroll_links(payroll_basis_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_payroll_links_status ON public.fortnox_payroll_links(status);
CREATE INDEX IF NOT EXISTS idx_fortnox_payroll_links_exported_at ON public.fortnox_payroll_links(exported_at);

COMMENT ON TABLE public.fortnox_payroll_links IS 'Links locked payroll_basis records to exported Fortnox payroll transactions';
COMMENT ON COLUMN public.fortnox_payroll_links.fortnox_transaction_ids IS 'Array of Fortnox transaction IDs (SalaryRow for salary transactions, id for attendance transactions)';
COMMENT ON COLUMN public.fortnox_payroll_links.status IS 'Status of the export: exported or failed';
COMMENT ON COLUMN public.fortnox_payroll_links.error_message IS 'Error message if status is failed';
COMMENT ON COLUMN public.fortnox_payroll_links.payload_json IS 'The payroll payload sent to Fortnox API (sanitized, minimal PII)';
COMMENT ON COLUMN public.fortnox_payroll_links.response_json IS 'The full response from Fortnox API';
COMMENT ON COLUMN public.fortnox_payroll_links.exported_at IS 'When the export was performed';
COMMENT ON COLUMN public.fortnox_payroll_links.exported_by IS 'User who performed the export';

-- Enable RLS and define org-based policies
ALTER TABLE public.fortnox_payroll_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fortnox payroll links in their org" ON public.fortnox_payroll_links;
DROP POLICY IF EXISTS "Admin, finance, and foreman can view fortnox payroll links" ON public.fortnox_payroll_links;
DROP POLICY IF EXISTS "Admins and foremen can manage fortnox payroll links" ON public.fortnox_payroll_links;
DROP POLICY IF EXISTS "Admins and finance can manage fortnox payroll links" ON public.fortnox_payroll_links;

CREATE POLICY "Admin, finance, and foreman can view fortnox payroll links"
    ON public.fortnox_payroll_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_payroll_links.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance', 'foreman')
        )
    );

CREATE POLICY "Admins and foremen can manage fortnox payroll links"
    ON public.fortnox_payroll_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_payroll_links.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'foreman')
        )
    );

