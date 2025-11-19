BEGIN;

-- -------------------------------------------------------------------
-- fortnox_wage_type_mappings
-- Per-org mappning mellan EP:s interna lönekoder och Fortnox lönearter
-- Detta är en mer detaljerad tabell än fortnox_wage_code_mappings
-- som stödjer kategorier och fler attribut
-- -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fortnox_wage_type_mappings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

	org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

	-- EP:s interna kod, t.ex. 'TID_ORD', 'TID_OT_50', 'TRAKT_INRIKES_HELDAG'
	ep_code text NOT NULL,

	-- Kategori: används för logik/filtrering i EP-Tracker
	ep_category text NOT NULL CHECK (
		ep_category IN (
			'time',
			'ob',
			'overtime',
			'travel',
			'mileage',
			'absence',
			'expense',
			'other'
		)
	),

	-- Fortnox löneart / SalaryCode, t.ex. '110', '1476', '811'
	fortnox_salary_code text NOT NULL,

	-- Valfritt PAXml-kodfält (om ni vill återanvända samma mappning)
	paxml_code text NULL,

	description text NULL,

	is_default boolean NOT NULL DEFAULT false,

	created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
	updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.fortnox_wage_type_mappings IS
	'Per-organization mapping between EP wage codes and Fortnox SalaryCodes.';

COMMENT ON COLUMN public.fortnox_wage_type_mappings.ep_code IS
	'Internal EP wage code, e.g. TID_ORD, TID_OT_50, TRAKT_INRIKES_HELDAG.';

COMMENT ON COLUMN public.fortnox_wage_type_mappings.ep_category IS
	'Logical category: time, ob, overtime, travel, mileage, absence, expense or other.';

COMMENT ON COLUMN public.fortnox_wage_type_mappings.fortnox_salary_code IS
	'Fortnox SalaryCode / löneart code.';

CREATE UNIQUE INDEX IF NOT EXISTS fortnox_wage_type_mappings_org_ep_code_uidx
	ON public.fortnox_wage_type_mappings (org_id, ep_code);

CREATE INDEX IF NOT EXISTS fortnox_wage_type_mappings_org_category_idx
	ON public.fortnox_wage_type_mappings (org_id, ep_category);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_fortnox_wage_type_mappings_updated_at ON public.fortnox_wage_type_mappings;
CREATE TRIGGER update_fortnox_wage_type_mappings_updated_at
	BEFORE UPDATE ON public.fortnox_wage_type_mappings
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and define org-based policies
ALTER TABLE public.fortnox_wage_type_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view wage type mappings in their org" ON public.fortnox_wage_type_mappings;
DROP POLICY IF EXISTS "Admins and foremen can manage wage type mappings" ON public.fortnox_wage_type_mappings;

CREATE POLICY "Users can view wage type mappings in their org"
	ON public.fortnox_wage_type_mappings
	FOR SELECT
	USING (
		EXISTS (
			SELECT 1
			FROM memberships
			WHERE memberships.org_id = fortnox_wage_type_mappings.org_id
				AND memberships.user_id = auth.uid()
				AND memberships.is_active = TRUE
				AND memberships.role IN ('admin', 'finance', 'foreman')
		)
	);

CREATE POLICY "Admins and foremen can manage wage type mappings"
	ON public.fortnox_wage_type_mappings
	FOR ALL
	USING (
		EXISTS (
			SELECT 1
			FROM memberships
			WHERE memberships.org_id = fortnox_wage_type_mappings.org_id
				AND memberships.user_id = auth.uid()
				AND memberships.is_active = TRUE
				AND memberships.role IN ('admin', 'foreman')
		)
	);

-- -------------------------------------------------------------------
-- fortnox_payroll_links
-- Status/logg för export av löneunderlag till Fortnox
-- Denna tabell skapades redan i 20250118000001_fortnox_payroll_links.sql
-- Men vi lägger till en unique index för idempotency om den saknas
-- -------------------------------------------------------------------

-- Kontrollera om tabellen redan finns, annars skapa den
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.tables
		WHERE table_schema = 'public'
		AND table_name = 'fortnox_payroll_links'
	) THEN
		CREATE TABLE public.fortnox_payroll_links (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

			org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

			-- Löneunderlag / payroll-basis som exporterats
			payroll_basis_id uuid NOT NULL REFERENCES public.payroll_basis(id) ON DELETE CASCADE,

			-- Lista med Fortnox-transaktions-ID:n (t.ex. SalaryTransactionIds)
			fortnox_transaction_ids jsonb NULL,

			status text NOT NULL CHECK (status IN ('exported', 'failed')),

			-- Kort felmeddelande om exporten misslyckades
			error_message text NULL,

			-- Minimal payload-snapshot (kan användas för felsökning, tänk på PII)
			payload_json jsonb NULL,

			-- Rått svar från Fortnox (kan trimmas/anonmyseras vid behov)
			response_json jsonb NULL,

			exported_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

			exported_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL
		);

		COMMENT ON TABLE public.fortnox_payroll_links IS
			'Tracks exports of payroll basis periods to Fortnox Payroll API.';

		COMMENT ON COLUMN public.fortnox_payroll_links.status IS
			'exported = successful export, failed = export attempt with error.';

		CREATE INDEX IF NOT EXISTS fortnox_payroll_links_org_basis_idx
			ON public.fortnox_payroll_links (org_id, payroll_basis_id);

		CREATE INDEX IF NOT EXISTS fortnox_payroll_links_status_idx
			ON public.fortnox_payroll_links (status);

		CREATE INDEX IF NOT EXISTS fortnox_payroll_links_exported_at_idx
			ON public.fortnox_payroll_links (exported_at);

		-- Enable RLS
		ALTER TABLE public.fortnox_payroll_links ENABLE ROW LEVEL SECURITY;

		-- Policies
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
	END IF;
END $$;

-- Endast EN lyckad export per org + payroll_basis (idempotency)
-- Detta tillåter flera misslyckade exports men endast en lyckad export per payroll_basis
-- Om tabellen redan har en UNIQUE constraint på (org_id, payroll_basis_id),
-- behöver den tas bort först för att tillåta flera failed exports
DO $$
DECLARE
	v_constraint_name text;
BEGIN
	-- Hitta namnet på befintlig unique constraint om den finns
	SELECT conname INTO v_constraint_name
	FROM pg_constraint
	WHERE conrelid = 'public.fortnox_payroll_links'::regclass
		AND contype = 'u'
		AND array_length(conkey, 1) = 2
		AND (
			SELECT array_agg(attname ORDER BY a.a)
			FROM unnest(conkey) AS a(a)
			JOIN pg_attribute ON pg_attribute.attrelid = conrelid AND pg_attribute.attnum = a.a
		) = ARRAY['org_id', 'payroll_basis_id'];

	-- Ta bort constraint om den finns (tillåter flera failed exports)
	IF v_constraint_name IS NOT NULL THEN
		EXECUTE format('ALTER TABLE public.fortnox_payroll_links DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
	END IF;

	-- Skapa villkorat unique index för endast exported status (idempotency)
	IF NOT EXISTS (
		SELECT 1 FROM pg_indexes
		WHERE schemaname = 'public'
		AND tablename = 'fortnox_payroll_links'
		AND indexname = 'fortnox_payroll_links_org_basis_exported_uidx'
	) THEN
		CREATE UNIQUE INDEX fortnox_payroll_links_org_basis_exported_uidx
			ON public.fortnox_payroll_links (org_id, payroll_basis_id)
			WHERE status = 'exported';
	END IF;
END $$;

COMMIT;

