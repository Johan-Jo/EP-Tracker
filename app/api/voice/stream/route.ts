/**
 * Voice Processing SSE Stream API Route
 * EPIC 28: Backend Services - Real-time Processing Stream
 * 
 * Server-Sent Events endpoint for real-time voice processing updates
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { transcribeAudio, createConstructionPrompt } from '@/lib/voice/whisper';
import { translateText } from '@/lib/voice/translate';
import { createVoiceLog } from '@/lib/db/voice-logs';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  
  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        const supabase = await createClient();
        
        // Check authentication
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        
        if (authError || !user) {
          sendEvent(controller, encoder, 'error', { message: 'Unauthorized' });
          controller.close();
          return;
        }
        
        // Get session
        const { data: session, error: sessionError } = await supabase
          .from('voice_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', user.id)
          .single();
        
        if (sessionError || !session) {
          sendEvent(controller, encoder, 'error', { message: 'Session not found' });
          controller.close();
          return;
        }
        
        // Get user's organization
        const { data: membership } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', user.id)
          .single();
        
        if (!membership) {
          sendEvent(controller, encoder, 'error', { message: 'No organization found' });
          controller.close();
          return;
        }
        
        const orgId = membership.org_id;
        
        // Send start event
        sendEvent(controller, encoder, 'start', {
          sessionId,
          status: 'processing',
        });
        
        // Find audio file in storage (pattern: userId/sessionId_timestamp.ext)
        const { data: files } = await supabase.storage
          .from('voice-recordings')
          .list(user.id, {
            search: sessionId,
          });
        
        if (!files || files.length === 0) {
          sendEvent(controller, encoder, 'error', {
            message: 'Audio file not found in storage',
          });
          controller.close();
          return;
        }
        
        const audioFile = files[0];
        const storagePath = `${user.id}/${audioFile.name}`;
        
        // Download audio file
        sendEvent(controller, encoder, 'progress', {
          step: 'downloading',
          message: 'Downloading audio file...',
        });
        
        const { data: audioBlob, error: downloadError } = await supabase.storage
          .from('voice-recordings')
          .download(storagePath);
        
        if (downloadError || !audioBlob) {
          sendEvent(controller, encoder, 'error', {
            message: `Failed to download audio: ${downloadError?.message || 'Unknown error'}`,
          });
          controller.close();
          return;
        }
        
        const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
        
        // Step 1: Transcription
        sendEvent(controller, encoder, 'progress', {
          step: 'transcribing',
          message: 'Transcribing audio...',
        });
        
        const transcription = await transcribeAudio(
          audioBuffer,
          audioFile.name,
          {
            language: session.language_hint === 'auto' ? undefined : session.language_hint,
            prompt: createConstructionPrompt(),
          }
        );
        
        // Convert Whisper language to ISO 639-1 code
        const languageMap: Record<string, string> = {
          'english': 'en',
          'swedish': 'sv',
          'polish': 'pl',
          'german': 'de',
          'spanish': 'es',
          'french': 'fr',
          'italian': 'it',
          'portuguese': 'pt',
          'russian': 'ru',
          'arabic': 'ar',
          'chinese': 'zh',
        };
        const isoLang = languageMap[transcription.language.toLowerCase()] || transcription.language.substring(0, 2);
        
        sendEvent(controller, encoder, 'transcription', {
          text: transcription.text,
          language: isoLang,
          segments: transcription.segments,
        });
        
        // Step 2: Translation (if not Swedish)
        let translatedText = transcription.text;
        let translationConfidence = 1.0;
        
        if (isoLang !== 'sv') {
          sendEvent(controller, encoder, 'progress', {
            step: 'translating',
            message: 'Translating to Swedish...',
          });
          
          const translation = await translateText(transcription.text, {
            sourceLanguage: isoLang,
            targetLanguage: 'sv',
          });
          
          translatedText = translation.translatedText;
          translationConfidence = translation.confidence;
          
          sendEvent(controller, encoder, 'translation', {
            text: translatedText,
            confidence: translationConfidence,
          });
        }
        
        // Step 3: Save to database
        sendEvent(controller, encoder, 'progress', {
          step: 'saving',
          message: 'Saving voice log...',
        });
        
        // Save voice log using EPIC-27 schema
        const { data: voiceLog, error: voiceLogError } = await supabase
          .from('voice_logs')
          .insert({
            organization_id: orgId,
            user_id: user.id,
            audio_url: storagePath,
            original_lang: isoLang,
            detected_lang: isoLang,
            original_text: transcription.text,
            translated_sv: translatedText,
            asr_provider: 'whisper-1',
            translation_provider: 'gpt-4o',
            segments: transcription.segments,
          })
          .select()
          .single();
        
        if (voiceLogError || !voiceLog) {
          throw new Error(`Failed to save voice log: ${voiceLogError?.message || 'Unknown error'}`);
        }
        
        // Update session
        await supabase
          .from('voice_sessions')
          .update({
            voice_log_id: voiceLog.id,
            status: 'completed',
          })
          .eq('id', sessionId);
        
        // Send completion
        sendEvent(controller, encoder, 'complete', {
          voiceLogId: voiceLog.id,
          originalText: transcription.text,
          translatedText,
          language: isoLang,
          confidence: translationConfidence,
        });
        
        controller.close();
      } catch (error) {
        console.error('SSE stream error:', error);
        sendEvent(controller, encoder, 'error', {
          message: error instanceof Error ? error.message : 'Processing failed',
        });
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}
