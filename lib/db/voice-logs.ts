/**
 * Voice Logs Database Functions
 * EPIC 27: Voice Notes Foundation
 */

import { createClient } from '@/lib/supabase/server';
import { createVoiceLogSchema, createVoiceSessionSchema, updateVoiceSessionSchema } from '@/lib/validations/voice-notes';
import { VoiceLog, VoiceSession } from '@/types/voice-notes';
import { z } from 'zod';

// Voice Logs

export async function createVoiceLog(data: z.infer<typeof createVoiceLogSchema>): Promise<VoiceLog> {
  const supabase = await createClient();
  
  const { data: newVoiceLog, error } = await supabase
    .from('voice_logs')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create voice log: ${error.message}`);
  }
  
  return newVoiceLog;
}

export async function getVoiceLogById(id: string): Promise<VoiceLog | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get voice log: ${error.message}`);
  }
  
  return data;
}

export async function updateVoiceLog(
  id: string,
  updates: Partial<Omit<VoiceLog, 'id' | 'created_at' | 'updated_at'>>
): Promise<VoiceLog> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update voice log: ${error.message}`);
  }
  
  return data;
}

export async function deleteVoiceLog(id: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('voice_logs')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(`Failed to delete voice log: ${error.message}`);
  }
}

// Voice Sessions

export async function createVoiceSession(data: z.infer<typeof createVoiceSessionSchema>): Promise<VoiceSession> {
  const supabase = await createClient();
  
  const { data: newSession, error } = await supabase
    .from('voice_sessions')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create voice session: ${error.message}`);
  }
  
  return newSession;
}

export async function getVoiceSessionById(id: string): Promise<VoiceSession | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get voice session: ${error.message}`);
  }
  
  return data;
}

export async function updateVoiceSession(
  id: string,
  updates: z.infer<typeof updateVoiceSessionSchema>
): Promise<VoiceSession> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('voice_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to update voice session: ${error.message}`);
  }
  
  return data;
}

export async function deleteVoiceSession(id: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('voice_sessions')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(`Failed to delete voice session: ${error.message}`);
  }
}
