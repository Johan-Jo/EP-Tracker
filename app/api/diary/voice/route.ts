/**
 * Diary Voice API Route
 * EPIC 30: Daybook Integration - Voice Diary Entries
 * 
 * Handles creation and retrieval of voice-generated diary entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserVoiceDiaryEntries,
  getProjectVoiceDiaryEntries,
  getDiaryEntryWithVoiceLog,
} from '@/lib/db/diary-entries-voice';

export const runtime = 'nodejs';

/**
 * GET: Retrieve voice diary entries
 * Query params:
 * - userId: Get entries for specific user
 * - projectId: Get entries for specific project
 * - entryId: Get single entry with voice log
 */
export async function GET(req: NextRequest) {
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
    
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const entryId = searchParams.get('entryId');
    
    // Get single entry with voice log
    if (entryId) {
      const result = await getDiaryEntryWithVoiceLog(entryId);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Entry not found' },
          { status: 404 }
        );
      }
      
      // Verify access
      if (result.entry.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      return NextResponse.json(result);
    }
    
    // Get entries by project
    if (projectId) {
      const entries = await getProjectVoiceDiaryEntries(projectId);
      return NextResponse.json({ entries });
    }
    
    // Get entries by user (default to current user)
    const targetUserId = userId || user.id;
    const entries = await getUserVoiceDiaryEntries(targetUserId);
    
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get voice diary entries error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a diary entry from voice log
 */
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
    
    const body = await req.json();
    const { voiceLogId, projectId, date, additionalNotes } = body;
    
    if (!voiceLogId || !projectId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: voiceLogId, projectId, date' },
        { status: 400 }
      );
    }
    
    // Get voice log to extract translated text
    const { data: voiceLog, error: voiceLogError } = await supabase
      .from('voice_logs')
      .select('*')
      .eq('id', voiceLogId)
      .eq('user_id', user.id)
      .single();
    
    if (voiceLogError || !voiceLog) {
      return NextResponse.json(
        { error: 'Voice log not found' },
        { status: 404 }
      );
    }
    
    // Combine translated text with additional notes
    const workPerformed = additionalNotes
      ? `${voiceLog.translated_sv}\n\n${additionalNotes}`
      : voiceLog.translated_sv;
    
    // Create diary entry using RPC
    const { data: diaryEntryId, error: insertError } = await supabase.rpc(
      'insert_diary_entry',
      {
        p_org_id: voiceLog.organization_id,
        p_project_id: projectId,
        p_date: date,
        p_work_performed: workPerformed,
        p_created_by: user.id,
      }
    );
    
    if (insertError) {
      console.error('Failed to create diary entry:', insertError);
      return NextResponse.json(
        { error: 'Failed to create diary entry' },
        { status: 500 }
      );
    }
    
    // Update with voice metadata
    const { data: entry, error: updateError } = await supabase
      .from('diary_entries')
      .update({
        voice_log_id: voiceLogId,
        entry_source: 'voice',
      })
      .eq('id', diaryEntryId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Failed to update diary entry metadata:', updateError);
    }
    
    return NextResponse.json({
      success: true,
      diaryEntryId,
      entry,
    });
  } catch (error) {
    console.error('Create voice diary entry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


