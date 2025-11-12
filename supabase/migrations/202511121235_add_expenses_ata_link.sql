-- Link expenses to ÄTA records

ALTER TABLE public.expenses
	ADD COLUMN IF NOT EXISTS ata_id UUID REFERENCES public.ata(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_ata_id ON public.expenses(ata_id);

