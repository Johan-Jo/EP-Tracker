-- EPIC 41 – Fixed Billing Data Model Foundations
-- Adds billing enums, project defaults, fixed time blocks, and billing metadata columns.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_type') THEN
        CREATE TYPE billing_type AS ENUM ('LOPANDE', 'FAST');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_billing_mode') THEN
        CREATE TYPE project_billing_mode AS ENUM ('LOPANDE_ONLY', 'FAST_ONLY', 'BOTH');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS fixed_time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount_sek NUMERIC(12, 2) NOT NULL,
    vat_pct NUMERIC(5, 2) NOT NULL DEFAULT 25,
    article_no TEXT,
    account_no TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    period_start DATE,
    period_end DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_time_blocks_org_id ON fixed_time_blocks (org_id);
CREATE INDEX IF NOT EXISTS idx_fixed_time_blocks_project_id ON fixed_time_blocks (project_id);

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS default_time_billing_type billing_type NOT NULL DEFAULT 'LOPANDE',
    ADD COLUMN IF NOT EXISTS default_ata_billing_type billing_type NOT NULL DEFAULT 'LOPANDE',
    ADD COLUMN IF NOT EXISTS billing_mode project_billing_mode NOT NULL DEFAULT 'LOPANDE_ONLY',
    ADD COLUMN IF NOT EXISTS quoted_amount_sek NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS project_hourly_rate_sek NUMERIC(12, 2);

ALTER TABLE time_entries
    ADD COLUMN IF NOT EXISTS billing_type billing_type NOT NULL DEFAULT 'LOPANDE',
    ADD COLUMN IF NOT EXISTS fixed_block_id UUID REFERENCES fixed_time_blocks(id);

CREATE INDEX IF NOT EXISTS idx_time_entries_project_billing ON time_entries (project_id, billing_type, fixed_block_id);

ALTER TABLE ata
    ADD COLUMN IF NOT EXISTS billing_type billing_type NOT NULL DEFAULT 'LOPANDE',
    ADD COLUMN IF NOT EXISTS fixed_amount_sek NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_ata_project_billing ON ata (project_id, billing_type);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'invoice_basis'
    ) THEN
        ALTER TABLE public.invoice_basis
            ADD COLUMN IF NOT EXISTS supports_fixed BOOLEAN NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END
$$;

ALTER TABLE fixed_time_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fixed time blocks in org" ON fixed_time_blocks;
CREATE POLICY "Users can view fixed time blocks in org"
	ON fixed_time_blocks
	FOR SELECT
	USING (
		EXISTS (
			SELECT 1
			FROM memberships
			WHERE memberships.org_id = fixed_time_blocks.org_id
				AND memberships.user_id = auth.uid()
				AND memberships.is_active = TRUE
		)
	);

DROP POLICY IF EXISTS "Admins and foremen manage fixed time blocks" ON fixed_time_blocks;
CREATE POLICY "Admins and foremen manage fixed time blocks"
	ON fixed_time_blocks
	FOR ALL
	USING (
		EXISTS (
			SELECT 1
			FROM memberships
			WHERE memberships.org_id = fixed_time_blocks.org_id
				AND memberships.user_id = auth.uid()
				AND memberships.is_active = TRUE
				AND memberships.role IN ('admin', 'foreman')
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1
			FROM memberships
			WHERE memberships.org_id = fixed_time_blocks.org_id
				AND memberships.user_id = auth.uid()
				AND memberships.is_active = TRUE
				AND memberships.role IN ('admin', 'foreman')
		)
	);

