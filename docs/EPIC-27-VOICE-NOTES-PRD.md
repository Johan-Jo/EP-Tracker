# EPIC 27-30: Daybook Multilingual Voice Notes

**Version:** 1.0  
**Owner:** EP-Tracker Core (Voice/Daybook)  
**Target Release:** MVP in 2 sprints  
**Status:** 📋 Planning  
**Environments:** Web PWA (Next.js 15), Server (Node/Edge), Supabase (Postgres/Storage)

---

## 📋 Summary

Field workers record quick voice notes in any supported language. The system transcribes in the detected (or user-selected) source language, translates to Swedish, and logs the Swedish text into the Daybook with a toggle to reveal the original transcript.

---

## 🎯 Goals & Non-Goals

### Goals

- ✅ Hands-free voice capture with VAD (voice activity detection), no "hold to talk"
- ✅ Auto-detect language with manual override fallback
- ✅ Accurate, concise Swedish output with Swedish construction terminology
- ✅ Reliable audit trail: store original transcript + Swedish translation + timestamps + confidence
- ✅ Low-latency streaming UX for near real-time captions and quick confirmation into Daybook

### Non-Goals (MVP)

- ❌ No speaker diarization (multi-speaker separation)
- ❌ No offline on-device ASR (we queue uploads if offline)
- ❌ No custom TTS playback

---

## 👥 Primary User Stories

1. **As a painter on site**, I press the mic, speak in Polish, and my note appears in Swedish in Daybook, with a toggle to show the Polish original.

2. **As a foreman**, I need the model to auto-detect language, but I can force the language if detection fails.

3. **As an admin**, I want consistent terminology (AMA/MEPS-like phrasing) and metrics on ASR/translation quality.

---

## 🌍 Supported Languages (MVP)

- **Auto** (default)
- **Manual choices** (initial): `sv`, `pl`, `en`, `pt-BR`, `es`, `uk`, `ru`, `de`
- **Always translate → `sv`** for Daybook storage (original preserved)

---

## 📊 EPIC Breakdown

This PRD is implemented across 4 EPICs:

| EPIC | Title | Scope | Estimated Days |
|------|-------|-------|----------------|
| **EPIC 27** | Voice Notes Foundation & Data Model | Database schema, storage setup, RLS policies | 2 days |
| **EPIC 28** | ASR & Translation Backend Services | API routes, WebSocket streaming, Whisper integration | 3-4 days |
| **EPIC 29** | Voice Capture UI & Real-time Streaming | Frontend components, VAD, live captions | 3-4 days |
| **EPIC 30** | Daybook Integration & Polish | Save to Daybook, glossary, offline queue, testing | 2-3 days |

**Total Estimate:** 10-13 days (2 sprints)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PWA Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ VoiceRecorder│  │ LiveCaptions │  │ LanguageSelect│     │
│  │  Component   │  │   Component  │  │   Component   │     │
│  └──────┬───────┘  └──────▲───────┘  └──────┬────────┘     │
│         │                  │                  │              │
│         │  MediaRecorder   │  WebSocket       │              │
│         │  + VAD           │  Messages        │              │
│         ▼                  │                  ▼              │
│  ┌──────────────────────────────────────────────────┐      │
│  │      Voice Session State (Zustand)                │      │
│  └──────────────┬───────────────────────────────────┘      │
└─────────────────┼──────────────────────────────────────────┘
                  │
                  │ WebSocket /api/voice/stream
                  │ (fallback: REST /api/voice/upload)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend API (Next.js Route Handlers)           │
│  ┌──────────────────────────────────────────────────┐      │
│  │          WebSocket Handler (Node runtime)         │      │
│  │  • Receives audio chunks                          │      │
│  │  • Streams to Whisper API                         │      │
│  │  • Language detection                             │      │
│  │  • Sends partials back                            │      │
│  └───────┬──────────────────────────────────────────┘      │
│          │                                                   │
│          ▼                                                   │
│  ┌──────────────────┐  ┌─────────────────┐                │
│  │  Whisper Service  │  │ Translation Svc │                │
│  │  (OpenAI/Groq)   │  │  (GPT-4o/DeepL) │                │
│  └──────┬───────────┘  └────────┬────────┘                │
│         │                        │                          │
│         │  original_text         │  translated_sv          │
│         ▼                        ▼                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │        voice_logs table (Supabase)                │      │
│  │  • original_text, original_lang                   │      │
│  │  • translated_sv                                  │      │
│  │  • segments (JSON)                                │      │
│  │  • confidence scores                              │      │
│  │  • audio_url (Supabase Storage)                   │      │
│  └──────────────────┬───────────────────────────────┘      │
└─────────────────────┼──────────────────────────────────────┘
                      │
                      │ Link via voice_log_id
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Daybook Integration                         │
│  ┌──────────────────────────────────────────────────┐      │
│  │       daybook_entries table (Supabase)            │      │
│  │  • body_sv (Swedish canonical text)               │      │
│  │  • voice_log_id (FK to voice_logs)                │      │
│  │  • job_id (optional link to project)              │      │
│  │  • edited_by_user flag                            │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security & Privacy

1. **HTTPS**: All communication encrypted in transit
2. **Signed Upload URLs**: Supabase Storage URLs signed per user/tenant
3. **RLS Policies**: Row Level Security on `voice_logs` and `daybook_entries`
4. **Encryption at Rest**: Supabase handles storage encryption
5. **Audio Retention**: Optional auto-delete raw audio after 30 days (configurable)
6. **PII Guardrail**: Optional masking pass for phone numbers/emails in translated text

---

## 📈 Success Criteria (MVP)

- ✅ User can record a note in any of the listed languages with Auto default
- ✅ If auto-detect confidence < 0.6, UI prompts for manual language and the note still completes
- ✅ Swedish text appears within 0.8s p95 after segment end in stable network
- ✅ Daybook entry saves Swedish text with link to original transcript & segments
- ✅ Data visible only to the author (and permitted roles) via RLS
- ✅ Works on Chrome 120+, Edge 120+, Safari 17+ (desktop/mobile)
- ✅ Offline capture queues successfully and processes on reconnect

---

## 🚀 Rollout Plan

1. **Feature Flag**: `voice_daybook_mvp` per tenant (using existing feature flag system)
2. **Pilot**: 5-10 users (Polish, Portuguese, Spanish speakers)
3. **Collect Telemetry**: Monitor for 1 week, adjust glossary
4. **General Availability**: Roll out to all users

---

## 🔮 Future Enhancements (Phase 3)

- In-app custom glossary per company
- Entity stabilization for job names/materials
- Speaker labels and summarize-to-tasks ("Create 3 tasks from this note")
- Bidirectional translation (SV → other) for exports
- On-device ASR for full offline support
- Custom TTS playback

---

## 📚 Related Documentation

- [EPIC-27: Foundation & Data Model](./EPIC-27-FOUNDATION.md)
- [EPIC-28: Backend Services](./EPIC-28-BACKEND-SERVICES.md)
- [EPIC-29: Voice Capture UI](./EPIC-29-VOICE-CAPTURE-UI.md)
- [EPIC-30: Daybook Integration](./EPIC-30-DAYBOOK-INTEGRATION.md)

---

## 📝 Technical Specifications

### Performance Requirements

- **Latency**: < 800 ms average from segment end → Swedish line rendered (p95)
- **Reliability**: ≥ 99.5% successful end-to-end per note
- **Availability**: 99.9% uptime for ASR/translation services

### Quality Metrics

- **WER** (Word Error Rate): Track for source transcription
- **Translation Quality**: Human spot-checks weekly
- **Language Detection**: Confidence scores logged per session
- **User Satisfaction**: Save conversion rate (started vs saved)

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ | ✅ Supported |
| Edge | 120+ | ✅ Supported |
| Safari | 17+ | ✅ Supported |
| Firefox | 120+ | ⚠️ Best effort |

### API Rate Limits

- **Whisper API**: 50 requests/minute per user
- **Translation API**: 100 requests/minute per user
- **Storage Upload**: 100 MB/day per user

---

## 💰 Cost Estimates (per 1000 voice notes)

| Service | Cost | Notes |
|---------|------|-------|
| Whisper API (OpenAI) | $6-12 | Depending on audio length (avg 30-60s) |
| GPT-4o Translation | $2-4 | ~100-200 tokens per note |
| Supabase Storage | $0.10 | 100 MB storage, 30-day retention |
| **Total** | **$8-16** | Per 1000 notes |

**Monthly estimate for 100 active users** (avg 10 notes/user/month): $8-16/month

---

## 🧪 Testing Strategy

### Unit Tests
- VAD boundary detection
- Language selector state machine
- Stream event reducers
- Glossary term replacement

### Integration Tests
- WebSocket happy path (3 languages)
- REST fallback scenario
- Offline queue → replay on reconnect
- RLS policy enforcement

### E2E Tests (Playwright)
- Full voice note flow: record → transcribe → translate → save
- Language auto-detection
- Manual language override
- Offline capture and sync

### Performance Tests
- Segment p95 latency on 4G (Chrome Android)
- iOS Safari streaming stability
- Concurrent user load (50 users)

### i18n Tests
- Polish/Portuguese/Spanish/English samples
- Numerals & units preserved (m², mm, lpm)
- Construction terminology accuracy

---

## 📋 Configuration

### Environment Variables

```bash
# ASR Provider
ASR_PROVIDER=whisper-v3
ASR_MODEL=large-v3
OPENAI_API_KEY=sk-...

# Translation Provider
TRANSLATE_PROVIDER=gpt-4o
TRANSLATE_TARGET=sv
OPENAI_TRANSLATION_MODEL=gpt-4o

# Audio Settings
AUDIO_MAX_DURATION_S=180
AUDIO_FORMAT=webm/opus
RAW_AUDIO_RETENTION_DAYS=30

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Feature Flags
NEXT_PUBLIC_VOICE_DAYBOOK_ENABLED=true

# Storage Bucket
VOICE_AUDIO_BUCKET=voice-recordings
```

---

## 🎓 Glossary & Terminology

### Construction Terms Mapping

| Source (Polish) | Target (Swedish) | Context |
|----------------|-----------------|---------|
| szpachla | spackel | Spackle/putty |
| płyta g-k | gipsskiva | Drywall |
| listwa | list | Trim/molding |
| parkiet | parkett | Parquet flooring |
| tynk | puts | Plaster |
| farba | färg | Paint |
| wykończenie | slutbehandling | Finishing |

### Unit Normalization

- **Area**: m² (always use superscript)
- **Length**: mm, cm, m (metric only)
- **Volume**: liter, m³
- **Flow**: lpm (liters per minute)

---

## 📞 Support & Contacts

**Technical Owner**: EP-Tracker Core Team  
**Product Owner**: [Your Name]  
**External Dependencies**: OpenAI (Whisper, GPT-4o)  
**Monitoring**: PostHog, Supabase Logs

---

**Next Steps**: Review this PRD, then proceed to [EPIC 27: Foundation & Data Model](./EPIC-27-FOUNDATION.md)









