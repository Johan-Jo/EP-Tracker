-- Update activity helper functions to include user_id so the frontend can
-- correlate time entries with diary entries for the dashboard overview.

drop function if exists get_recent_activities_fast(uuid, integer);
drop function if exists get_recent_activities(uuid, integer);

create or replace function get_recent_activities_fast(
  p_org_id uuid,
  p_limit int default 15
)
returns table (
  id uuid,
  type text,
  created_at timestamptz,
  project_id uuid,
  project_name text,
  user_id uuid,
  user_name text,
  data jsonb,
  description text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    al.id,
    al.type,
    al.created_at,
    al.project_id,
    p.name as project_name,
    al.user_id,
    pr.full_name as user_name,
    al.data,
    al.description
  from activity_log al
  left join projects p on p.id = al.project_id
  left join profiles pr on pr.id = al.user_id
  where al.org_id = p_org_id
    and al.is_deleted = false
    and al.created_at >= current_date - interval '30 days'
  order by al.created_at desc
  limit p_limit;
end;
$$;

comment on function get_recent_activities_fast is
  'Expose user_id so callers can attach related diary entries to activity feed';

-- Legacy fallback (UNION query) also needs the user_id column.
create or replace function get_recent_activities(
  p_org_id uuid,
  p_limit int default 15
)
returns table (
  id uuid,
  type text,
  created_at timestamptz,
  project_id uuid,
  project_name text,
  user_id uuid,
  user_name text,
  data jsonb,
  description text
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select 
    activity.id,
    activity.type,
    activity.created_at,
    activity.project_id,
    activity.project_name,
    activity.user_id,
    activity.user_name,
    activity.data,
    activity.description
  from (
    select 
      te.id,
      'time_entry'::text as type,
      te.created_at,
      te.project_id,
      p.name as project_name,
      te.user_id,
      pr.full_name as user_name,
      jsonb_build_object(
        'duration_min', te.duration_min,
        'task_label', te.task_label,
        'start_at', te.start_at,
        'stop_at', te.stop_at
      ) as data,
      coalesce(te.task_label, 'Tidrapport') as description
    from time_entries te
    inner join profiles pr on pr.id = te.user_id
    left join projects p on p.id = te.project_id
    where te.org_id = p_org_id
      and te.created_at >= current_date - interval '7 days'

    union all

    select 
      m.id,
      'material'::text as type,
      m.created_at,
      m.project_id,
      p.name as project_name,
      m.user_id,
      pr.full_name as user_name,
      jsonb_build_object('qty', m.qty, 'unit', m.unit) as data,
      m.description
    from materials m
    inner join profiles pr on pr.id = m.user_id
    left join projects p on p.id = m.project_id
    where m.org_id = p_org_id
      and m.created_at >= current_date - interval '7 days'

    union all

    select 
      e.id,
      'expense'::text as type,
      e.created_at,
      e.project_id,
      p.name as project_name,
      e.user_id,
      pr.full_name as user_name,
      jsonb_build_object('amount_sek', e.amount_sek, 'category', e.category) as data,
      e.description
    from expenses e
    inner join profiles pr on pr.id = e.user_id
    left join projects p on p.id = e.project_id
    where e.org_id = p_org_id
      and e.created_at >= current_date - interval '7 days'
  ) activity
  order by activity.created_at desc
  limit p_limit;
end;
$$;

comment on function get_recent_activities is
  'Expose user_id so callers can attach related diary entries to activity feed';

