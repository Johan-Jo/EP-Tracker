/**
 * Voice Upload API Route
 * EPIC 28: Backend Services - Audio Upload
 * 
 * Handles audio file upload and creates session metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadVoiceRecordingServer } from '@/lib/storage/voice-storage';

export const runtime = 'nodejs'; // Required for FormData/file handling

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse FormData
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = (formData.get('language') as string) || 'auto';
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Must be audio.' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 25MB, Whisper limit)
    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }
    
    // Create session metadata
    const { data: session, error: sessionError } = await supabase
      .from('voice_sessions')
      .insert({
        user_id: user.id,
        language_hint: language,
        status: 'uploading',
      })
      .select()
      .single();
    
    if (sessionError || !session) {
      console.error('Failed to create session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // Convert File to Buffer for server-side upload
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    try {
      const storagePath = await uploadVoiceRecordingServer(
        user.id,
        buffer,
        audioFile.type,
        session.id
      );
      
      // Update session status
      await supabase
        .from('voice_sessions')
        .update({ status: 'processing' })
        .eq('id', session.id);
      
      return NextResponse.json({
        sessionId: session.id,
        storagePath,
        message: 'Audio uploaded successfully. Connect to SSE stream for processing.',
      });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Update session status to failed
      await supabase
        .from('voice_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id);
      
      return NextResponse.json(
        {
          error:
            uploadError instanceof Error
              ? uploadError.message
              : 'Upload failed',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Voice upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
