-- Link materials to ÄTA records

ALTER TABLE public.materials
	ADD COLUMN IF NOT EXISTS ata_id UUID REFERENCES public.ata(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_materials_ata_id ON public.materials(ata_id);

