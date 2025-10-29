-- EPIC 27: Voice Notes Foundation
-- Database schema for voice recording and transcription

-- Create voice_logs table
create table if not exists voice_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_language text not null,
  transcription text not null,
  translation text,
  confidence numeric,
  duration_ms integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create voice_sessions table for tracking real-time processing
create table if not exists voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voice_log_id uuid references voice_logs(id) on delete set null,
  status text not null check (status in ('uploading', 'processing', 'completed', 'failed')),
  language_hint text default 'auto',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add voice support to existing diary_entries table
alter table diary_entries 
  add column if not exists voice_log_id uuid references voice_logs(id) on delete set null,
  add column if not exists entry_source text default 'manual' 
    check (entry_source in ('manual', 'voice'));

-- Create indexes
create index if not exists idx_voice_logs_org on voice_logs(organization_id);
create index if not exists idx_voice_logs_user on voice_logs(user_id);
create index if not exists idx_voice_sessions_user on voice_sessions(user_id);
create index if not exists idx_diary_entries_voice_log on diary_entries(voice_log_id);
create index if not exists idx_diary_entries_source on diary_entries(entry_source);

-- Enable RLS
alter table voice_logs enable row level security;
alter table voice_sessions enable row level security;

-- RLS Policies for voice_logs
create policy "Users can view voice logs in their org"
  on voice_logs for select
  using (
    exists (
      select 1 from memberships
      where memberships.user_id = auth.uid()
        and memberships.org_id = voice_logs.organization_id
    )
  );

create policy "Users can create voice logs in their org"
  on voice_logs for insert
  with check (
    exists (
      select 1 from memberships
      where memberships.user_id = auth.uid()
        and memberships.org_id = voice_logs.organization_id
    )
  );

create policy "Users can update their own voice logs"
  on voice_logs for update
  using (user_id = auth.uid());

create policy "Users can delete their own voice logs"
  on voice_logs for delete
  using (user_id = auth.uid());

-- RLS Policies for voice_sessions
create policy "Users can view their own sessions"
  on voice_sessions for select
  using (user_id = auth.uid());

create policy "Users can create their own sessions"
  on voice_sessions for insert
  with check (user_id = auth.uid());

create policy "Users can update their own sessions"
  on voice_sessions for update
  using (user_id = auth.uid());

create policy "Users can delete their own sessions"
  on voice_sessions for delete
  using (user_id = auth.uid());

-- Trigger for updated_at
create trigger update_voice_logs_updated_at
  before update on voice_logs
  for each row
  execute function update_updated_at_column();

create trigger update_voice_sessions_updated_at
  before update on voice_sessions
  for each row
  execute function update_updated_at_column();
