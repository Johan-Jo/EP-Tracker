-- Optimize time dashboard queries by aligning indexes with API filters

create index if not exists idx_time_entries_org_user_start_desc
  on time_entries (org_id, user_id, start_at desc);

comment on index idx_time_entries_org_user_start_desc is
  'Speeds up /api/time/entries filtering by organization and user ordered by start_at DESC.';

create index if not exists idx_time_entries_org_project_start_desc
  on time_entries (org_id, project_id, start_at desc);

comment on index idx_time_entries_org_project_start_desc is
  'Speeds up /api/time/entries filtering by organization and project ordered by start_at DESC.';

create index if not exists idx_diary_entries_org_project_user_date
  on diary_entries (org_id, project_id, created_by, date);

comment on index idx_diary_entries_org_project_user_date is
  'Supports diary enrichment lookups for the time entry list (/api/time/entries).';

