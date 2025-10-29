/**
 * Voice Recording Store
 * EPIC 29: Voice Capture UI - Client State Management
 * 
 * Zustand store for voice recording state
 */

import { create } from 'zustand';

export type RecordingState =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

export interface VoiceSegment {
  startMs: number;
  endMs: number;
  text: string;
  conf: number;
}

export interface VoiceStoreState {
  // Recording state
  recordingState: RecordingState;
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // ms
  
  // Language
  selectedLanguage: string;
  detectedLanguage: string | null;
  
  // Live transcription
  liveCaption: string;
  segments: VoiceSegment[];
  
  // Processing
  sessionId: string | null;
  voiceLogId: string | null;
  originalText: string | null;
  translatedText: string | null;
  
  // Error handling
  error: string | null;
  
  // Actions
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setDuration: (duration: number) => void;
  setLanguage: (language: string) => void;
  setLiveCaption: (caption: string) => void;
  addSegment: (segment: VoiceSegment) => void;
  setSessionId: (sessionId: string) => void;
  setProcessingState: (state: RecordingState) => void;
  setTranscription: (original: string, translated: string, language: string) => void;
  setVoiceLogId: (id: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  recordingState: 'idle' as RecordingState,
  isRecording: false,
  isPaused: false,
  duration: 0,
  selectedLanguage: 'auto',
  detectedLanguage: null,
  liveCaption: '',
  segments: [],
  sessionId: null,
  voiceLogId: null,
  originalText: null,
  translatedText: null,
  error: null,
};

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  ...initialState,
  
  startRecording: () =>
    set({
      recordingState: 'recording',
      isRecording: true,
      isPaused: false,
      duration: 0,
      liveCaption: '',
      segments: [],
      error: null,
    }),
  
  pauseRecording: () =>
    set({
      recordingState: 'paused',
      isPaused: true,
    }),
  
  resumeRecording: () =>
    set({
      recordingState: 'recording',
      isPaused: false,
    }),
  
  stopRecording: () =>
    set({
      recordingState: 'uploading',
      isRecording: false,
      isPaused: false,
    }),
  
  setDuration: (duration) => set({ duration }),
  
  setLanguage: (language) => set({ selectedLanguage: language }),
  
  setLiveCaption: (caption) => set({ liveCaption: caption }),
  
  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
    })),
  
  setSessionId: (sessionId) => set({ sessionId }),
  
  setProcessingState: (state) => set({ recordingState: state }),
  
  setTranscription: (original, translated, language) =>
    set({
      originalText: original,
      translatedText: translated,
      detectedLanguage: language,
    }),
  
  setVoiceLogId: (id) => set({ voiceLogId: id }),
  
  setError: (error) =>
    set({
      error,
      recordingState: 'error',
      isRecording: false,
    }),
  
  reset: () => set(initialState),
}));
