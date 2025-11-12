# EPIC 27: Voice Notes Foundation & Data Model

**Status:** 📋 Ready to Start  
**Estimated Effort:** 2 days  
**Dependencies:** None  
**Blocks:** EPIC 28, 29, 30

---

## 🎯 Goal

Establish the database schema, storage infrastructure, and RLS policies to support multilingual voice notes with transcription and translation audit trails.

---

## 📋 Tasks

### 1. Database Schema (Migration)

- [ ] Create `voice_logs` table with full audit trail
- [ ] Extend existing `diary_entries` table with voice support
- [ ] Add indexes for performance
- [ ] Add foreign key constraints
- [ ] Add check constraints for data validation

### 2. Storage Setup

- [ ] Create `voice-recordings` bucket in Supabase Storage
- [ ] Configure bucket policies (private, authenticated access only)
- [ ] Set up signed URL generation with 1-hour expiry
- [ ] Configure retention policy (30-day auto-delete)

### 3. RLS Policies

- [ ] `voice_logs`: Users can CRUD their own records
- [ ] `voice_logs`: Admins can read all in their organization
- [ ] Storage bucket: RLS for user-specific paths (upload/read/delete)
- [ ] Note: `diary_entries` RLS policies already exist and work for voice entries

### 4. Helper Functions

- [ ] `get_user_organization()` - Returns user's org_id
- [ ] `is_project_member(project_id, user_id)` - Check project access
- [ ] `has_voice_access(voice_log_id, user_id)` - Check voice log access

### 5. API Utilities

- [ ] Audio upload helper (signed URLs)
- [ ] Voice log creation utility
- [ ] Voice diary entry query utilities
- [ ] Segments JSON validation schema (Zod)

---

## 📊 Database Schema

### `voice_logs` Table

```sql
-- Voice artifacts/logs
create table if not exists voice_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references projects(id) on delete set null,
  
  -- Audio
  audio_url text null, -- Supabase Storage path
  audio_duration_ms integer null,
  audio_size_bytes integer null,
  
  -- Language & Detection
  original_lang text not null, -- ISO 639-1 code or 'auto'
  detected_lang text null, -- Actual detected language
  lang_confidence numeric null check (lang_confidence >= 0 and lang_confidence <= 1),
  
  -- Transcription
  original_text text not null,
  asr_provider text not null default 'whisper-v3',
  asr_confidence numeric null check (asr_confidence >= 0 and asr_confidence <= 1),
  
  -- Translation
  translated_sv text not null,
  translation_provider text not null default 'gpt-4o',
  translation_confidence numeric null,
  
  -- Segments (detailed timeline)
  segments jsonb not null default '[]',
  -- Shape: [{"startMs":0,"endMs":2850,"text":"...","conf":0.91}]
  
  -- Metadata
  processing_time_ms integer null,
  error_message text null,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraints
  constraint valid_iso_lang check (
    original_lang ~ '^(auto|[a-z]{2}|[a-z]{2}-[A-Z]{2})$'
  )
);

-- Indexes
create index idx_voice_logs_user_id on voice_logs(user_id);
create index idx_voice_logs_project_id on voice_logs(project_id);
create index idx_voice_logs_organization_id on voice_logs(organization_id);
create index idx_voice_logs_created_at on voice_logs(created_at desc);
create index idx_voice_logs_original_lang on voice_logs(original_lang);

-- GIN index for segments JSONB queries
create index idx_voice_logs_segments on voice_logs using gin(segments);

-- Updated_at trigger
create trigger update_voice_logs_updated_at
  before update on voice_logs
  for each row
  execute function update_updated_at_column();
```

### Extend `diary_entries` Table for Voice Support

**Note:** The existing `diary_entries` table will be extended instead of creating a new table. This maintains a single source of truth for all diary content.

```sql
-- Add voice support to existing diary_entries table
alter table diary_entries 
  add column if not exists voice_log_id uuid references voice_logs(id) on delete set null,
  add column if not exists entry_source text default 'manual' 
    check (entry_source in ('manual', 'voice'));

-- Add indexes for voice queries
create index if not exists idx_diary_entries_voice_log_id 
  on diary_entries(voice_log_id);

create index if not exists idx_diary_entries_entry_source 
  on diary_entries(entry_source);

-- Add comments
comment on column diary_entries.voice_log_id is 
  'Links to voice_logs table for voice-generated entries';
  
comment on column diary_entries.entry_source is 
  'Indicates how entry was created: manual (typed) or voice (from voice note)';
```

**Why extend instead of create new table:**
- Avoids duplication with existing diary system
- Single source of truth for all diary content  
- Reuses existing diary UI components
- Compatible with existing diary_photos, signature fields

### RLS Policies

```sql
-- Enable RLS
alter table voice_logs enable row level security;

-- Note: diary_entries already has RLS enabled from initial migration
-- We only need to add voice_logs policies

-- voice_logs policies
create policy "Users can view their own voice logs"
  on voice_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own voice logs"
  on voice_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own voice logs"
  on voice_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own voice logs"
  on voice_logs for delete
  using (auth.uid() = user_id);

create policy "Admins can view all voice logs in their org"
  on voice_logs for select
  using (
    exists (
      select 1 from memberships
      where memberships.user_id = auth.uid()
        and memberships.org_id = voice_logs.organization_id
        and memberships.role = 'admin'
    )
  );

-- Note: diary_entries policies already exist and work for voice entries
-- The existing policies allow:
-- - Users to CRUD their own entries (covers voice entries)
-- - Project members to view entries for their projects
```

### Storage Bucket Setup

**Create `voice-recordings` bucket** (via Supabase Dashboard or SQL):

#### Option A: Supabase Dashboard

1. Go to Storage in Supabase Dashboard
2. Click "New Bucket"
3. Name: `voice-recordings`
4. Public: **No** (private bucket)
5. File size limit: 10 MB
6. Allowed MIME types: `audio/webm, audio/wav, audio/mp3, audio/ogg`

#### Option B: SQL (if supported by your Supabase version)

```sql
-- Create storage bucket (requires storage admin privileges)
insert into storage.buckets (id, name, public)
values ('voice-recordings', 'voice-recordings', false);
```

#### Storage RLS Policies

```sql
-- Users can upload to their own folder
create policy "Users can upload own voice recordings"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'voice-recordings' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own recordings
create policy "Users can read own voice recordings"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'voice-recordings' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own recordings
create policy "Users can delete own voice recordings"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'voice-recordings' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all recordings in their org (optional)
-- Note: Requires additional metadata to determine org ownership
```

#### Verify Storage Setup

Test bucket access:

```bash
# Upload test file
curl -X POST \
  https://[PROJECT_REF].supabase.co/storage/v1/object/voice-recordings/[USER_ID]/test.webm \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -F file=@test.webm

# Create signed URL
curl -X POST \
  https://[PROJECT_REF].supabase.co/storage/v1/object/sign/voice-recordings/[USER_ID]/test.webm \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}'
```

---

## 🗂️ File Structure

```
supabase/migrations/
  └── 20251029000001_voice_notes_foundation.sql

lib/db/
  ├── voice-logs.ts          # Voice log queries
  └── diary-entries-voice.ts # Voice-related diary queries

lib/storage/
  └── voice-storage.ts       # Audio upload helpers

lib/validations/
  └── voice-notes.ts         # Zod schemas

types/
  └── voice-notes.ts         # TypeScript types
```

---

## 📝 Key Files to Create

### 1. Migration File

**Path:** `supabase/migrations/20251029000001_voice_notes_foundation.sql`

Contains all the SQL from above.

**Note:** Migration timestamp updated to October 29, 2025 (current date).

### 2. Type Definitions

**Path:** `types/voice-notes.ts`

```typescript
export interface VoiceLog {
  id: string;
  organization_id: string;
  user_id: string;
  project_id: string | null;
  audio_url: string | null;
  audio_duration_ms: number | null;
  audio_size_bytes: number | null;
  original_lang: string;
  detected_lang: string | null;
  lang_confidence: number | null;
  original_text: string;
  asr_provider: string;
  asr_confidence: number | null;
  translated_sv: string;
  translation_provider: string;
  translation_confidence: number | null;
  segments: VoiceSegment[];
  processing_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceSegment {
  startMs: number;
  endMs: number;
  text: string;
  conf: number;
}

export interface DiaryEntry {
  id: string;
  org_id: string;
  project_id: string;
  created_by: string;
  date: string; // DATE type
  weather: string | null;
  temperature_c: number | null;
  crew_count: number | null;
  work_performed: string | null;
  obstacles: string | null;
  safety_notes: string | null;
  deliveries: string | null;
  visitors: string | null;
  signature_name: string | null;
  signature_timestamp: string | null;
  voice_log_id: string | null; // NEW: Link to voice_logs
  entry_source: 'manual' | 'voice'; // NEW: Source indicator
  created_at: string;
  updated_at: string;
}

// Simplified type for voice-generated entries
export interface VoiceDiaryEntry extends Pick<DiaryEntry, 
  'id' | 'org_id' | 'project_id' | 'created_by' | 'date' | 
  'work_performed' | 'voice_log_id' | 'entry_source' | 'created_at'> {
  entry_source: 'voice';
}
```

### 3. Validation Schemas

**Path:** `lib/validations/voice-notes.ts`

```typescript
import { z } from 'zod';

export const voiceSegmentSchema = z.object({
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  text: z.string(),
  conf: z.number().min(0).max(1),
});

export const createVoiceLogSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  audio_url: z.string().nullable().optional(),
  audio_duration_ms: z.number().int().positive().nullable().optional(),
  audio_size_bytes: z.number().int().positive().nullable().optional(),
  original_lang: z.string().regex(/^(auto|[a-z]{2}|[a-z]{2}-[A-Z]{2})$/),
  detected_lang: z.string().nullable().optional(),
  lang_confidence: z.number().min(0).max(1).nullable().optional(),
  original_text: z.string().min(1),
  asr_provider: z.string().default('whisper-v3'),
  asr_confidence: z.number().min(0).max(1).nullable().optional(),
  translated_sv: z.string().min(1),
  translation_provider: z.string().default('gpt-4o'),
  segments: z.array(voiceSegmentSchema).default([]),
  processing_time_ms: z.number().int().positive().nullable().optional(),
});

export const createVoiceDiaryEntrySchema = z.object({
  project_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  work_performed: z.string().min(1),
  voice_log_id: z.string().uuid(),
  entry_source: z.literal('voice'),
});
```

### 4. Storage Helpers

**Path:** `lib/storage/voice-storage.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

const VOICE_BUCKET = 'voice-recordings';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function getVoiceUploadUrl(
  userId: string,
  fileName: string
): Promise<{ url: string; path: string }> {
  const supabase = await createClient();
  
  const path = `${userId}/${Date.now()}-${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUploadUrl(path, {
      upsert: false,
    });
  
  if (error) throw error;
  
  return {
    url: data.signedUrl,
    path: data.path,
  };
}

export async function getVoiceDownloadUrl(
  path: string
): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  
  if (error) throw error;
  
  return data.signedUrl;
}

export async function deleteVoiceRecording(path: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from(VOICE_BUCKET)
    .remove([path]);
  
  if (error) throw error;
}
```

### 5. Database Queries

**Path:** `lib/db/voice-logs.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { VoiceLog } from '@/types/voice-notes';

export async function createVoiceLog(
  data: Omit<VoiceLog, 'id' | 'created_at' | 'updated_at' | 'organization_id'>
): Promise<VoiceLog> {
  const supabase = await createClient();
  
  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', data.user_id)
    .single();
  
  if (!profile?.organization_id) {
    throw new Error('User has no organization');
  }
  
  const { data: voiceLog, error } = await supabase
    .from('voice_logs')
    .insert({
      ...data,
      organization_id: profile.organization_id,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return voiceLog;
}

export async function getVoiceLog(id: string): Promise<VoiceLog | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  return data;
}

export async function getUserVoiceLogs(
  userId: string,
  limit = 50
): Promise<VoiceLog[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data;
}
```

**Path:** `lib/db/diary-entries-voice.ts`

```typescript
import { createClient } from '@/lib/supabase/server';
import type { VoiceDiaryEntry } from '@/types/voice-notes';

/**
 * Get voice-generated diary entries for a user
 */
export async function getUserVoiceDiaryEntries(
  userId: string,
  limit = 50
): Promise<VoiceDiaryEntry[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('diary_entries')
    .select('id, org_id, project_id, created_by, date, work_performed, voice_log_id, entry_source, created_at')
    .eq('created_by', userId)
    .eq('entry_source', 'voice')
    .order('date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data as VoiceDiaryEntry[];
}

/**
 * Get diary entry with voice log data
 */
export async function getDiaryEntryWithVoiceLog(entryId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('diary_entries')
    .select(`
      *,
      voice_log:voice_logs(
        id,
        original_text,
        original_lang,
        detected_lang,
        asr_confidence,
        audio_url,
        segments
      )
    `)
    .eq('id', entryId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  
  return data;
}

/**
 * Note: Diary entry creation is handled via existing RPC function
 * See app/api/diary/voice/route.ts for voice-specific creation
 */
```

**Note:** Voice diary entries are created using the existing `insert_diary_entry` RPC function. See EPIC-30 for the API route implementation.

---

## ✅ Acceptance Criteria

- [ ] Migration applies cleanly to fresh database
- [ ] All indexes created successfully
- [ ] RLS policies block unauthorized access
- [ ] Users can insert/read their own voice logs
- [ ] Admins can read all org voice logs but cannot modify others'
- [ ] Storage bucket created with correct policies
- [ ] Signed URLs work for upload/download
- [ ] TypeScript types match database schema
- [ ] Zod schemas validate correctly
- [ ] Helper functions compile without errors

---

## 🧪 Testing Checklist

### Database Tests

```sql
-- Test 1: Insert voice log
insert into voice_logs (user_id, original_lang, original_text, translated_sv, asr_provider, translation_provider)
values ('test-user-id', 'pl', 'Dzień dobry', 'God dag', 'whisper-v3', 'gpt-4o');

-- Test 2: Verify RLS (should fail for other users)
set request.jwt.claims.sub to 'other-user-id';
select * from voice_logs; -- Should return empty

-- Test 3: Verify admin access
-- (Create admin user in same org, verify they can see logs)
```

### Storage Tests

```bash
# Test signed upload URL generation
curl -X POST /api/voice/upload-url \
  -H "Authorization: Bearer <token>"

# Should return: { "url": "https://...", "path": "user-id/..." }
```

### Unit Tests

- [ ] Zod schema validation (valid/invalid inputs)
- [ ] Storage helper functions (upload/download URLs)
- [ ] Database query functions (CRUD operations)

---

## 📚 Documentation

- [ ] Update `docs/SYSTEM-OVERVIEW.md` with voice notes tables
- [ ] Add voice notes section to `README.md`
- [ ] Document RLS policies in `docs/SECURITY.md`
- [ ] Add storage bucket setup to `STORAGE-SETUP.md`

---

## 🚀 Next Steps

After completing EPIC 27:

1. **EPIC 28**: Backend Services (ASR + Translation APIs)
2. **EPIC 29**: Voice Capture UI (Frontend components)
3. **EPIC 30**: Daybook Integration & Polish

---

**Status**: 📋 Ready to Start  
**Est. Completion**: 2 days  
**Reviewer**: [Assign reviewer]


