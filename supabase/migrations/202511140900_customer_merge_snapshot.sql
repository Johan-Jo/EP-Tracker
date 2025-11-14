-- M2: Customer merge helpers + invoice basis customer snapshot
-- Adds customer_snapshot column on invoice_basis and ensures merge operations
-- can archive duplicates while keeping references intact.

-- ============================================================================
-- INVOICE BASIS SNAPSHOT
-- ============================================================================

DO $$
DECLARE
	should_add_column BOOLEAN := to_regclass('public.invoice_basis') IS NOT NULL;
	should_create_view BOOLEAN := to_regclass('public.customers') IS NOT NULL;
BEGIN
	IF should_add_column THEN
		EXECUTE 'ALTER TABLE public.invoice_basis ADD COLUMN IF NOT EXISTS customer_snapshot JSONB';
		EXECUTE 'COMMENT ON COLUMN public.invoice_basis.customer_snapshot IS ''Frozen customer data captured when invoice basis is locked''';
	ELSE
		RAISE NOTICE 'Skipping customer_snapshot column (invoice_basis not found)';
	END IF;

	IF should_create_view THEN
		EXECUTE $view$
			CREATE OR REPLACE VIEW public.customer_merge_relations AS
			SELECT
				c.id AS customer_id,
				c.org_id,
				COUNT(DISTINCT p.id) AS project_count,
				COUNT(DISTINCT cc.id) AS contact_count,
				COUNT(DISTINCT ib.id) AS invoice_basis_count
			FROM public.customers c
			LEFT JOIN public.projects p
				ON p.customer_id = c.id
			LEFT JOIN public.customer_contacts cc
				ON cc.customer_id = c.id
			LEFT JOIN public.invoice_basis ib
				ON ib.customer_id = c.id
			GROUP BY c.id, c.org_id;
		$view$;
		EXECUTE 'COMMENT ON VIEW public.customer_merge_relations IS ''Pre-aggregated relation counts to display during merge operations''';
	ELSE
		RAISE NOTICE 'Skipping customer_merge_relations view (customers table not found)';
	END IF;
END;
$$;


