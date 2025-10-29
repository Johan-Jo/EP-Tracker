# EPIC 29: Voice Capture UI & Real-Time Streaming

**Status:** 📋 Ready to Start  
**Estimated Effort:** 3-4 days  
**Dependencies:** EPIC 28 (Backend Services)  
**Blocks:** EPIC 30 (Daybook Integration)

---

## 🎯 Goal

Build frontend voice recording components with VAD (Voice Activity Detection), live captions, and Server-Sent Events (SSE) streaming for real-time transcription feedback.

---

## 📋 Tasks

### 1. Voice Recorder Component

- [ ] Create `components/voice/voice-recorder.tsx` with MediaRecorder API
- [ ] Implement recording state machine (idle → recording → processing → complete)
- [ ] Add VAD (amplitude-based voice detection)
- [ ] Audio visualization (optional waveform)
- [ ] Start/Stop/Cancel controls matching existing button patterns

### 2. Language Selector

- [ ] Create `components/voice/language-selector.tsx`
- [ ] Default: "Auto-detect" (value: 'auto')
- [ ] Manual options: sv, pl, en, pt-BR, es, uk, ru, de
- [ ] Match existing Select component patterns from shadcn/ui

### 3. Live Captions Display

- [ ] Create `components/voice/live-captions.tsx`
- [ ] Real-time transcript display (updates as SSE events arrive)
- [ ] Show original language and Swedish translation side-by-side
- [ ] Visual confidence indicators (color-coded badges)
- [ ] Auto-scroll to latest text

### 4. SSE Client

- [ ] Create `lib/voice/sse-client.ts` using EventSource API
- [ ] Handle event types: `asr.partial`, `asr.final`, `translate.final`, `session.done`, `error`
- [ ] Automatic reconnection with exponential backoff
- [ ] Error handling and timeout management

### 5. Zustand Store

- [ ] Create `lib/stores/voice-store.ts` for voice session state
- [ ] Track: recording status, transcript, translation, language, confidence
- [ ] Actions: startRecording, stopRecording, cancelRecording, updateTranscript

### 6. Offline Queue Integration

- [ ] Extend `lib/db/offline-store.ts` Dexie schema with `voice_recordings` store
- [ ] Queue failed uploads when offline
- [ ] Sync with existing `OfflineQueueManager` pattern

### 7. Integration into Diary Form

- [ ] Add voice button to `components/diary/diary-form-new.tsx`
- [ ] Voice recorder modal/drawer
- [ ] Auto-populate `work_performed` field with Swedish translation

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (Client)                        │
│  ┌────────────────────────────────────────────────┐      │
│  │  VoiceRecorder Component                       │      │
│  │  - MediaRecorder API                           │      │
│  │  - VAD (amplitude detection)                   │      │
│  │  - Recording controls                          │      │
│  └────────┬───────────────────────────────────────┘      │
│           │                                               │
│           │ 1. Upload audio (POST /api/voice/upload)     │
│           │                                               │
│           ▼                                               │
│  ┌────────────────────────────────────────────────┐      │
│  │  SSE Client (lib/voice/sse-client.ts)         │      │
│  │  - EventSource /api/voice/stream?sessionId=... │      │
│  │  - Receives: asr.partial, translate.final      │      │
│  └────────┬───────────────────────────────────────┘      │
│           │                                               │
│           │ 2. Updates via SSE                            │
│           │                                               │
│           ▼                                               │
│  ┌────────────────────────────────────────────────┐      │
│  │  Voice Store (Zustand)                         │      │
│  │  - transcript, translation, state              │      │
│  └────────┬───────────────────────────────────────┘      │
│           │                                               │
│           │ 3. State updates                              │
│           │                                               │
│           ▼                                               │
│  ┌────────────────────────────────────────────────┐      │
│  │  LiveCaptions Component                        │      │
│  │  - Displays real-time updates                  │      │
│  └────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/SSE
                          ▼
┌──────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                 │
│  POST /api/voice/upload → Save to Supabase Storage       │
│  GET  /api/voice/stream?sessionId=... → SSE endpoint     │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 Key Files to Create

### 1. Voice Recorder Component

**Path:** `components/voice/voice-recorder.tsx`

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceStore } from '@/lib/stores/voice-store';
import { startVAD, stopVAD } from '@/lib/voice/vad';
import { toast } from 'react-hot-toast';

export function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { startSession, stopSession, isProcessing } = useVoiceStore();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm' 
        });
        
        // Upload and start processing
        await startSession(audioBlob);
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect chunks every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start VAD monitoring
      startVAD(stream);

      toast.success('Inspelning startad');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Kunde inte starta inspelning. Kontrollera mikrofon-behörigheter.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopVAD();
      toast.success('Inspelning stoppad - bearbetar...');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!isRecording && !isProcessing && (
        <Button
          size="lg"
          onClick={startRecording}
          className="rounded-full w-16 h-16"
        >
          <Mic className="w-6 h-6" />
        </Button>
      )}

      {isRecording && (
        <Button
          size="lg"
          variant="destructive"
          onClick={stopRecording}
          className="rounded-full w-16 h-16 animate-pulse"
        >
          <Square className="w-6 h-6" />
        </Button>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Bearbetar...</span>
        </div>
      )}
    </div>
  );
}
```

### 2. Language Selector

**Path:** `components/voice/language-selector.tsx`

```typescript
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceStore } from '@/lib/stores/voice-store';

const LANGUAGES = [
  { code: 'auto', label: '🌐 Auto-detect' },
  { code: 'sv', label: '🇸🇪 Svenska' },
  { code: 'pl', label: '🇵🇱 Polski' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'pt-BR', label: '🇧🇷 Português' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'uk', label: '🇺🇦 Українська' },
  { code: 'ru', label: '🇷🇺 Русский' },
  { code: 'de', label: '🇩🇪 Deutsch' },
];

export function LanguageSelector() {
  const { language, setLanguage } = useVoiceStore();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Välj språk" />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 3. Live Captions

**Path:** `components/voice/live-captions.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { useVoiceStore } from '@/lib/stores/voice-store';

export function LiveCaptions() {
  const { transcript, translation, confidence, detectedLanguage } = useVoiceStore();
  const captionsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, translation]);

  const getConfidenceBadge = (conf: number | null) => {
    if (!conf) return null;
    
    if (conf >= 0.8) {
      return <Badge variant="default" className="bg-green-500">Hög ({(conf * 100).toFixed(0)}%)</Badge>;
    } else if (conf >= 0.6) {
      return <Badge variant="secondary">Medium ({(conf * 100).toFixed(0)}%)</Badge>;
    } else {
      return <Badge variant="destructive">Låg ({(conf * 100).toFixed(0)}%)</Badge>;
    }
  };

  if (!transcript && !translation) {
    return (
      <div className="text-center text-muted-foreground p-8">
        Väntar på transkribering...
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
      {/* Original Language */}
      {transcript && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Original ({detectedLanguage || '?'})</span>
            {getConfidenceBadge(confidence)}
          </div>
          <p className="text-sm bg-background p-3 rounded border">
            {transcript}
          </p>
        </div>
      )}

      {/* Swedish Translation */}
      {translation && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Svenska</span>
          </div>
          <p className="text-sm bg-primary/10 p-3 rounded border border-primary/20 font-medium">
            {translation}
          </p>
        </div>
      )}

      <div ref={captionsEndRef} />
    </div>
  );
}
```

### 4. SSE Client

**Path:** `lib/voice/sse-client.ts`

```typescript
import { useVoiceStore } from '@/lib/stores/voice-store';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  connect() {
    const url = `/api/voice/stream?sessionId=${this.sessionId}`;
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('asr.partial', (event) => {
      const data = JSON.parse(event.data);
      useVoiceStore.getState().updateTranscript(data.text, false);
    });

    this.eventSource.addEventListener('asr.final', (event) => {
      const data = JSON.parse(event.data);
      useVoiceStore.getState().updateTranscript(data.text, true);
      useVoiceStore.getState().setConfidence(data.confidence);
      useVoiceStore.getState().setDetectedLanguage(data.lang);
    });

    this.eventSource.addEventListener('translate.final', (event) => {
      const data = JSON.parse(event.data);
      useVoiceStore.getState().setTranslation(data.svText);
    });

    this.eventSource.addEventListener('session.done', (event) => {
      const data = JSON.parse(event.data);
      useVoiceStore.getState().completeSession(data.voiceLogId);
      this.disconnect();
    });

    this.eventSource.addEventListener('error', (event) => {
      console.error('SSE error:', event);
      useVoiceStore.getState().setError('Connection error');
      this.disconnect();
    });

    this.eventSource.onerror = () => {
      console.error('SSE connection failed');
      this.disconnect();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

### 5. Voice Activity Detection (VAD)

**Path:** `lib/voice/vad.ts`

```typescript
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let vadInterval: number | null = null;

const SILENCE_THRESHOLD = 10; // Amplitude threshold
const SILENCE_DURATION = 2000; // 2 seconds of silence

export function startVAD(stream: MediaStream, onSilence?: () => void) {
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  
  source.connect(analyser);
  analyser.fftSize = 2048;
  
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  
  let silenceStart: number | null = null;

  vadInterval = window.setInterval(() => {
    if (!analyser || !dataArray) return;

    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate average amplitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += Math.abs(normalized);
    }
    const average = sum / dataArray.length;

    if (average < SILENCE_THRESHOLD / 100) {
      // Silence detected
      if (silenceStart === null) {
        silenceStart = Date.now();
      } else if (Date.now() - silenceStart > SILENCE_DURATION) {
        onSilence?.();
        silenceStart = null;
      }
    } else {
      // Voice detected
      silenceStart = null;
    }
  }, 100);
}

export function stopVAD() {
  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  analyser = null;
  dataArray = null;
}
```

### 6. Zustand Store

**Path:** `lib/stores/voice-store.ts`

```typescript
import { create } from 'zustand';
import { SSEClient } from '@/lib/voice/sse-client';
import { toast } from 'react-hot-toast';

interface VoiceStore {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  translation: string;
  language: string;
  detectedLanguage: string | null;
  confidence: number | null;
  sessionId: string | null;
  voiceLogId: string | null;
  error: string | null;

  // Actions
  setLanguage: (lang: string) => void;
  startSession: (audioBlob: Blob) => Promise<void>;
  stopSession: () => void;
  updateTranscript: (text: string, isFinal: boolean) => void;
  setTranslation: (text: string) => void;
  setConfidence: (conf: number) => void;
  setDetectedLanguage: (lang: string) => void;
  completeSession: (voiceLogId: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  // Initial state
  isRecording: false,
  isProcessing: false,
  transcript: '',
  translation: '',
  language: 'auto',
  detectedLanguage: null,
  confidence: null,
  sessionId: null,
  voiceLogId: null,
  error: null,

  // Actions
  setLanguage: (lang) => set({ language: lang }),

  startSession: async (audioBlob) => {
    set({ isProcessing: true, error: null });

    try {
      // Upload audio
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', get().language);

      const uploadRes = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { sessionId } = await uploadRes.json();
      set({ sessionId });

      // Start SSE connection
      const sseClient = new SSEClient(sessionId);
      sseClient.connect();

    } catch (error) {
      console.error('Session start failed:', error);
      set({ 
        error: 'Failed to start processing',
        isProcessing: false 
      });
      toast.error('Kunde inte bearbeta röstinspelning');
    }
  },

  stopSession: () => {
    set({ isProcessing: false });
  },

  updateTranscript: (text, isFinal) => {
    set({ transcript: text });
  },

  setTranslation: (text) => {
    set({ translation: text });
  },

  setConfidence: (conf) => {
    set({ confidence: conf });
  },

  setDetectedLanguage: (lang) => {
    set({ detectedLanguage: lang });
  },

  completeSession: (voiceLogId) => {
    set({ 
      voiceLogId,
      isProcessing: false 
    });
    toast.success('Röstanteckning klar!');
  },

  setError: (error) => {
    set({ error, isProcessing: false });
    toast.error(error);
  },

  reset: () => {
    set({
      isRecording: false,
      isProcessing: false,
      transcript: '',
      translation: '',
      detectedLanguage: null,
      confidence: null,
      sessionId: null,
      voiceLogId: null,
      error: null,
    });
  },
}));
```

### 7. Offline Store Extension

**Path:** `lib/db/offline-store.ts` (extend existing)

```typescript
// Add to existing Dexie schema
db.version(2).stores({
  // ... existing stores ...
  voice_recordings: 'id, user_id, audio_blob, language, synced, created_at',
});

export interface VoiceRecording {
  id: string;
  user_id: string;
  audio_blob: Blob;
  language: string;
  synced: boolean;
  created_at: string;
}
```

---

## ✅ Acceptance Criteria

- [ ] MediaRecorder API successfully captures audio in supported browsers
- [ ] VAD detects voice and silence appropriately (< 2s silence threshold)
- [ ] Language selector defaults to "Auto-detect" and allows manual override
- [ ] SSE connection establishes and receives real-time updates
- [ ] Live captions display original text and Swedish translation
- [ ] Confidence scores displayed with color-coded badges
- [ ] Recording state transitions work correctly (idle → recording → processing → complete)
- [ ] Voice button integrates into diary form without breaking existing functionality
- [ ] Offline recordings queue successfully and sync when online
- [ ] Error messages are clear and actionable

---

## 🧪 Testing

### Unit Tests

```typescript
// lib/voice/__tests__/vad.test.ts
describe('VAD', () => {
  it('detects silence after threshold period', () => {
    // Test silence detection logic
  });

  it('resets silence timer when voice detected', () => {
    // Test voice detection resets timer
  });
});

// lib/stores/__tests__/voice-store.test.ts
describe('Voice Store', () => {
  it('updates transcript on partial event', () => {
    // Test state updates
  });

  it('completes session with voice log ID', () => {
    // Test completion flow
  });
});
```

### Integration Tests

- Test SSE message handling (mock server)
- Test offline queue with OfflineQueueManager
- Test audio upload flow

### E2E Tests (Playwright)

```typescript
test('record voice note and receive transcription', async ({ page }) => {
  await page.goto('/dashboard/diary/new');
  
  // Click voice button
  await page.click('[data-testid="voice-recorder-button"]');
  
  // Simulate recording
  await page.click('[data-testid="start-recording"]');
  await page.waitForTimeout(3000);
  await page.click('[data-testid="stop-recording"]');
  
  // Wait for transcription
  await expect(page.locator('[data-testid="live-captions"]')).toContainText('Svenska');
});
```

---

## 📚 Browser Compatibility

| Browser | Version | MediaRecorder | SSE | Status |
|---------|---------|---------------|-----|--------|
| Chrome  | 120+    | ✅            | ✅  | Full support |
| Edge    | 120+    | ✅            | ✅  | Full support |
| Safari  | 17+     | ✅            | ✅  | Full support |
| Firefox | 120+    | ✅            | ✅  | Best effort |

**Notes:**
- Safari 17+ has full MediaRecorder support
- All browsers support EventSource (SSE)
- Test on iOS Safari specifically for PWA context

---

## 🚀 Next Steps

After completing EPIC 29:

1. **EPIC 30**: Integrate voice recorder into diary form, handle offline sync, E2E testing
2. **Testing**: Comprehensive browser testing on target devices
3. **Polish**: Animations, loading states, error boundaries

---

**Status**: 📋 Ready to Start  
**Est. Completion**: 3-4 days  
**Reviewer**: [Assign reviewer]


