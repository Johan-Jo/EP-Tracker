/**
 * Voice Storage Helpers
 * EPIC 27: Voice Notes Foundation
 * 
 * Supabase Storage utilities for voice recordings
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'voice-recordings';

/**
 * Upload voice recording to Supabase Storage
 * @param userId - User ID for folder path
 * @param file - Audio file blob
 * @param sessionId - Session ID for unique filename
 * @returns Storage path
 */
export async function uploadVoiceRecording(
  userId: string,
  file: Blob,
  sessionId: string
): Promise<string> {
  const supabase = createBrowserClient();
  
  const timestamp = Date.now();
  const extension = getFileExtension(file.type);
  const filePath = `${userId}/${sessionId}_${timestamp}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Failed to upload voice recording: ${error.message}`);
  }
  
  return data.path;
}

/**
 * Get public URL for voice recording
 * @param path - Storage path
 * @returns Public URL
 */
export async function getVoiceRecordingUrl(path: string): Promise<string> {
  const supabase = createBrowserClient();
  
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Download voice recording
 * @param path - Storage path
 * @returns File blob
 */
export async function downloadVoiceRecording(path: string): Promise<Blob> {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);
  
  if (error) {
    throw new Error(`Failed to download voice recording: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete voice recording
 * @param path - Storage path
 */
export async function deleteVoiceRecording(path: string): Promise<void> {
  const supabase = createBrowserClient();
  
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete voice recording: ${error.message}`);
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  
  return map[mimeType] || 'webm';
}

/**
 * Server-side upload from API route
 */
export async function uploadVoiceRecordingServer(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  sessionId: string
): Promise<string> {
  const supabase = await createServerClient();
  
  const timestamp = Date.now();
  const extension = getFileExtension(mimeType);
  const filePath = `${userId}/${sessionId}_${timestamp}.${extension}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Failed to upload voice recording: ${error.message}`);
  }
  
  return data.path;
}
