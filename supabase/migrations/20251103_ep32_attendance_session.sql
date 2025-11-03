-- EPIC 32: Create attendance_session and correction_log tables (forward-only)

-- attendance_session
create table if not exists public.attendance_session (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null,
    person_id uuid not null,
    company_id uuid,
    project_id uuid not null,
    check_in_ts timestamptz not null,
    check_out_ts timestamptz,
    source_first text not null default 'unknown',
    source_last text not null default 'unknown',
    device_first text,
    device_last text,
    immutable_hash text not null,
    corrected boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- basic FKs (assume existing tables)
create index if not exists attendance_session_project_in_idx on public.attendance_session (project_id, check_in_ts);
create index if not exists attendance_session_person_in_idx on public.attendance_session (person_id, check_in_ts);
create index if not exists attendance_session_org_idx on public.attendance_session (org_id);

-- RLS scaffolding (policies to be aligned with existing org/project policies)
alter table public.attendance_session enable row level security;

-- correction_log
create table if not exists public.correction_log (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null,
    session_id uuid not null references public.attendance_session(id) on delete cascade,
    field text not null check (field in ('check_in_ts','check_out_ts')),
    old_value text,
    new_value text not null,
    reason text not null,
    changed_by uuid not null,
    changed_at timestamptz not null default now()
);

create index if not exists correction_log_session_idx on public.correction_log (session_id, changed_at desc);
create index if not exists correction_log_org_idx on public.correction_log (org_id);

alter table public.correction_log enable row level security;

-- Triggers to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_attendance_session_updated_at on public.attendance_session;
create trigger trg_attendance_session_updated_at
before update on public.attendance_session
for each row execute procedure public.set_updated_at();


