# EPIC 27-30: Critical Issues & Required Fixes

**Date:** October 29, 2025  
**Status:** 🔴 Blocking Implementation  
**Action Required:** Fix before starting implementation

---

## 📋 Executive Summary

After thorough analysis of EPIC-27, EPIC-28, and the existing EP-Tracker codebase, **5 critical issues** were discovered that must be addressed before implementation can begin. These issues range from incorrect database schema references to incompatible WebSocket implementations.

**Resolution Status:**
- ✅ EPIC-29 (Voice Capture UI) - Created from scratch with correct patterns
- ✅ EPIC-30 (Daybook Integration) - Created from scratch with correct patterns  
- 🔧 EPIC-27 (Foundation) - **Requires fixes** (see below)
- 🔧 EPIC-28 (Backend Services) - **Requires fixes** (see below)

---

## 🚨 Critical Issue #1: Schema Table Name Mismatch

### Problem

**EPIC-27 & EPIC-28 Reference:** `organization_members` table  
**Actual Database Schema:** `memberships` table

**Impact:** HIGH - RLS policies will fail, queries will break

### Evidence

From `supabase/migrations/20241018000001_initial_schema.sql` (lines 37-51):

```sql
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'worker')),
    ...
);
```

EPIC-27 RLS policies (lines 188-197) reference non-existent table:

```sql
create policy "Admins can view all voice logs in their org"
  on voice_logs for select
  using (
    exists (
      select 1 from organization_members  -- ❌ WRONG TABLE NAME
      where organization_members.user_id = auth.uid()
```

### Required Fix

**In EPIC-27-FOUNDATION.md:**

1. Find all references to `organization_members` (lines 188-197)
2. Replace with `memberships`
3. Update column references:
   - `organization_members.organization_id` → `memberships.org_id`
   - `organization_members.user_id` → `memberships.user_id`
4. Remove `'owner'` from role check (only `'admin', 'foreman', 'worker'` exist)

**Corrected RLS Policy:**

```sql
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
```

---

## 🚨 Critical Issue #2: Diary vs Daybook Table Conflict

### Problem

**EPIC-27 Proposes:** Create new `daybook_entries` table  
**Existing Schema:** Already has `diary_entries` table with similar purpose

**Impact:** HIGH - Schema duplication, parallel systems, complexity

### Evidence

**Existing `diary_entries` table** (lines 308-327 in initial_schema.sql):
- Purpose: AFC-style daily reports
- Has: `project_id`, `date`, `work_performed`, `created_by`, `signature`
- Already supports: photos via `diary_photos` table
- UNIQUE constraint: `(project_id, date)`

**EPIC-27 Proposed `daybook_entries` table** (lines 123-162):
- Purpose: Voice note storage
- Has: `project_id`, `body_sv`, `user_id`, `voice_log_id`
- Simpler schema, focused on voice

### Decision Made ✅

**Extend existing `diary_entries` instead of creating new table**

**Rationale:**
1. Avoids duplication
2. Single source of truth for all diary content
3. Reuses existing diary UI components
4. Compatible with existing relationships (projects, photos, signatures)

### Required Fix

**In EPIC-27-FOUNDATION.md:**

1. **Remove** `daybook_entries` table creation (lines 123-162)
2. **Replace** with ALTER TABLE statements:

```sql
-- REPLACE daybook_entries creation with:
ALTER TABLE diary_entries 
  ADD COLUMN IF NOT EXISTS voice_log_id UUID REFERENCES voice_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_source TEXT DEFAULT 'manual' 
    CHECK (entry_source IN ('manual', 'voice'));

CREATE INDEX IF NOT EXISTS idx_diary_entries_voice_log_id 
  ON diary_entries(voice_log_id);
```

3. Update all `daybook_entries` references to `diary_entries` throughout document
4. Update types in `types/voice-notes.ts` to reference `diary_entries` schema

---

## 🚨 Critical Issue #3: WebSocket Incompatibility (MOST CRITICAL)

### Problem

**EPIC-28 Code (line 137):** Uses `Deno.upgradeWebSocket(req)`  
**EP-Tracker Runtime:** Next.js 15 on Vercel (Node.js/Edge, **NOT Deno**)

**Impact:** CRITICAL - Code will not run, deployment will fail

### Evidence

```typescript
// EPIC-28 line 137 - WILL NOT WORK
const { socket, response } = Deno.upgradeWebSocket(req);  // ❌ Deno API
```

**Why it fails:**
- `Deno.upgradeWebSocket` is Deno runtime API
- Next.js runs on Node.js or Edge runtime
- Vercel does not support Deno
- No WebSocket built-in to Next.js App Router

### Decision Made ✅

**Use Server-Sent Events (SSE) instead of WebSocket for MVP**

**Rationale:**
- ✅ Works on Vercel Edge Runtime
- ✅ Native browser support (EventSource API)
- ✅ Simpler implementation
- ✅ Good enough for one-way streaming (server → client)
- ✅ Can upgrade to WebSocket later if needed

### Required Fix

**In EPIC-28-BACKEND-SERVICES.md:**

1. **Remove** entire WebSocket handler section (lines 103-258)
2. **Replace** with SSE implementation:

```typescript
// app/api/voice/stream/route.ts
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Process audio and send events
  processAudioSession(sessionId, writer, encoder);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function processAudioSession(
  sessionId: string,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder
) {
  try {
    // 1. Fetch audio from storage
    // 2. Transcribe with Whisper
    // 3. Send partial event
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({
        type: 'asr.partial',
        text: 'Transcribing...'
      })}\n\n`)
    );
    
    // 4. Translate with GPT-4o
    // 5. Send final event
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({
        type: 'session.done',
        voiceLogId: '...'
      })}\n\n`)
    );
  } finally {
    await writer.close();
  }
}
```

3. Update architecture diagram (lines 64-97) to show SSE instead of WebSocket
4. Update client-side code examples to use `EventSource` API (already done in EPIC-29)

---

## 🚨 Critical Issue #4: Migration Timestamp in the Past

### Problem

**EPIC-27 Proposes:** `20250128000003_voice_notes_foundation.sql`  
**Date in Filename:** January 28, 2025  
**Today's Date:** October 29, 2025

**Impact:** MEDIUM - Migration ordering issues, confusion

### Evidence

Line 256 in EPIC-27-FOUNDATION.md:

```markdown
**Path:** `supabase/migrations/20250128000003_voice_notes_foundation.sql`
```

The timestamp `20250128` is **9 months in the past**.

### Required Fix

**In EPIC-27-FOUNDATION.md:**

1. Change migration filename to: `20251029000001_voice_notes_foundation.sql`
2. Update all references to this filename throughout the document
3. Verify sequence number (`000001`) doesn't conflict with existing migrations

**Note:** Check latest migration number in `supabase/migrations/` before finalizing.

---

## 🚨 Critical Issue #5: Missing Storage Bucket Setup

### Problem

**EPIC-27 Mentions:** `voice-recordings` storage bucket  
**Missing:** Instructions for creating bucket and configuring policies

**Impact:** MEDIUM - Implementation will fail when trying to upload audio

### Required Fix

**In EPIC-27-FOUNDATION.md:**

Add new section **"Storage Bucket Setup"** with:

```markdown
## Storage Bucket Setup

### Create Bucket (Supabase Dashboard)

1. Go to Storage in Supabase Dashboard
2. Click "New Bucket"
3. Name: `voice-recordings`
4. Public: **No** (private bucket)
5. File size limit: 10 MB
6. Allowed MIME types: `audio/webm, audio/wav, audio/mp3`

### Storage RLS Policies

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own voice recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own recordings
CREATE POLICY "Users can read own voice recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own recordings
CREATE POLICY "Users can delete own voice recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

### Verify Setup

Test bucket access:
```bash
# Upload test file
curl -X POST https://[PROJECT].supabase.co/storage/v1/object/voice-recordings/[USER_ID]/test.webm \
  -H "Authorization: Bearer [TOKEN]" \
  -F file=@test.webm

# Get signed URL
curl https://[PROJECT].supabase.co/storage/v1/object/sign/voice-recordings/[USER_ID]/test.webm \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{"expiresIn": 3600}'
```
```

---

## 📊 Summary of Required Fixes

| EPIC | Issue | Severity | Lines Affected | Estimated Fix Time |
|------|-------|----------|----------------|-------------------|
| EPIC-27 | Wrong table name (`organization_members` → `memberships`) | HIGH | 188-197 | 10 min |
| EPIC-27 | Table conflict (`daybook_entries` → extend `diary_entries`) | HIGH | 123-162 | 30 min |
| EPIC-27 | Migration timestamp wrong | MEDIUM | 256 | 5 min |
| EPIC-27 | Missing storage bucket setup | MEDIUM | N/A (add section) | 20 min |
| EPIC-28 | WebSocket → SSE replacement | CRITICAL | 103-258 | 2 hours |
| EPIC-28 | Architecture diagram update | MEDIUM | 64-97 | 15 min |

**Total Estimated Fix Time:** ~3.5 hours

---

## ✅ Resolution Strategy

### Immediate Actions (Before Implementation)

1. **Fix EPIC-27** (1 hour)
   - Update all `organization_members` → `memberships`
   - Replace `daybook_entries` with `diary_entries` extension
   - Fix migration timestamp to `20251029000001`
   - Add storage bucket setup section
   - Update RLS policies
   - Update type definitions

2. **Fix EPIC-28** (2 hours)
   - Remove Deno WebSocket code
   - Implement SSE endpoint
   - Update session manager for SSE
   - Update architecture diagram
   - Add SSE client examples
   - Keep REST fallback endpoints

3. **Verify Integration** (30 min)
   - Ensure EPIC-29 SSE client matches EPIC-28 SSE server
   - Verify EPIC-30 references correct table (`diary_entries`)
   - Check all cross-references between EPICs

### Testing Validation

Before marking as "ready to implement":

- [ ] SQL migrations run successfully on test database
- [ ] All table/column references verified against actual schema
- [ ] Storage bucket policies tested
- [ ] SSE endpoint works in local Next.js dev server
- [ ] No references to Deno APIs remain

---

## 📚 Reference: Correct Schema

For implementers, here's the **actual** schema to reference:

### Tables
- ✅ `organizations` (exists)
- ✅ `profiles` (exists)
- ✅ `memberships` (exists) - **NOT** `organization_members`
- ✅ `projects` (exists)
- ✅ `diary_entries` (exists) - **Extend this**, don't create `daybook_entries`
- 🆕 `voice_logs` (create in EPIC-27)

### Roles
- ✅ `'admin'` (exists in memberships)
- ✅ `'foreman'` (exists in memberships)
- ✅ `'worker'` (exists in memberships)
- ❌ `'owner'` (does NOT exist)

### Storage Buckets
- ✅ `photos` (exists)
- 🆕 `voice-recordings` (create in EPIC-27)

---

## 🔄 Next Steps

1. **Review this document** with team
2. **Apply fixes** to EPIC-27 and EPIC-28
3. **Create updated versions** or amend existing documents
4. **Mark as reviewed** before implementation begins
5. **Share with developers** before they start coding

---

**Document Status:** ✅ Complete  
**Action Required:** Fix EPIC-27 and EPIC-28 before implementation  
**Estimated Fix Time:** 3.5 hours  
**Priority:** HIGH - Blocking


