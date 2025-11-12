-- Optimize approval dashboard queries by adding covering indexes that match
-- the weekly filters used on /dashboard/approvals.

-- Time entries: filter by org, optional status, weekly date range.
create index if not exists idx_time_entries_org_status_start
  on time_entries (org_id, status, start_at);

comment on index idx_time_entries_org_status_start is
  'Speeds up approvals view filtering by org + status + week range';

-- Materials: filter by org and created_at, sometimes also status.
create index if not exists idx_materials_org_created_at
  on materials (org_id, created_at);

create index if not exists idx_materials_org_status_created
  on materials (org_id, status, created_at);

comment on index idx_materials_org_status_created is
  'Supports status-filtered material approvals for a week';

-- Expenses: same pattern as materials.
create index if not exists idx_expenses_org_created_at
  on expenses (org_id, created_at);

create index if not exists idx_expenses_org_status_created
  on expenses (org_id, status, created_at);

comment on index idx_expenses_org_status_created is
  'Supports status-filtered expense approvals for a week';

-- ÄTA entries: filter by org + status + created_at week window.
create index if not exists idx_ata_org_created_at
  on ata (org_id, created_at);

create index if not exists idx_ata_org_status_created
  on ata (org_id, status, created_at);

comment on index idx_ata_org_status_created is
  'Speeds up ÄTA approvals filtered by status within a week';

