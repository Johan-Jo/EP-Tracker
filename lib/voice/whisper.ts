/**
 * Whisper API Integration
 * EPIC 28: Backend Services - ASR
 */

import OpenAI from 'openai';
import type { VoiceSegment } from '@/types/voice-notes';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments: VoiceSegment[];
}

export interface WhisperOptions {
  language?: string; // ISO 639-1 code or undefined for auto-detect
  prompt?: string; // Optional context/vocabulary hints
  temperature?: number; // 0-1, default 0
}

/**
 * Transcribe audio using Whisper API
 * @param audioBuffer - Audio file buffer
 * @param filename - Original filename (for MIME type detection)
 * @param options - Whisper options
 * @returns Transcription result
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: WhisperOptions = {}
): Promise<WhisperResponse> {
  const startTime = Date.now();
  
  try {
    // Create a File-like object from buffer
    const uint8Array = new Uint8Array(audioBuffer);
    const file = new File([uint8Array], filename, {
      type: getMimeType(filename),
    });
    
    // Call Whisper API with verbose JSON for segments
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: options.language || undefined,
      prompt: options.prompt || undefined,
      temperature: options.temperature || 0,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });
    
    const duration = Date.now() - startTime;
    
    // Map Whisper segments to our VoiceSegment format
    const segments: VoiceSegment[] = (response.segments || []).map((seg) => ({
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000),
      text: seg.text.trim(),
      conf: seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.95,
    }));
    
    return {
      text: response.text.trim(),
      language: response.language || 'unknown',
      duration,
      segments,
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw new Error(
      `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeMap: Record<string, string> = {
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    mp3: 'audio/mpeg',
    mp4: 'audio/mp4',
    wav: 'audio/wav',
  };
  
  return mimeMap[ext || ''] || 'audio/webm';
}

/**
 * Create construction-specific prompt for Whisper
 * (helps with domain-specific vocabulary)
 */
export function createConstructionPrompt(): string {
  return `
Construction diary entry. Common terms: 
betong (concrete), armering (reinforcement), gjutning (pouring),
plåt (sheet metal), isolering (insulation), stomme (frame),
fasad (facade), tak (roof), grund (foundation), påle (pile),
brädor (boards), reglar (studs), bjälklag (floor), källare (basement).
  `.trim();
}
