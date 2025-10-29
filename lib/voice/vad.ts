/**
 * Voice Activity Detection (VAD)
 * EPIC 29: Voice Capture UI - Audio Analysis
 * 
 * Simple amplitude-based VAD using Web Audio API
 */

export interface VADConfig {
  threshold?: number; // Amplitude threshold (0-255)
  smoothing?: number; // Smoothing time constant (0-1)
  minSpeechDuration?: number; // Minimum speech duration in ms
  minSilenceDuration?: number; // Minimum silence duration in ms
}

export interface VADResult {
  isSpeaking: boolean;
  amplitude: number;
  timestamp: number;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private threshold: number;
  private smoothing: number;
  private minSpeechDuration: number;
  private minSilenceDuration: number;
  
  private isSpeaking = false;
  private lastStateChange = 0;
  private lastAmplitude = 0;
  
  constructor(audioContext: AudioContext, config: VADConfig = {}) {
    this.audioContext = audioContext;
    this.threshold = config.threshold ?? 30; // Default: 30/255
    this.smoothing = config.smoothing ?? 0.8;
    this.minSpeechDuration = config.minSpeechDuration ?? 300; // 300ms
    this.minSilenceDuration = config.minSilenceDuration ?? 500; // 500ms
    
    // Create analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = this.smoothing;
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }
  
  /**
   * Connect audio stream to VAD
   */
  connect(stream: MediaStream): void {
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
  }
  
  /**
   * Analyze current audio frame
   */
  analyze(): VADResult {
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    // Calculate average amplitude
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const normalized = Math.abs(this.dataArray[i] - 128); // Center around 0
      sum += normalized;
    }
    const amplitude = sum / this.dataArray.length;
    
    // Smooth amplitude
    this.lastAmplitude = this.lastAmplitude * 0.7 + amplitude * 0.3;
    
    const now = Date.now();
    const timeSinceLastChange = now - this.lastStateChange;
    
    // Detect state changes with hysteresis
    if (!this.isSpeaking && this.lastAmplitude > this.threshold) {
      if (timeSinceLastChange >= this.minSilenceDuration) {
        this.isSpeaking = true;
        this.lastStateChange = now;
      }
    } else if (this.isSpeaking && this.lastAmplitude < this.threshold * 0.7) {
      if (timeSinceLastChange >= this.minSpeechDuration) {
        this.isSpeaking = false;
        this.lastStateChange = now;
      }
    }
    
    return {
      isSpeaking: this.isSpeaking,
      amplitude: this.lastAmplitude,
      timestamp: now,
    };
  }
  
  /**
   * Get current amplitude (0-100)
   */
  getAmplitude(): number {
    return Math.min(100, (this.lastAmplitude / this.threshold) * 50);
  }
  
  /**
   * Check if currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }
  
  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.analyser.disconnect();
  }
}

/**
 * Create a simple amplitude visualizer
 */
export function createAmplitudeVisualizer(
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let animationId: number;
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteTimeDomainData(dataArray);
    
    ctx.fillStyle = 'rgb(20, 20, 30)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(100, 200, 255)';
    ctx.beginPath();
    
    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }
  
  draw();
  
  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationId);
  };
}
