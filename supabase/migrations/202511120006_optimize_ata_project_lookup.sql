-- Optimize ATA lookups for time entry form.
-- Query pattern: filter by project_id + org_id, ignore rejected, order by created_at desc.

create index if not exists idx_ata_project_org_created_desc_nonrejected
  on ata (project_id, org_id, created_at desc)
  where status <> 'rejected';

comment on index idx_ata_project_org_created_desc_nonrejected is
  'Speeds up ATA dropdown (project+org filtered, excludes rejected, ordered by recent)';

