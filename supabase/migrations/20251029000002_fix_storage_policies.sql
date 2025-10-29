-- EPIC 27: Voice Notes Foundation
-- Storage bucket and RLS policies for voice recordings

-- Create voice-recordings bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false)
on conflict (id) do nothing;

-- RLS Policies for voice-recordings bucket

-- Allow users to upload their own recordings
create policy "Users can upload their own voice recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to read their own recordings
create policy "Users can read their own voice recordings"
  on storage.objects for select
  using (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own recordings
create policy "Users can delete their own voice recordings"
  on storage.objects for delete
  using (
    bucket_id = 'voice-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
