'use client';

/**
 * Voice Recorder Component
 * EPIC 29: Voice Capture UI
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Pause, Play, Loader2 } from 'lucide-react';
import { VoiceActivityDetector } from '@/lib/voice/vad';
import { useVoiceStore } from '@/lib/stores/voice-store';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
  onComplete?: (voiceLogId: string, translatedText: string) => void;
  onError?: (error: string) => void;
}

export function VoiceRecorder({ onComplete, onError }: VoiceRecorderProps) {
  const {
    recordingState,
    isRecording,
    isPaused,
    duration,
    selectedLanguage,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setDuration,
    setError,
    reset,
  } = useVoiceStore();
  
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [vad, setVad] = useState<VoiceActivityDetector | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (vad) {
        vad.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on unmount
  
  // Handle recording start
  const handleStart = async () => {
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      // Check MediaRecorder support
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType });
      
      // Create VAD
      const audioContext = new AudioContext();
      const vadInstance = new VoiceActivityDetector(audioContext);
      vadInstance.connect(stream);
      setVad(vadInstance);
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        vadInstance.disconnect();
        
        if (chunks.length === 0) {
          setError('No audio data recorded');
          onError?.('No audio data recorded');
          return;
        }
        
        const audioBlob = new Blob(chunks, { type: mimeType });
        
        if (audioBlob.size === 0) {
          setError('Recording is empty');
          onError?.('Recording is empty');
          return;
        }
        
        await handleUpload(audioBlob);
      };
      
      recorder.start(100); // Collect data every 100ms
      
      setMediaRecorder(recorder);
      setAudioChunks([]);
      startRecording();
      
      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);
      }, 100);
      
      // Start VAD monitoring for audio level visualization
      vadIntervalRef.current = setInterval(() => {
        vadInstance.analyze();
        setAudioLevel(vadInstance.getAmplitude());
      }, 50); // Update 20 times per second
    } catch (err) {
      console.error('Recording start error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Microphone access denied';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };
  
  // Handle pause
  const handlePause = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      pauseRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      setAudioLevel(0);
    }
  };
  
  // Handle resume
  const handleResume = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      resumeRecording();
      
      startTimeRef.current = Date.now() - duration;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setDuration(elapsed);
      }, 100);
      
      // Resume VAD monitoring
      if (vad) {
        vadIntervalRef.current = setInterval(() => {
          vad.analyze();
          setAudioLevel(vad.getAmplitude());
        }, 50);
      }
    }
  };
  
  // Handle stop
  const handleStop = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      setAudioLevel(0);
    }
  };
  
  // Handle upload and streaming
  const handleUpload = async (audioBlob: Blob) => {
    try {
      // Step 1: Upload audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', selectedLanguage);
      
      const uploadResponse = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const { sessionId } = await uploadResponse.json();
      
      // Step 2: Connect to SSE stream for processing
      const eventSource = new EventSource(`/api/voice/stream?sessionId=${sessionId}`);
      
      eventSource.addEventListener('start', (e) => {
        const data = JSON.parse(e.data);
        console.log('Processing started:', data);
      });
      
      eventSource.addEventListener('progress', (e) => {
        const data = JSON.parse(e.data);
        toast.loading(data.message, { id: 'voice-progress' });
      });
      
      eventSource.addEventListener('transcription', (e) => {
        const data = JSON.parse(e.data);
        console.log('Transcription:', data);
      });
      
      eventSource.addEventListener('translation', (e) => {
        const data = JSON.parse(e.data);
        console.log('Translation:', data);
      });
      
      eventSource.addEventListener('complete', (e) => {
        const data = JSON.parse(e.data);
        toast.success('Röstanteckning klar!', { id: 'voice-progress' });
        eventSource.close();
        onComplete?.(data.voiceLogId, data.translatedText);
      });
      
      eventSource.addEventListener('error', (e) => {
        const data = JSON.parse(e.data);
        toast.error(data.message, { id: 'voice-progress' });
        setError(data.message);
        onError?.(data.message);
        eventSource.close();
      });
      
      eventSource.onerror = () => {
        toast.error('Connection lost', { id: 'voice-progress' });
        eventSource.close();
      };
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };
  
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Control Buttons */}
      <div className="flex gap-4">
        {!isRecording && !isPaused && (
          <Button
            onClick={handleStart}
            size="lg"
            className="h-20 w-20 rounded-full"
          >
            <Mic className="h-8 w-8" />
          </Button>
        )}
        
        {isRecording && !isPaused && (
          <Button
            onClick={handleStop}
            size="lg"
            variant="destructive"
            className="h-20 w-20 rounded-full"
          >
            <Square className="h-8 w-8" />
          </Button>
        )}
        
        {isPaused && (
          <>
            <Button
              onClick={handleResume}
              size="lg"
              className="h-20 w-20 rounded-full"
            >
              <Play className="h-8 w-8" />
            </Button>
            <Button
              onClick={handleStop}
              size="lg"
              variant="destructive"
              className="h-20 w-20 rounded-full"
            >
              <Square className="h-8 w-8" />
            </Button>
          </>
        )}
        
        {(recordingState === 'uploading' || recordingState === 'processing') && (
          <Button
            size="lg"
            disabled
            className="h-20 w-20 rounded-full"
          >
            <Loader2 className="h-6 w-6 animate-spin" />
          </Button>
        )}
      </div>
      
      {/* Duration Display */}
      {(isRecording || isPaused) && (
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">
            {formatDuration(duration)}
          </div>
          {isRecording && (
            <div className="text-xs text-muted-foreground mt-1">
              Recording...
            </div>
          )}
        </div>
      )}
      
      {/* Audio Level Indicator */}
      {isRecording && (
        <div className="space-y-2 w-full max-w-xs">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100 ease-out"
                style={{ width: `${Math.min(100, audioLevel)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(audioLevel)}%
            </span>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${audioLevel > 10 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {audioLevel > 10 ? 'Audio detected' : 'Speak now'}
            </div>
          </div>
        </div>
      )}
      
      {/* Status Messages */}
      {recordingState === 'uploading' && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading audio...
        </div>
      )}
      
      {recordingState === 'processing' && (
        <div className="text-center text-sm text-muted-foreground">
          Processing...
        </div>
      )}
      
      {recordingState === 'error' && (
        <div className="text-center text-sm text-destructive">
          Error occurred
        </div>
      )}
    </div>
  );
}
