-- Migration: Create fortnox_invoice_links table
-- Description: Links locked invoice_basis records to exported Fortnox invoices
-- Date: 2025-11-17

CREATE TABLE IF NOT EXISTS public.fortnox_invoice_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_basis_id UUID NOT NULL REFERENCES invoice_basis(id) ON DELETE CASCADE,
    fortnox_invoice_number TEXT NOT NULL,
    fortnox_document_id TEXT,
    payload_json JSONB,
    response_json JSONB,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'failed', 'cancelled')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, invoice_basis_id)
);

CREATE INDEX IF NOT EXISTS idx_fortnox_invoice_links_org_id ON public.fortnox_invoice_links(org_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_invoice_links_invoice_basis_id ON public.fortnox_invoice_links(invoice_basis_id);
CREATE INDEX IF NOT EXISTS idx_fortnox_invoice_links_status ON public.fortnox_invoice_links(status);
CREATE INDEX IF NOT EXISTS idx_fortnox_invoice_links_fortnox_invoice_number ON public.fortnox_invoice_links(fortnox_invoice_number);

COMMENT ON TABLE public.fortnox_invoice_links IS 'Links locked invoice_basis records to exported Fortnox invoices';
COMMENT ON COLUMN public.fortnox_invoice_links.fortnox_invoice_number IS 'Invoice number assigned by Fortnox';
COMMENT ON COLUMN public.fortnox_invoice_links.fortnox_document_id IS 'Fortnox document ID for the invoice';
COMMENT ON COLUMN public.fortnox_invoice_links.payload_json IS 'The invoice payload sent to Fortnox API';
COMMENT ON COLUMN public.fortnox_invoice_links.response_json IS 'The full response from Fortnox API';
COMMENT ON COLUMN public.fortnox_invoice_links.status IS 'Status of the export: created, failed, or cancelled';
COMMENT ON COLUMN public.fortnox_invoice_links.error_message IS 'Error message if status is failed';

-- Enable RLS and define org-based policies
ALTER TABLE public.fortnox_invoice_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fortnox invoice links in their org" ON public.fortnox_invoice_links;
DROP POLICY IF EXISTS "Admin, finance, and foreman can view fortnox invoice links" ON public.fortnox_invoice_links;
DROP POLICY IF EXISTS "Admins and foremen can manage fortnox invoice links" ON public.fortnox_invoice_links;
DROP POLICY IF EXISTS "Admins and finance can manage fortnox invoice links" ON public.fortnox_invoice_links;

CREATE POLICY "Admin, finance, and foreman can view fortnox invoice links"
    ON public.fortnox_invoice_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_invoice_links.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance', 'foreman')
        )
    );

CREATE POLICY "Admins and finance can manage fortnox invoice links"
    ON public.fortnox_invoice_links
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = fortnox_invoice_links.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'finance')
        )
    );

