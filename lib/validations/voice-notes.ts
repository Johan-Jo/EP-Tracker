/**
 * Voice Notes Validation Schemas
 * EPIC 27: Voice Notes Foundation
 */

import { z } from 'zod';

export const createVoiceLogSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  storage_path: z.string().min(1, 'Storage path is required'),
  original_language: z.string().min(1, 'Original language is required'),
  transcription: z.string().min(1, 'Transcription is required'),
  translation: z.string().nullable().optional(),
});

export const createVoiceSessionSchema = z.object({
  user_id: z.string().uuid(),
  language_hint: z.string().default('auto'),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']).default('uploading'),
});

export const updateVoiceSessionSchema = z.object({
  voice_log_id: z.string().uuid().optional(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']).optional(),
});

export const createVoiceDiaryEntrySchema = z.object({
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  entry_date: z.string(), // ISO date string
  work_performed: z.string().nullable().optional(),
  weather: z.string().nullable().optional(),
  temperature: z.number().nullable().optional(),
  obstacles: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  voice_log_id: z.string().uuid(),
  entry_source: z.literal('voice'),
});
