/**
 * Voice-Related Diary Entry Database Functions
 * EPIC 30: Daybook Integration
 */

import { createClient } from '@/lib/supabase/server';
import { DiaryEntry, VoiceLog } from '@/types/voice-notes';

export async function getUserVoiceDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_source', 'voice')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to get voice diary entries: ${error.message}`);
  }
  
  return data;
}

export async function getDiaryEntryWithVoiceLog(entryId: string): Promise<{
  entry: DiaryEntry;
  voiceLog: VoiceLog | null;
} | null> {
  const supabase = await createClient();
  
  const { data: entry, error: entryError } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('id', entryId)
    .single();
  
  if (entryError) {
    if (entryError.code === 'PGRST116') return null;
    throw new Error(`Failed to get diary entry: ${entryError.message}`);
  }
  
  if (!entry.voice_log_id) {
    return { entry, voiceLog: null };
  }
  
  const { data: voiceLog, error: voiceError } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('id', entry.voice_log_id)
    .single();
  
  if (voiceError && voiceError.code !== 'PGRST116') {
    throw new Error(`Failed to get voice log: ${voiceError.message}`);
  }
  
  return { entry, voiceLog: voiceLog || null };
}
