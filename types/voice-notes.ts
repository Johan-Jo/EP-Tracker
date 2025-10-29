/**
 * Voice Notes Type Definitions
 * EPIC 27: Voice Notes Foundation
 */

export interface VoiceLog {
  id: string;
  organization_id: string;
  user_id: string;
  storage_path: string;
  original_language: string;
  transcription: string;
  translation: string | null;
  confidence: number | null;
  duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface VoiceSession {
  id: string;
  user_id: string;
  voice_log_id: string | null;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  language_hint: string;
  created_at: string;
  updated_at: string;
}

export interface VoiceSegment {
  startMs: number;
  endMs: number;
  text: string;
  conf: number;
}

export interface VoiceTranscription {
  text: string;
  language: string;
  confidence: number;
  segments: VoiceSegment[];
}

export interface VoiceTranslation {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  entry_date: string;
  work_performed: string | null;
  weather: string | null;
  temperature: number | null;
  photos: string[] | null;
  obstacles: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  voice_log_id: string | null;
  entry_source: 'manual' | 'voice';
}

export type VoiceDiaryEntry = DiaryEntry & {
  voice_log: VoiceLog | null;
};
