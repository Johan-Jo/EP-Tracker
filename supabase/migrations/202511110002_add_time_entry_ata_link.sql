ALTER TABLE time_entries
	ADD COLUMN IF NOT EXISTS ata_id UUID REFERENCES ata(id);

CREATE INDEX IF NOT EXISTS idx_time_entries_ata_id
	ON time_entries (ata_id);
