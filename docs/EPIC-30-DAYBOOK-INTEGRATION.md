# EPIC 30: Daybook Integration & Production Rollout

**Status:** 📋 Ready to Start  
**Estimated Effort:** 2-3 days  
**Dependencies:** EPIC 27, 28, 29  
**Blocks:** None (final EPIC)

---

## 🎯 Goal

Integrate voice notes into the existing diary system, implement offline sync, complete E2E testing, and roll out to production with proper monitoring.

---

## 📋 Schema Decision: Extend `diary_entries` ✅

After analyzing the existing schema, we will **EXTEND** `diary_entries` rather than create a new `daybook_entries` table.

### Migration SQL

```sql
-- Migration: 20251029000002_add_voice_to_diary.sql
-- Add voice support to existing diary_entries table

ALTER TABLE diary_entries 
  ADD COLUMN IF NOT EXISTS voice_log_id UUID REFERENCES voice_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entry_source TEXT DEFAULT 'manual' 
    CHECK (entry_source IN ('manual', 'voice'));

-- Add index for voice_log lookups
CREATE INDEX IF NOT EXISTS idx_diary_entries_voice_log_id 
  ON diary_entries(voice_log_id);

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_diary_entries_entry_source 
  ON diary_entries(entry_source);

-- Add comment
COMMENT ON COLUMN diary_entries.voice_log_id IS 
  'Links to voice_logs table for voice-generated entries';
  
COMMENT ON COLUMN diary_entries.entry_source IS 
  'Indicates how entry was created: manual (typed) or voice (from voice note)';
```

### Rationale

**Why extend `diary_entries` instead of creating new table:**

1. ✅ **Avoids duplication** - No need for parallel diary systems
2. ✅ **Single source of truth** - All diary content in one place
3. ✅ **Reuses existing UI** - Diary list, detail, edit pages work as-is
4. ✅ **Compatible with photos** - Voice entries can still have photos attached
5. ✅ **Maintains relationships** - Project, user, organization links already exist
6. ✅ **Signature support** - Voice entries can be signed (optional)
7. ✅ **Simpler queries** - No need to UNION multiple tables

**Trade-offs:**

- Voice entries will have some unused fields (weather, temperature, crew_count)
- Solution: These fields remain NULL for voice entries - acceptable overhead

---

## 📋 Tasks

### 1. Database Migration

- [ ] Create migration `20251029000002_add_voice_to_diary.sql`
- [ ] Test migration on local database
- [ ] Verify indexes created successfully
- [ ] Test RLS policies still work correctly
- [ ] Document migration in SYSTEM-OVERVIEW.md

### 2. Update Diary Form for Voice Input

- [ ] Add voice recorder button to `components/diary/diary-form-new.tsx`
- [ ] Open voice recording modal/drawer on click
- [ ] Auto-populate `work_performed` field with Swedish translation
- [ ] Set `entry_source = 'voice'`
- [ ] Link `voice_log_id` to created voice log
- [ ] Maintain existing form validation and submission flow

### 3. Voice Note Entry Display Component

- [ ] Create `components/diary/voice-note-indicator.tsx`
- [ ] Show voice icon badge on voice entries
- [ ] Add "Show Original" toggle button
- [ ] Display original language transcript in expandable section
- [ ] Show confidence scores with color coding
- [ ] Add audio playback button (fetch signed URL from storage)

### 4. Update Diary List Page

- [ ] Modify `components/diary/diary-page-new.tsx`
- [ ] Display voice indicator icon on voice entries
- [ ] Add filter option for entry_source (All, Manual, Voice)
- [ ] Show preview of `work_performed` text
- [ ] Maintain existing sorting and pagination

### 5. Update Diary Detail Page

- [ ] Modify `components/diary/diary-detail-new.tsx`
- [ ] Show voice note indicator if `voice_log_id` exists
- [ ] Display original transcript toggle
- [ ] Add audio playback controls
- [ ] Show language detected and confidence scores
- [ ] Allow editing (marks as manually edited)

### 6. Offline Queue for Voice Notes

- [ ] Extend `lib/sync/offline-queue.ts` with `voice_recording` entity type
- [ ] Queue voice recordings when offline
- [ ] Store audio blob in IndexedDB (from EPIC 29)
- [ ] On reconnect: upload audio → process → create diary entry
- [ ] Handle partial failures gracefully
- [ ] Show sync progress in UI

### 7. API Route: Create Voice Diary Entry

- [ ] Create `app/api/diary/voice/route.ts`
- [ ] Accept: `voiceLogId`, `projectId`, `date`
- [ ] Fetch voice log data (translation, original text)
- [ ] Create diary entry with `work_performed = translated_sv`
- [ ] Set `voice_log_id` and `entry_source = 'voice'`
- [ ] Return created diary entry

### 8. Feature Flag Setup

- [ ] Add `voice_daybook_enabled` to feature flags system
- [ ] Per-organization enable/disable
- [ ] Hide voice buttons when flag is disabled
- [ ] Add flag check in API routes

### 9. E2E Testing (Playwright)

- [ ] Test: Complete voice note flow (record → transcribe → save to diary)
- [ ] Test: Language auto-detection works correctly
- [ ] Test: Manual language override
- [ ] Test: Offline recording queues and syncs
- [ ] Test: Voice entry appears in diary list
- [ ] Test: Original transcript toggle works
- [ ] Test: Audio playback works
- [ ] Test: Edit voice-generated entry
- [ ] Test: Filter by entry_source

### 10. Production Rollout Checklist

- [ ] Database migration applied to staging
- [ ] Database migration applied to production
- [ ] Storage bucket `voice-recordings` created in production
- [ ] Storage RLS policies configured
- [ ] Environment variables set (OPENAI_API_KEY, etc.)
- [ ] Feature flag created with default = disabled
- [ ] Monitoring dashboard configured (PostHog)
- [ ] Pilot users identified (5-10 users, multilingual)
- [ ] Pilot users' feature flag enabled
- [ ] 1-week pilot period monitoring
- [ ] Gather feedback and adjust glossary
- [ ] General availability rollout (enable flag for all orgs)

---

## 🗂️ File Structure

```
app/api/diary/
  └── voice/
      └── route.ts              # Create diary entry from voice log

components/diary/
  ├── diary-form-new.tsx        # Modified: Add voice button
  ├── diary-page-new.tsx        # Modified: Show voice indicators
  ├── diary-detail-new.tsx      # Modified: Display voice features
  └── voice-note-indicator.tsx  # NEW: Voice badge + controls

lib/sync/
  └── offline-queue.ts          # Modified: Add voice entity type

supabase/migrations/
  └── 20251029000002_add_voice_to_diary.sql

tests/e2e/
  └── voice-notes.spec.ts       # NEW: E2E tests
```

---

## 📝 Key Files to Create/Modify

### 1. Migration File

**Path:** `supabase/migrations/20251029000002_add_voice_to_diary.sql`

Already shown above in "Schema Decision" section.

### 2. Voice Note Indicator Component

**Path:** `components/diary/voice-note-indicator.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface VoiceNoteIndicatorProps {
  voiceLogId: string;
  originalText: string;
  originalLang: string;
  confidence: number;
  audioUrl: string;
}

export function VoiceNoteIndicator({
  voiceLogId,
  originalText,
  originalLang,
  confidence,
  audioUrl,
}: VoiceNoteIndicatorProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const getConfidenceBadge = () => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">Hög säkerhet</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary">Medium säkerhet</Badge>;
    } else {
      return <Badge variant="destructive">Låg säkerhet</Badge>;
    }
  };

  const playAudio = async () => {
    setIsPlaying(true);
    
    try {
      // Fetch signed URL
      const res = await fetch(`/api/voice/audio?path=${encodeURIComponent(audioUrl)}`);
      const { signedUrl } = await res.json();
      
      // Play audio
      const audio = new Audio(signedUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        alert('Kunde inte spela upp ljudfil');
      };
      await audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
    }
  };

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Röstanteckning</span>
          <Badge variant="outline">{originalLang.toUpperCase()}</Badge>
          {getConfidenceBadge()}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={playAudio}
            disabled={isPlaying}
          >
            {isPlaying ? 'Spelar...' : 'Spela upp'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            {showOriginal ? (
              <>
                Dölj original <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Visa original <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {showOriginal && (
        <div className="mt-3 p-3 bg-background rounded border">
          <p className="text-sm text-muted-foreground mb-1">
            Original text ({originalLang}):
          </p>
          <p className="text-sm">{originalText}</p>
        </div>
      )}
    </Card>
  );
}
```

### 3. API Route: Create Voice Diary Entry

**Path:** `app/api/diary/voice/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/get-session';

export async function POST(request: NextRequest) {
  const { user, membership } = await getSession();

  if (!user || !membership) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { voiceLogId, projectId, date } = body;

  if (!voiceLogId || !projectId || !date) {
    return NextResponse.json(
      { error: 'Missing required fields: voiceLogId, projectId, date' },
      { status: 400 }
    );
  }

  try {
    // Fetch voice log
    const { data: voiceLog, error: voiceError } = await supabase
      .from('voice_logs')
      .select('*')
      .eq('id', voiceLogId)
      .eq('user_id', user.id) // Security: ensure user owns this voice log
      .single();

    if (voiceError || !voiceLog) {
      return NextResponse.json(
        { error: 'Voice log not found' },
        { status: 404 }
      );
    }

    // Create diary entry using RPC (same as manual entry)
    const { data: entry, error: diaryError } = await supabase
      .rpc('insert_diary_entry', {
        p_org_id: membership.org_id,
        p_project_id: projectId,
        p_created_by: user.id,
        p_date: date,
        p_work_performed: voiceLog.translated_sv, // Swedish translation
        p_voice_log_id: voiceLogId,
        p_entry_source: 'voice',
      })
      .single();

    if (diaryError) {
      console.error('Diary entry creation error:', diaryError);
      return NextResponse.json(
        { error: diaryError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ diary: entry }, { status: 201 });
  } catch (error) {
    console.error('Voice diary entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. Update Diary Form with Voice Button

**Path:** `components/diary/diary-form-new.tsx` (modifications)

```typescript
// Add imports
import { VoiceRecorder } from '@/components/voice/voice-recorder';
import { useVoiceStore } from '@/lib/stores/voice-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Inside component
const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
const { voiceLogId, translation, reset: resetVoice } = useVoiceStore();

// Watch for completed voice note
useEffect(() => {
  if (voiceLogId && translation) {
    // Auto-fill work_performed with translation
    setWorkPerformed(translation);
    setShowVoiceRecorder(false);
    toast.success('Röstanteckning klar! Texten har fyllts i.');
    resetVoice();
  }
}, [voiceLogId, translation, resetVoice]);

// Add voice button before "Utfört arbete" textarea
<div className="flex items-center justify-between mb-2">
  <Label htmlFor="workPerformed">Utfört arbete</Label>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={() => setShowVoiceRecorder(true)}
  >
    <Mic className="w-4 h-4 mr-2" />
    Röstanteckning
  </Button>
</div>

// Add voice recorder dialog
<Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Spela in röstanteckning</DialogTitle>
    </DialogHeader>
    <VoiceRecorder />
    <LiveCaptions />
  </DialogContent>
</Dialog>
```

### 5. Update Offline Queue

**Path:** `lib/sync/offline-queue.ts` (add to `syncItem` function)

```typescript
private async syncItem(item: SyncQueue): Promise<void> {
  const endpoint = this.getEndpoint(item);
  
  switch (item.entity) {
    // ... existing cases ...
    
    case 'voice_recording': {
      // Upload audio blob first
      const blob = item.payload.audioBlob;
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('language', item.payload.language);
      
      const uploadRes = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });
      
      const { sessionId } = await uploadRes.json();
      
      // Poll for completion (or use SSE)
      const finalRes = await fetch(`/api/voice/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      
      const { voiceLogId } = await finalRes.json();
      
      // Create diary entry
      await fetch('/api/diary/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceLogId,
          projectId: item.payload.projectId,
          date: item.payload.date,
        }),
      });
      
      break;
    }
  }
}
```

---

## ✅ Acceptance Criteria

- [ ] Voice button appears in diary form
- [ ] Recording modal opens and functions correctly
- [ ] Swedish translation auto-fills `work_performed` field
- [ ] Diary entry saves with `voice_log_id` and `entry_source = 'voice'`
- [ ] Voice entries appear in diary list with indicator icon
- [ ] Filter by entry_source works (All, Manual, Voice)
- [ ] Original transcript toggle works in detail view
- [ ] Audio playback works with signed URLs
- [ ] Offline voice recordings queue and sync successfully
- [ ] Feature flag properly gates voice functionality
- [ ] E2E tests pass for all voice note flows
- [ ] Migration applies without errors
- [ ] RLS policies still enforce correct access control

---

## 🧪 Testing

### Unit Tests

```typescript
// lib/sync/__tests__/offline-queue.test.ts
describe('Voice Recording Sync', () => {
  it('queues voice recording when offline', async () => {
    // Test offline queueing
  });

  it('syncs voice recording on reconnect', async () => {
    // Test sync flow
  });
});
```

### Integration Tests

```typescript
// app/api/diary/voice/__tests__/route.test.ts
describe('POST /api/diary/voice', () => {
  it('creates diary entry from voice log', async () => {
    // Test diary creation
  });

  it('returns 404 for non-existent voice log', async () => {
    // Test error handling
  });
});
```

### E2E Tests (Playwright)

**Path:** `tests/e2e/voice-notes.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Voice Notes Integration', () => {
  test('complete voice note to diary flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');

    // Navigate to new diary entry
    await page.goto('/dashboard/diary/new');
    await expect(page).toHaveURL(/.*diary\/new/);

    // Select project
    await page.click('[id="project"]');
    await page.click('text=Test Project');

    // Click voice button
    await page.click('text=Röstanteckning');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Mock recording (in real test, use audio fixture)
    // ... recording simulation ...

    // Verify translation appears
    await expect(page.locator('[data-testid="live-captions"]')).toContainText('Svenska');

    // Close dialog - translation should auto-fill
    await page.click('[role="dialog"] button:has-text("Stäng")');
    
    // Verify work_performed field filled
    const workPerformed = await page.inputValue('#workPerformed');
    expect(workPerformed).toBeTruthy();

    // Save diary entry
    await page.click('button:has-text("Spara dagbokspost")');

    // Verify redirect to detail page
    await expect(page).toHaveURL(/.*diary\/[a-f0-9-]+/);

    // Verify voice indicator visible
    await expect(page.locator('text=Röstanteckning')).toBeVisible();
  });

  test('offline voice recording queues', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);

    // Record voice note
    await page.goto('/dashboard/diary/new');
    await page.click('text=Röstanteckning');
    // ... simulate recording ...

    // Verify queued message
    await expect(page.locator('text=Sparad offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Verify sync occurs
    await expect(page.locator('text=Synkroniserar')).toBeVisible();
    await expect(page.locator('text=Synkronisering klar')).toBeVisible();
  });

  test('filter voice entries in diary list', async ({ page }) => {
    await page.goto('/dashboard/diary');

    // Open filter
    await page.click('[data-testid="entry-source-filter"]');

    // Select "Voice only"
    await page.click('text=Röstanteckningar');

    // Verify only voice entries shown
    const entries = page.locator('[data-testid="diary-entry"]');
    await expect(entries).not.toHaveCount(0);
    
    // All should have voice indicator
    const voiceIndicators = page.locator('[data-testid="voice-indicator"]');
    await expect(voiceIndicators.count()).toBe(await entries.count());
  });
});
```

---

## 📊 Production Rollout Metrics

### Success Metrics

**Usage:**
- Voice notes created per day
- Save conversion rate (started vs completed): Target ≥ 80%
- Average time from record to save: Target < 60 seconds

**Quality:**
- Language detection accuracy: Target ≥ 90%
- Average ASR confidence: Target ≥ 0.85
- Average translation confidence: Target ≥ 0.90
- User edits after generation: Track % (lower is better)

**Technical:**
- API response time p95: Target < 5 seconds
- Error rate: Target < 1%
- Offline sync success rate: Target ≥ 99%

**User Satisfaction:**
- Post-pilot survey score: Target ≥ 4/5
- Feature adoption rate: Target ≥ 50% of pilot users
- Continued usage after 2 weeks: Target ≥ 60%

### Monitoring Setup (PostHog Events)

```typescript
// Track voice note events
posthog.capture('voice_note_started', {
  language: 'auto',
  project_id: projectId,
});

posthog.capture('voice_note_completed', {
  language: detectedLang,
  confidence: asrConfidence,
  duration_ms: recordingDuration,
  translation_time_ms: processingTime,
});

posthog.capture('voice_note_saved_to_diary', {
  voice_log_id: voiceLogId,
  edited_before_save: wasEdited,
});

posthog.capture('voice_note_error', {
  error_type: 'transcription_failed',
  language: attemptedLang,
});
```

---

## 🚀 Pilot Plan

### Phase 1: Preparation (Day 1-2)

- [ ] Apply database migrations to staging
- [ ] Test full flow in staging environment
- [ ] Create pilot user guide (Swedish + Polish)
- [ ] Set up monitoring dashboard
- [ ] Prepare feedback form (Google Forms/Typeform)

### Phase 2: Pilot Launch (Day 3)

- [ ] Enable feature flag for 5-10 pilot users
- [ ] Send onboarding email with instructions
- [ ] Schedule kickoff call (15 min demo)
- [ ] Monitor for critical errors (real-time)

### Phase 3: Monitoring (Day 4-10)

- [ ] Daily check-in on metrics dashboard
- [ ] Respond to pilot user questions < 4 hours
- [ ] Collect feedback mid-week
- [ ] Adjust glossary based on terminology issues

### Phase 4: Evaluation (Day 11-12)

- [ ] Analyze usage metrics
- [ ] Review user feedback
- [ ] Document issues and improvements
- [ ] Decide: expand pilot or iterate

### Phase 5: General Availability (Day 13+)

- [ ] Apply final fixes from pilot
- [ ] Enable feature flag for all organizations
- [ ] Announce in product updates
- [ ] Monitor adoption and quality metrics

---

## 🔮 Future Enhancements (Post-MVP)

- Custom glossary per organization (admin-configurable)
- Voice commands ("Create task", "Add photo")
- Multi-speaker diarization
- Real-time streaming (WebSocket upgrade)
- On-device ASR for full offline support
- Export diary with audio attachments
- Voice note templates/quick phrases

---

## 📚 Documentation Updates

- [ ] Update `docs/SYSTEM-OVERVIEW.md` - Add voice notes section
- [ ] Update `README.md` - Add voice notes to feature list
- [ ] Create `docs/VOICE-NOTES-USER-GUIDE.md` - User documentation
- [ ] Update API documentation with voice endpoints
- [ ] Add troubleshooting section for common issues

---

**Status**: 📋 Ready to Start  
**Est. Completion**: 2-3 days  
**Reviewer**: [Assign reviewer]


