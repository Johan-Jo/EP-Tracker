-- EPIC 34: Create invoice_basis table with Swedish invoice compliance fields
-- Phase 1 (M4a): Read-only invoice basis view with header, totals and line payload

CREATE TABLE IF NOT EXISTS public.invoice_basis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Invoice header (Swedish requirements)
    customer_id UUID,
    invoice_series TEXT,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    payment_terms_days INTEGER,
    ocr_ref TEXT,
    currency TEXT NOT NULL DEFAULT 'SEK',
    fx_rate NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    our_ref TEXT,
    your_ref TEXT,
    reverse_charge_building BOOLEAN NOT NULL DEFAULT FALSE,
    rot_rut_flag BOOLEAN NOT NULL DEFAULT FALSE,
    worksite_address_json JSONB,
    worksite_id UUID,
    invoice_address_json JSONB,
    delivery_address_json JSONB,
    cost_center TEXT,
    result_unit TEXT,

    -- Payload
    lines_json JSONB NOT NULL DEFAULT jsonb_build_object(
        'lines', '[]'::jsonb,
        'diary', '[]'::jsonb
    ),
    totals JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Locking metadata
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by UUID REFERENCES profiles(id),
    locked_at TIMESTAMPTZ,
    hash_signature TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_invoice_basis_period UNIQUE (org_id, project_id, period_start, period_end),
    CONSTRAINT valid_invoice_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_invoice_basis_org_id ON public.invoice_basis(org_id);
CREATE INDEX IF NOT EXISTS idx_invoice_basis_project_id ON public.invoice_basis(project_id);
CREATE INDEX IF NOT EXISTS idx_invoice_basis_period ON public.invoice_basis(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoice_basis_locked ON public.invoice_basis(locked) WHERE locked = TRUE;

COMMENT ON TABLE public.invoice_basis IS 'Aggregated invoice basis per project and accounting period';
COMMENT ON COLUMN public.invoice_basis.lines_json IS 'Normalized invoice lines including diary summaries';
COMMENT ON COLUMN public.invoice_basis.totals IS 'Totals per VAT rate and invoice level (JSON payload)';
COMMENT ON COLUMN public.invoice_basis.hash_signature IS 'Snapshot hash captured when invoice basis is locked';

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_invoice_basis_updated_at ON public.invoice_basis;
CREATE TRIGGER update_invoice_basis_updated_at
    BEFORE UPDATE ON public.invoice_basis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and define org-based policies
ALTER TABLE public.invoice_basis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invoice basis in their org" ON public.invoice_basis;
DROP POLICY IF EXISTS "Admins and foremen can manage invoice basis" ON public.invoice_basis;

CREATE POLICY "Users can view invoice basis in their org"
    ON public.invoice_basis
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = invoice_basis.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
        )
    );

CREATE POLICY "Admins and foremen can manage invoice basis"
    ON public.invoice_basis
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM memberships
            WHERE memberships.org_id = invoice_basis.org_id
              AND memberships.user_id = auth.uid()
              AND memberships.is_active = TRUE
              AND memberships.role IN ('admin', 'foreman')
        )
    );


