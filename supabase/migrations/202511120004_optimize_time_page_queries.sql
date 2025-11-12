-- Improve performance for /dashboard/time by adding composite indexes that
-- match the query patterns used in /api/time/entries and diary lookups.

-- Speed up time entry feed: filter by org_id and order by start_at desc.
create index if not exists idx_time_entries_org_start_at_desc
  on time_entries (org_id, start_at desc);

comment on index idx_time_entries_org_start_at_desc is
  'Optimizes /api/time/entries lookups by org_id with start_at ordering';

-- Speed up diary lookup by org/project/user/date combination.
create index if not exists idx_diary_entries_org_project_user_date
  on diary_entries (org_id, project_id, created_by, date);

comment on index idx_diary_entries_org_project_user_date is
  'Supports matching diary entries to time entries (org + project + user + date)';

