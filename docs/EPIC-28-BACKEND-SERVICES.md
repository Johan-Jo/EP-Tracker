# EPIC 28: ASR & Translation Backend Services

**Status:** 📋 Ready to Start  
**Estimated Effort:** 3-4 days  
**Dependencies:** EPIC 27 (Foundation)  
**Blocks:** EPIC 29 (Voice Capture UI)

---

## 🎯 Goal

Implement Server-Sent Events (SSE) streaming API for real-time audio transcription (Whisper) and translation (GPT-4o), with REST fallback for compatibility.

---

## 📋 Tasks

### 1. API Infrastructure

- [ ] Create SSE endpoint at `/api/voice/stream`
- [ ] Create REST endpoints at `/api/voice/upload` and `/api/voice/finalize`
- [ ] Implement session management (in-memory or database)
- [ ] Add authentication middleware for all endpoints
- [ ] Configure Edge runtime for SSE support

### 2. Whisper Integration

- [ ] Set up OpenAI Whisper API client
- [ ] Implement streaming audio chunking (3-6s segments)
- [ ] Add language auto-detection with confidence scoring
- [ ] Handle partial transcriptions
- [ ] Add error handling and retry logic
- [ ] Implement rate limiting

### 3. Translation Service

- [ ] Set up GPT-4o translation client
- [ ] Create construction glossary system prompt
- [ ] Implement segment-by-segment translation
- [ ] Add unit normalization (m², mm, lpm)
- [ ] Handle proper nouns and numbers preservation
- [ ] Add translation confidence scoring

### 4. Audio Processing

- [ ] Accept WebM/Opus audio chunks
- [ ] Buffer and concatenate for Whisper API
- [ ] Save full audio to Supabase Storage
- [ ] Generate signed download URLs
- [ ] Implement 30-day retention cleanup job

### 5. Session Management

- [ ] Create VoiceSession class
- [ ] Track state: idle → listening → processing → done
- [ ] Store segments, confidences, timings
- [ ] Implement cleanup on disconnect/timeout
- [ ] Add telemetry logging

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Client (Browser)                      │
│  MediaRecorder → REST Upload → SSE Stream               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ 1. POST /api/voice/upload (audio blob)
                  │ 2. GET /api/voice/stream?sessionId=...
                  │    (Server-Sent Events)
                  ▼
┌─────────────────────────────────────────────────────────┐
│              SSE Handler (Edge Runtime)                 │
│  ┌──────────────────────────────────────────┐          │
│  │  1. Client uploads full audio via POST    │          │
│  │  2. Server fetches audio from storage     │          │
│  │  3. Send to Whisper API                   │          │
│  │  4. Stream partial transcript via SSE     │          │
│  │  5. Send to GPT-4o for translation        │          │
│  │  6. Stream translation via SSE            │          │
│  │  7. Save to database, send done event     │          │
│  └──────────────────────────────────────────┘          │
└─────────────────┬───────────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
  ┌─────────────┐   ┌──────────────┐
  │  Whisper    │   │   GPT-4o     │
  │  API (ASR)  │   │ (Translation)│
  └─────┬───────┘   └──────┬───────┘
        │                  │
        ▼                  ▼
  ┌──────────────────────────────┐
  │    voice_logs (Supabase)     │
  └──────────────────────────────┘
```

---

## 📝 Key Files to Create

### 1. SSE Streaming Handler

**Path:** `app/api/voice/stream/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whisperTranscribe } from '@/lib/voice/whisper';
import { translateToSwedish } from '@/lib/voice/translate';
import { createVoiceLog } from '@/lib/db/voice-logs';

export const runtime = 'edge';
export const preferredRegion = 'arn1';

// Server-Sent Events handler
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }
  
  // Authenticate user
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Process audio in background
  processAudioSession(sessionId, user.id, writer, encoder).catch((error) => {
    console.error('SSE processing error:', error);
    writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
      message: error instanceof Error ? error.message : 'Processing failed'
    })}\n\n`));
  }).finally(() => {
    writer.close();
  });
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

async function processAudioSession(
  sessionId: string,
  userId: string,
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder
) {
  const supabase = await createClient();
  
  // 1. Fetch audio from storage (uploaded via /api/voice/upload)
  const audioPath = `${userId}/${sessionId}.webm`;
  
  await sendEvent(writer, encoder, {
    type: 'session.started',
    sessionId,
  });
  
  const { data: audioData, error: downloadError } = await supabase.storage
    .from('voice-recordings')
    .download(audioPath);
  
  if (downloadError || !audioData) {
    throw new Error('Audio file not found');
  }
  
  const audioBuffer = await audioData.arrayBuffer();
  
  // 2. Get language preference from session metadata
  const { data: sessionMeta } = await supabase
    .from('voice_sessions')
    .select('language_hint')
    .eq('id', sessionId)
    .single();
  
  const languageHint = sessionMeta?.language_hint || 'auto';
  
  // 3. Transcribe with Whisper
  await sendEvent(writer, encoder, {
    type: 'asr.processing',
    message: 'Transcribing audio...',
  });
  
  const transcription = await whisperTranscribe(audioBuffer, {
    language: languageHint,
    detectLanguage: languageHint === 'auto',
  });
  
  await sendEvent(writer, encoder, {
    type: 'asr.final',
      text: transcription.text,
      lang: transcription.language,
      confidence: transcription.confidence,
    timestamps: transcription.timestamps,
  });
    
  // 4. Check confidence - prompt for manual language if low
    if (transcription.confidence < 0.6) {
    await sendEvent(writer, encoder, {
        type: 'lang.ambiguous',
        detectedLang: transcription.language,
        confidence: transcription.confidence,
    });
    // In production, wait for user to confirm language via another request
    // For now, proceed with detected language
  }
  
  // 5. Translate to Swedish
  await sendEvent(writer, encoder, {
    type: 'translate.processing',
    message: 'Translating to Swedish...',
  });
  
  const translation = await translateToSwedish(
    transcription.text,
    transcription.language
  );
  
  await sendEvent(writer, encoder, {
      type: 'translate.final',
    svText: translation.text,
    confidence: translation.confidence,
  });
  
  // 6. Save to database
  const startTime = Date.now();
  
  const voiceLog = await createVoiceLog({
    user_id: userId,
    audio_url: audioPath,
    audio_duration_ms: transcription.timestamps.end,
    audio_size_bytes: audioBuffer.byteLength,
    original_lang: languageHint,
    detected_lang: transcription.language,
    lang_confidence: transcription.confidence,
    original_text: transcription.text,
    asr_provider: 'whisper-1',
    asr_confidence: transcription.confidence,
    translated_sv: translation.text,
    translation_provider: 'gpt-4o',
    translation_confidence: translation.confidence,
    segments: [{
      startMs: transcription.timestamps.start,
      endMs: transcription.timestamps.end,
      text: transcription.text,
      conf: transcription.confidence,
    }],
    processing_time_ms: Date.now() - startTime,
  });
  
  // 7. Send completion event
  await sendEvent(writer, encoder, {
    type: 'session.done',
    voiceLogId: voiceLog.id,
    originalText: transcription.text,
    translatedSv: translation.text,
    language: transcription.language,
  });
}

async function sendEvent(
  writer: WritableStreamDefaultWriter,
  encoder: TextEncoder,
  data: any
) {
  await writer.write(
    encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
  );
}
```

**Key Differences from WebSocket:**
- Uses Server-Sent Events (one-way: server → client)
- Audio uploaded separately via POST before starting SSE
- Processes full audio file (not streaming chunks)
- Simpler server implementation (no bidirectional complexity)
- Works on Vercel Edge Runtime

### 2. Whisper Service

**Path:** `lib/voice/whisper.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WhisperResult {
  text: string;
  language: string;
  confidence: number;
  timestamps: {
    start: number;
    end: number;
  };
}

export async function whisperTranscribe(
  audioData: ArrayBuffer,
  options: {
    language?: string;
    detectLanguage?: boolean;
  }
): Promise<WhisperResult> {
  const file = new File([audioData], 'audio.webm', { type: 'audio/webm' });
  
  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options.language !== 'auto' ? options.language : undefined,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });
    
    // Extract confidence from log probabilities (if available)
    const confidence = calculateConfidence(response);
    
    return {
      text: response.text,
      language: response.language || options.language || 'unknown',
      confidence,
      timestamps: {
        start: response.segments?.[0]?.start * 1000 || 0,
        end: response.segments?.[response.segments.length - 1]?.end * 1000 || 0,
      },
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw new Error('Transcription failed');
  }
}

function calculateConfidence(response: any): number {
  // Use avg_logprob if available, otherwise default
  if (response.segments && response.segments.length > 0) {
    const avgLogProb = response.segments.reduce(
      (sum: number, seg: any) => sum + (seg.avg_logprob || 0),
      0
    ) / response.segments.length;
    
    // Convert log prob to 0-1 scale (rough approximation)
    return Math.max(0, Math.min(1, Math.exp(avgLogProb)));
  }
  
  return 0.85; // Default confidence
}
```

### 3. Translation Service

**Path:** `lib/voice/translate.ts`

```typescript
import OpenAI from 'openai';
import { CONSTRUCTION_GLOSSARY } from './glossary';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a professional translator specializing in Swedish construction trade language.

Rules:
1. Translate to Swedish construction terminology (AMA/MEPS-style)
2. Use concise, imperative phrasing
3. Keep all numbers and units unchanged
4. Do not translate proper nouns (names, brands)
5. Prefer verbs like: spackla, montera, lägga, maskera
6. Normalize units: m² (not sqm), mm (not millimeter), lpm (not l/min)
7. Use technical terms from the glossary below

Glossary (Source → Swedish):
${Object.entries(CONSTRUCTION_GLOSSARY).map(([k, v]) => `${k} → ${v}`).join('\n')}

Output ONLY the Swedish translation, nothing else.
`.trim();

export interface TranslationResult {
  text: string;
  confidence: number;
}

export async function translateToSwedish(
  text: string,
  sourceLang: string
): Promise<TranslationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Translate from ${sourceLang} to Swedish:\n\n${text}` },
      ],
      temperature: 0.3, // Low temp for consistent terminology
      max_tokens: 500,
    });
    
    const translated = response.choices[0].message.content?.trim() || '';
    
    // Confidence based on finish_reason and logprobs (if available)
    const confidence = response.choices[0].finish_reason === 'stop' ? 0.9 : 0.7;
    
    return {
      text: translated,
      confidence,
    };
  } catch (error) {
    console.error('Translation API error:', error);
    throw new Error('Translation failed');
  }
}
```

### 4. Construction Glossary

**Path:** `lib/voice/glossary.ts`

```typescript
export const CONSTRUCTION_GLOSSARY: Record<string, string> = {
  // Polish → Swedish
  'szpachla': 'spackel',
  'płyta g-k': 'gipsskiva',
  'gips': 'gips',
  'listwa': 'list',
  'parkiet': 'parkett',
  'tynk': 'puts',
  'farba': 'färg',
  'wykończenie': 'slutbehandling',
  'malowanie': 'målning',
  'montaż': 'montering',
  'demontaż': 'demontering',
  'izolacja': 'isolering',
  'wentylacja': 'ventilation',
  'elektryka': 'el',
  'hydraulika': 'VVS',
  'dach': 'tak',
  'okno': 'fönster',
  'drzwi': 'dörr',
  'podłoga': 'golv',
  'sufit': 'tak',
  'ściana': 'vägg',
  
  // Portuguese → Swedish
  'reboco': 'puts',
  'gesso': 'gips',
  'pintura': 'målning',
  'piso': 'golv',
  'parede': 'vägg',
  'teto': 'tak',
  'porta': 'dörr',
  'janela': 'fönster',
  'telha': 'takpanna',
  'azulejo': 'kakel',
  
  // Spanish → Swedish
  'yeso': 'gips',
  'pintura': 'färg',
  'pared': 'vägg',
  'suelo': 'golv',
  'techo': 'tak',
  'puerta': 'dörr',
  'ventana': 'fönster',
  'azulejo': 'kakel',
  
  // English → Swedish
  'drywall': 'gipsskiva',
  'paint': 'färg',
  'wall': 'vägg',
  'floor': 'golv',
  'ceiling': 'tak',
  'door': 'dörr',
  'window': 'fönster',
  'tile': 'kakel',
  'plaster': 'puts',
  'insulation': 'isolering',
};

// Unit normalizations
export const UNIT_NORMALIZATIONS: Record<string, string> = {
  'sqm': 'm²',
  'square meter': 'm²',
  'square metre': 'm²',
  'millimeter': 'mm',
  'centimeter': 'cm',
  'meter': 'm',
  'liters per minute': 'lpm',
  'l/min': 'lpm',
};
```

### 5. Session Metadata Helper (Optional)

**Path:** `lib/voice/session-metadata.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

/**
 * Optional: Store session metadata in database for tracking
 * Can also use in-memory Map if preferred
 */

interface VoiceSessionMetadata {
  id: string;
  user_id: string;
  language_hint: string;
  created_at: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}

export async function createSessionMetadata(
  userId: string,
  languageHint: string
): Promise<string> {
  const supabase = await createClient();
  const sessionId = crypto.randomUUID();
  
  // Option A: Store in database (persistent, survives restarts)
  await supabase.from('voice_sessions').insert({
    id: sessionId,
    user_id: userId,
    language_hint: languageHint,
    status: 'uploading',
  });
  
  // Option B: In-memory Map (simpler, but lost on restart)
  // sessions.set(sessionId, { userId, languageHint, status: 'uploading' });
  
  return sessionId;
}

export async function getSessionMetadata(
  sessionId: string
): Promise<VoiceSessionMetadata | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) return null;
  return data;
}

export async function updateSessionStatus(
  sessionId: string,
  status: VoiceSessionMetadata['status']
): Promise<void> {
  const supabase = await createClient();
  
  await supabase
    .from('voice_sessions')
    .update({ status })
    .eq('id', sessionId);
}
```

**Note:** For MVP, session metadata can be simplified or removed if audio upload includes language hint as metadata.

### 6. REST Fallback Routes

**Path:** `app/api/voice/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSessionMetadata } from '@/lib/voice/session-metadata';

export const runtime = 'nodejs'; // Handles file upload
export const preferredRegion = 'arn1';
export const maxDuration = 30; // 30 seconds max for upload

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'auto';
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    
    // Validate file size (max 10 MB)
    if (audioFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }
    
    // Create session
    const sessionId = await createSessionMetadata(user.id, language);
    
    // Upload to storage
    const audioPath = `${user.id}/${sessionId}.webm`;
    const { error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(audioPath, audioFile, {
        contentType: audioFile.type,
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
    
    // Return sessionId for SSE connection
    return NextResponse.json({ 
      sessionId,
      message: 'Audio uploaded successfully. Connect to SSE for processing.' 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }, { status: 500 });
  }
}
```

**Usage Flow:**
1. Client records audio
2. Client uploads via `POST /api/voice/upload` with FormData
3. Server returns `sessionId`
4. Client opens SSE connection: `GET /api/voice/stream?sessionId=...`
5. Server processes and streams results via SSE

**Path:** `app/api/voice/finalize/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { whisperTranscribe } from '@/lib/voice/whisper';
import { translateToSwedish } from '@/lib/voice/translate';
import { createVoiceLog } from '@/lib/db/voice-logs';
import { createVoiceLogSchema } from '@/lib/validations/voice-notes';

export const runtime = 'nodejs';
export const preferredRegion = 'arn1';
export const maxDuration = 300; // 5 minutes max

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { audioPath, languageHint = 'auto' } = await req.json();
  
  try {
    // Download audio from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice-recordings')
      .download(audioPath);
    
    if (downloadError || !audioData) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }
    
    const audioBuffer = await audioData.arrayBuffer();
    
    // Transcribe
    const startTime = Date.now();
    const transcription = await whisperTranscribe(audioBuffer, {
      language: languageHint,
      detectLanguage: languageHint === 'auto',
    });
    
    // Translate
    const translation = await translateToSwedish(
      transcription.text,
      transcription.language
    );
    
    const processingTime = Date.now() - startTime;
    
    // Save to database
    const voiceLog = await createVoiceLog({
      user_id: user.id,
      audio_url: audioPath,
      audio_duration_ms: transcription.timestamps.end,
      audio_size_bytes: audioBuffer.byteLength,
      original_lang: languageHint,
      detected_lang: transcription.language,
      lang_confidence: transcription.confidence,
      original_text: transcription.text,
      asr_provider: 'whisper-v3',
      asr_confidence: transcription.confidence,
      translated_sv: translation.text,
      translation_provider: 'gpt-4o',
      segments: [{
        startMs: transcription.timestamps.start,
        endMs: transcription.timestamps.end,
        text: transcription.text,
        conf: transcription.confidence,
      }],
      processing_time_ms: processingTime,
    });
    
    return NextResponse.json({
      voiceLogId: voiceLog.id,
      originalText: transcription.text,
      translatedSv: translation.text,
      language: transcription.language,
      confidence: transcription.confidence,
    });
  } catch (error) {
    console.error('Finalize error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
```

---

## 🔐 Environment Variables

Add to `.env.local`:

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...

# Voice Settings
ASR_PROVIDER=whisper-v3
ASR_MODEL=whisper-1
TRANSLATE_PROVIDER=gpt-4o
TRANSLATE_TARGET=sv
AUDIO_MAX_DURATION_S=180
```

---

## ✅ Acceptance Criteria

- [ ] Audio upload endpoint accepts FormData with audio file
- [ ] SSE connection establishes successfully with sessionId
- [ ] SSE events stream correctly (session.started, asr.final, translate.final, session.done)
- [ ] Whisper transcribes audio in < 5s total
- [ ] Language auto-detection works for 8 supported languages
- [ ] Translation to Swedish completes in < 1s
- [ ] Construction glossary terms applied correctly
- [ ] Voice log saved to database with all fields
- [ ] REST fallback works independently (upload + finalize without SSE)
- [ ] Error messages clear and actionable
- [ ] Works on Vercel Edge Runtime
- [ ] File size validation (max 10 MB)
- [ ] Rate limiting prevents abuse

---

## 🧪 Testing

### Unit Tests

```typescript
// lib/voice/__tests__/whisper.test.ts
import { whisperTranscribe } from '../whisper';

describe('Whisper Transcription', () => {
  it('transcribes English audio', async () => {
    const result = await whisperTranscribe(mockAudioBuffer, {
      language: 'en',
      detectLanguage: false,
    });
    
    expect(result.text).toBeTruthy();
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.5);
  });
  
  it('auto-detects language', async () => {
    const result = await whisperTranscribe(mockAudioBuffer, {
      detectLanguage: true,
    });
    
    expect(result.language).toBeTruthy();
    expect(result.language).not.toBe('auto');
  });
});
```

### Integration Tests

```bash
# Test SSE flow

# Step 1: Upload audio
curl -X POST http://localhost:3000/api/voice/upload \
  -H "Authorization: Bearer <token>" \
  -F "audio=@test.webm" \
  -F "language=pl"

# Response: { "sessionId": "abc-123", "message": "..." }

# Step 2: Connect to SSE stream (in browser or with curl --no-buffer)
curl -N http://localhost:3000/api/voice/stream?sessionId=abc-123 \
  -H "Authorization: Bearer <token>"

# Receive SSE events:
data: {"type":"session.started","sessionId":"abc-123"}

data: {"type":"asr.processing","message":"Transcribing audio..."}

data: {"type":"asr.final","text":"Dzień dobry","lang":"pl","confidence":0.92}

data: {"type":"translate.processing","message":"Translating to Swedish..."}

data: {"type":"translate.final","svText":"God dag","confidence":0.89}

data: {"type":"session.done","voiceLogId":"...","originalText":"Dzień dobry","translatedSv":"God dag"}

# Stream closes
```

**JavaScript Client Example:**

```javascript
// Upload audio
const formData = new FormData();
formData.append('audio', audioBlob);
formData.append('language', 'auto');

const uploadRes = await fetch('/api/voice/upload', {
  method: 'POST',
  body: formData,
});

const { sessionId } = await uploadRes.json();

// Connect to SSE
const eventSource = new EventSource(`/api/voice/stream?sessionId=${sessionId}`);

eventSource.addEventListener('asr.final', (e) => {
  const data = JSON.parse(e.data);
  console.log('Transcript:', data.text);
});

eventSource.addEventListener('translate.final', (e) => {
  const data = JSON.parse(e.data);
  console.log('Swedish:', data.svText);
});

eventSource.addEventListener('session.done', (e) => {
  const data = JSON.parse(e.data);
  console.log('Complete! Voice log ID:', data.voiceLogId);
  eventSource.close();
});

eventSource.onerror = () => {
  console.error('SSE connection error');
  eventSource.close();
};
```

---

## 📚 Documentation

- [ ] Add API documentation for `/api/voice/upload` and `/api/voice/stream`
- [ ] Document SSE event types and payloads
- [ ] Add example client code (React with EventSource)
- [ ] Document rate limits and quotas
- [ ] Add troubleshooting guide (SSE connection issues, CORS, buffering)

---

## 🚀 Next Steps

After completing EPIC 28:

1. **EPIC 29**: Voice Capture UI (Frontend components with VAD, live captions)
2. **EPIC 30**: Daybook Integration (Save to Daybook, offline queue, testing)

---

**Status**: 📋 Ready to Start  
**Est. Completion**: 3-4 days  
**Reviewer**: [Assign reviewer]


