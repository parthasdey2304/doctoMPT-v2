'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { TranscriptItem, DoctorVisualState } from '@/types/consultation';
import {
  DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  DEFAULT_DOCTOR_VOICE,
  VoiceName,
  ConsultationLanguage,
  DEFAULT_CONSULTATION_LANGUAGE,
  getGreetingPrompt,
  getSimulatedGreeting,
} from '@/lib/constants';
import { formatErrorMessage } from '@/lib/error-utils';

interface UseGeminiLiveOptions {
  customSystemInstruction?: string;
  voiceName?: VoiceName;
  customApiKey?: string;
  audioDeviceId?: string;
  consultationLanguage?: ConsultationLanguage;
}

export function useGeminiLive({
  customSystemInstruction = DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  voiceName = DEFAULT_DOCTOR_VOICE,
  customApiKey = '',
  audioDeviceId = '',
  consultationLanguage = DEFAULT_CONSULTATION_LANGUAGE,
}: UseGeminiLiveOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('Click "Start Consultation" to begin');
  const [visualState, setVisualState] = useState<DoctorVisualState>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');

  // Audio Context and Streams refs
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Speech recognition ref
  const recognitionRef = useRef<any>(null);

  // Playback queue & scheduled nodes refs
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isDoctorSpeakingRef = useRef<boolean>(false);
  const nextPlayTimeRef = useRef<number>(0);
  const speakerRmsIntervalRef = useRef<any>(null);

  // Buffer for incoming doctor speech transcription
  const currentDoctorTurnRef = useRef<string>('');
  const currentUserTurnRef = useRef<string>('');

  // Clean up all audio nodes and audio streams
  const stopAudio = useCallback(() => {
    // Stop all playing audio sources
    activeSourcesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Ignore already stopped
      }
    });
    activeSourcesRef.current = [];

    // Stop mic stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop worklet node
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Close AudioContexts
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micAudioContextRef.current && micAudioContextRef.current.state !== 'closed') {
      micAudioContextRef.current.close().catch(() => {});
      micAudioContextRef.current = null;
    }

    if (speakerRmsIntervalRef.current) {
      clearInterval(speakerRmsIntervalRef.current);
      speakerRmsIntervalRef.current = null;
    }

    setMicLevel(0);
    setSpeakerLevel(0);
  }, []);

  // Handle interruption (Barge-in)
  const handleInterruption = useCallback(() => {
    console.log('[Gemini Live] Interruption signal received. Halting audio playback.');
    activeSourcesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    isDoctorSpeakingRef.current = false;
    if (micStreamRef.current && !isMutedRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
    setSpeakerLevel(0);
    setVisualState((prev) => (prev === 'speaking' ? 'listening' : prev));
  }, []);

  // Playback raw 24kHz 16-bit PCM chunk
  const playPcmChunk = useCallback((base64Data: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const sampleCount = Math.floor(len / 2);
      if (sampleCount === 0) return;

      const float32Array = new Float32Array(sampleCount);
      let sumSquares = 0;

      for (let i = 0; i < sampleCount; i++) {
        const low = bytes[i * 2];
        const high = bytes[i * 2 + 1];
        let val = (high << 8) | low;
        if (val >= 0x8000) val -= 0x10000;
        const norm = val / 32768.0;
        float32Array[i] = norm;
        sumSquares += norm * norm;
      }

      // Calculate output RMS
      const rms = Math.min(1, Math.sqrt(sumSquares / sampleCount) * 2.8);
      setSpeakerLevel(rms);
      setVisualState('speaking');

      // Create AudioBuffer at 24000 Hz
      const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);

      // Mute hardware mic and pause speech recognition while doctor speaks to completely eliminate speaker bleed
      if (!isDoctorSpeakingRef.current) {
        isDoctorSpeakingRef.current = true;
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {}
        }
      }

      source.onended = () => {
        const index = activeSourcesRef.current.indexOf(source);
        if (index > -1) {
          activeSourcesRef.current.splice(index, 1);
        }
        if (activeSourcesRef.current.length === 0) {
          setSpeakerLevel(0);
          // 300ms acoustic room reverb protection before un-muting mic
          setTimeout(() => {
            if (activeSourcesRef.current.length === 0) {
              isDoctorSpeakingRef.current = false;
              setVisualState((prev) => (prev === 'speaking' ? 'listening' : prev));
              setStatusText('Dr. DoctoMPT is listening...');

              // Unmute mic hardware track
              if (micStreamRef.current && !isMutedRef.current) {
                micStreamRef.current.getAudioTracks().forEach((track) => {
                  track.enabled = true;
                });
              }

              // Restart speech recognition cleanly
              if (recognitionRef.current && !isMutedRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {}
              }
            }
          }, 300);
        }
      };
    } catch (err) {
      console.error('[Gemini Live] Error decoding PCM playback:', err);
    }
  }, []);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setStatusText('Connecting to Dr. DoctoMPT...');
      setVisualState('idle');

      // 1. Fetch Ephemeral Token
      const headers: Record<string, string> = {};
      if (customApiKey.trim()) {
        headers['x-gemini-api-key'] = customApiKey.trim();
      }

      const res = await fetch('/api/live-token', {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to authenticate with live server');
      }

      const { token } = await res.json();
      if (!token) throw new Error('No token returned from server');

      // 2. Initialize AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      nextPlayTimeRef.current = audioCtx.currentTime;

      // 3. Initialize GoogleGenAI with ephemeral token
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' },
      });

      // 4. Connect to Live Session
      const session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || DEFAULT_DOCTOR_VOICE,
              },
            },
          },
          systemInstruction: {
            parts: [{ text: customSystemInstruction }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('[Gemini Live] WebSocket opened');
            setIsConnected(true);
            setIsConnecting(false);
            setStatusText('Connecting to Dr. DoctoMPT...');
            setVisualState('listening');
          },
          onmessage: (msg: any) => {
            const content = msg.serverContent;
            if (!content) return;

            // Interruption handling (barge-in)
            if (content.interrupted) {
              handleInterruption();
              if (currentDoctorTurnRef.current.trim()) {
                const interruptedText = currentDoctorTurnRef.current.trim() + ' ... [interrupted]';
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `turn_${Date.now()}_doctor_interrupted`,
                    role: 'doctor',
                    text: interruptedText,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ]);
                currentDoctorTurnRef.current = '';
              }
            }

            // Audio output chunks
            if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  playPcmChunk(part.inlineData.data);
                }
              }
            }

            // Spoken output transcription (Doctor)
            if (content.outputTranscription?.text) {
              currentDoctorTurnRef.current += content.outputTranscription.text;
            } else if (content.modelTurn?.parts) {
              for (const part of content.modelTurn.parts) {
                if (part.text) {
                  currentDoctorTurnRef.current += part.text;
                }
              }
            }

            // Spoken input transcription (Patient)
            if (content.inputTranscription?.text) {
              const text = content.inputTranscription.text;
              currentUserTurnRef.current += text;
            }

            // Turn completion — commit transcript
            if (content.turnComplete || content.generationComplete) {
              if (currentUserTurnRef.current.trim()) {
                const userTurnText = currentUserTurnRef.current.trim();
                setTranscript((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'patient' && last.text.toLowerCase() === userTurnText.toLowerCase()) {
                    return prev;
                  }
                  return [
                    ...prev,
                    {
                      id: `turn_${Date.now()}_patient`,
                      role: 'patient',
                      text: userTurnText,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    },
                  ];
                });
                currentUserTurnRef.current = '';
              }

              if (currentDoctorTurnRef.current.trim()) {
                const docTurnText = currentDoctorTurnRef.current.trim();
                setTranscript((prev) => [
                  ...prev,
                  {
                    id: `turn_${Date.now()}_doctor`,
                    role: 'doctor',
                    text: docTurnText,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ]);
                currentDoctorTurnRef.current = '';
              }
            }
          },
          onerror: (err: any) => {
            console.warn('[Gemini Live] Socket notice:', err);
            setStatusText('Connection notice encountered.');
          },
          onclose: () => {
            console.log('[Gemini Live] WebSocket closed');
            setIsConnected(false);
            setIsConnecting(false);
            setStatusText('Consultation ended.');
            setVisualState('idle');
            stopAudio();
          },
        },
      });

      sessionRef.current = session;

      // 5. Send immediate opening turn prompt so Dr. DoctoMPT introduces himself and speaks first
      try {
        const greetingPromptText = getGreetingPrompt(consultationLanguage);
        session.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [
                {
                  text: greetingPromptText,
                },
              ],
            },
          ],
          turnComplete: true,
        });
        setVisualState('speaking');
        setStatusText('Dr. DoctoMPT is speaking...');
      } catch (introErr) {
        console.warn('[Gemini Live] Error sending intro greeting prompt:', introErr);
      }

      // 6. Setup Microphone & AudioWorklet for 16kHz PCM streaming
      try {
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        };
        if (audioDeviceId) {
          audioConstraints.deviceId = { exact: audioDeviceId };
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        micStreamRef.current = stream;

        // Create mic capture audio context
        const micCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        micAudioContextRef.current = micCtx;
        const sourceNode = micCtx.createMediaStreamSource(stream);

        // Inline AudioWorklet code to downsample to 16kHz and buffer 100ms PCM chunks (1600 samples)
        const workletCode = `
          class PcmDownsamplerProcessor extends AudioWorkletProcessor {
            constructor() {
              super();
              this.inputSampleRate = sampleRate;
              this.targetSampleRate = 16000;
              this.chunkSize = 1600; // 100ms at 16kHz
              this.buffer = new Float32Array(this.chunkSize);
              this.bufferIndex = 0;
            }

            process(inputs) {
              const input = inputs[0];
              if (!input || !input[0]) return true;
              const inputChannel = input[0];

              const ratio = this.inputSampleRate / this.targetSampleRate;
              const newLength = Math.floor(inputChannel.length / ratio);

              for (let i = 0; i < newLength; i++) {
                const origIndex = Math.floor(i * ratio);
                this.buffer[this.bufferIndex++] = inputChannel[origIndex];

                if (this.bufferIndex >= this.chunkSize) {
                  this.port.postMessage(this.buffer.slice(0, this.chunkSize));
                  this.bufferIndex = 0;
                }
              }

              return true;
            }
          }
          registerProcessor('pcm-downsampler-processor', PcmDownsamplerProcessor);
        `;

        const workletBlob = new Blob([workletCode], {
          type: 'application/javascript',
        });
        const workletUrl = URL.createObjectURL(workletBlob);

        await micCtx.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const workletNode = new AudioWorkletNode(
          micCtx,
          'pcm-downsampler-processor'
        );
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e) => {
          // Gating: If muted, doctor is speaking, or session closed, do not send audio to avoid acoustic echo loops
          if (isMutedRef.current || isDoctorSpeakingRef.current || !sessionRef.current) return;
          const floatSamples: Float32Array = e.data;
          if (!floatSamples || floatSamples.length === 0) return;

          // Convert Float32 to 16-bit signed PCM little-endian
          const numSamples = floatSamples.length;
          const pcmBuffer = new Int16Array(numSamples);
          let sumSq = 0;

          for (let i = 0; i < numSamples; i++) {
            const s = Math.max(-1, Math.min(1, floatSamples[i]));
            pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            sumSq += s * s;
          }

          // Calculate Mic RMS
          const currentRms = Math.min(1, Math.sqrt(sumSq / numSamples) * 3);
          setMicLevel(currentRms);

          // Convert Int16Array to base64
          const uint8 = new Uint8Array(pcmBuffer.buffer);
          let binary = '';
          const len = uint8.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64Pcm = btoa(binary);

          // Send to Gemini Live Session with both media and audio keys
          try {
            sessionRef.current.sendRealtimeInput({
              media: {
                data: base64Pcm,
                mimeType: 'audio/pcm;rate=16000',
              },
              audio: {
                data: base64Pcm,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } catch (err) {
            // Socket might be closing
          }
        };

        sourceNode.connect(workletNode);

        // 6. Speech-to-Text Recognition for instant transcription & response guarantee
        if (typeof window !== 'undefined') {
          const SpeechRec =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

          if (SpeechRec) {
            try {
              const recognition = new SpeechRec();
              recognition.continuous = true;
              recognition.interimResults = true;
              recognition.lang =
                consultationLanguage === 'hinglish'
                  ? 'hi-IN'
                  : consultationLanguage === 'benglish'
                  ? 'bn-IN'
                  : 'en-US';

              recognition.onresult = (event: any) => {
                // Ignore speech recognition while doctor is speaking to prevent speaker echo feedback
                if (isMutedRef.current || isDoctorSpeakingRef.current) return;
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                  const res = event.results[i];
                  const spokenText = res[0].transcript.trim();

                  if (res.isFinal && spokenText) {
                    console.log('[Voice Recognition] Patient said:', spokenText);

                    // Check for patient name and age in speech
                    const nameMatch = spokenText.match(
                      /(?:my name is|i am|i'm|name:?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i
                    );
                    if (
                      nameMatch &&
                      nameMatch[1] &&
                      !nameMatch[1].toLowerCase().includes('doctor')
                    ) {
                      setPatientName(nameMatch[1].trim());
                    }

                    const ageMatch = spokenText.match(/(\d{1,2})\s*(?:years|yrs|year old|yo)/i);
                    if (ageMatch && ageMatch[1]) {
                      setPatientAge(ageMatch[1]);
                    }

                    // Add patient turn to transcript cleanly
                    setTranscript((prev) => [
                      ...prev,
                      {
                        id: `turn_${Date.now()}_patient_voice`,
                        role: 'patient',
                        text: spokenText,
                        timestamp: new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      },
                    ]);
                    setStatusText('Doctor listening...');
                  } else if (!res.isFinal && spokenText) {
                    // Show live interim words as the user speaks
                    setStatusText(`Hearing: "${spokenText}"`);
                  }
                }
              };

              recognition.onerror = (e: any) => {
                console.warn('[Voice Recognition] Notice:', e?.error);
              };

              recognition.onend = () => {
                // Auto-restart if session is still alive
                if (recognitionRef.current && sessionRef.current) {
                  try {
                    recognition.start();
                  } catch (e) {}
                }
              };

              recognition.start();
              recognitionRef.current = recognition;
            } catch (recErr) {
              console.warn('[Voice Recognition] Could not start speech recognition:', recErr);
            }
          }
        }
      } catch (micErr: any) {
        console.warn(
          '[Gemini Live] Microphone access could not be acquired:',
          micErr
        );
        setStatusText('Microphone unavailable. You can use the text input below.');
      }
    } catch (error: any) {
      console.warn('[Gemini Live] Connection notice:', error);
      setIsConnected(false);
      setIsConnecting(false);
      const cleanMsg = formatErrorMessage(error);
      setStatusText(cleanMsg || 'Failed to start consultation.');
      setVisualState('idle');
      stopAudio();
    }
  }, [
    audioDeviceId,
    consultationLanguage,
    customApiKey,
    customSystemInstruction,
    handleInterruption,
    playPcmChunk,
    stopAudio,
    voiceName,
  ]);

  // Disconnect session
  const disconnect = useCallback(() => {
    setStatusText('Ending consultation...');
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore
      }
      sessionRef.current = null;
    }
    stopAudio();
    setIsConnected(false);
    setIsConnecting(false);
    setVisualState('idle');
    setStatusText('Consultation ended.');
  }, [stopAudio]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      // Toggle physical mic tracks immediately
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      if (recognitionRef.current) {
        try {
          if (next) {
            recognitionRef.current.abort();
          } else {
            recognitionRef.current.start();
          }
        } catch (e) {}
      }
      if (next && sessionRef.current) {
        try {
          sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
        } catch (e) {}
      }
      return next;
    });
  }, []);

  // Speak text using browser speech synthesis with animated doctor mouth movements
  const speakDoctorText = useCallback((text: string, onComplete?: () => void) => {
    if (typeof window === 'undefined') return;

    // Add to transcript
    setTranscript((prev) => [
      ...prev,
      {
        id: `sim_doc_${Date.now()}`,
        role: 'doctor',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    if (!window.speechSynthesis) {
      setStatusText('Dr. DoctoMPT replied.');
      setVisualState('listening');
      if (onComplete) onComplete();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Doctor') || v.name.includes('David') || v.name.includes('Male')));
    if (englishVoice) utterance.voice = englishVoice;

    setVisualState('speaking');
    setStatusText('Dr. DoctoMPT is speaking...');

    // Oscillate speakerLevel to drive SVG mouth opening/closing
    let simInterval: any = null;
    let tick = 0;
    simInterval = setInterval(() => {
      tick++;
      const osc = Math.abs(Math.sin(tick * 0.4)) * 0.7 + 0.2;
      setSpeakerLevel(osc);
    }, 80);

    utterance.onend = () => {
      clearInterval(simInterval);
      setSpeakerLevel(0);
      setVisualState('listening');
      setStatusText('Dr. DoctoMPT is listening to you...');
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      clearInterval(simInterval);
      setSpeakerLevel(0);
      setVisualState('listening');
      setStatusText('Doctor is listening.');
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Send manual text fallback (for noisy venue / mic unavailable)
  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      const userText = text.trim();

      // Extract patient name and age from text if provided
      const nameMatch = userText.match(
        /(?:my name is|i am|i'm|name:?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i
      );
      if (
        nameMatch &&
        nameMatch[1] &&
        !nameMatch[1].toLowerCase().includes('doctor')
      ) {
        setPatientName(nameMatch[1].trim());
      }

      const ageMatch = userText.match(/(\d{1,2})\s*(?:years|yrs|year old|yo)/i);
      if (ageMatch && ageMatch[1]) {
        setPatientAge(ageMatch[1]);
      }

      const newTurn: TranscriptItem = {
        id: `turn_${Date.now()}_patient_manual`,
        role: 'patient',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setTranscript((prev) => [...prev, newTurn]);

      if (sessionRef.current && isConnected) {
        try {
          sessionRef.current.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: userText }],
              },
            ],
            turnComplete: true,
          });
          setVisualState('speaking');
        } catch (e) {
          console.warn('[Gemini Live] Error sending text fallback:', e);
        }
      } else {
        // Simulated Doctor response when Live WebSocket is not connected or quota is depleted
        const lower = userText.toLowerCase();
        let reply = '';

        if (consultationLanguage === 'hinglish') {
          if (
            lower.includes('my name is') ||
            lower.includes("i'm") ||
            lower.includes('naam') ||
            lower.includes('alex') ||
            lower.includes('sarah') ||
            lower.includes('david') ||
            /\d{1,2}\s*(years|yrs|saal)/.test(lower)
          ) {
            reply = `Dhanyawaad. Aapse milkar accha laga. Kripya apne symptoms ke baare mein batayein, yeh dikkat kitne din se hai, aur fever ya pain ka level kaisa hai?`;
          } else if (
            lower.includes('fever') ||
            lower.includes('throat') ||
            lower.includes('headache') ||
            lower.includes('cough') ||
            lower.includes('pain') ||
            lower.includes('migraine') ||
            lower.includes('dard') ||
            lower.includes('bimar')
          ) {
            reply = `Maine aapke symptoms ko carefully evaluate kiya hai. Main fever aur pain ke liye Dolo 650, adequate rest, aur proper hydration recommend karta hoon. Kya aapko koi aur symptoms ya health issues hain jinke baare mein aap discuss karna chahte hain?`;
          } else if (
            lower.includes('no') ||
            lower.includes('nahi') ||
            lower.includes('nothing') ||
            lower.includes('nope') ||
            lower.includes('that is all') ||
            lower.includes("that's all") ||
            lower.includes('aur kuch nahi')
          ) {
            reply = `Samajh gaya. Kya aap chahte hain ki main aapka medical prescription abhi prepare kar doon?`;
          } else if (
            lower.includes('yes') ||
            lower.includes('haan') ||
            lower.includes('haanji') ||
            lower.includes('ji') ||
            lower.includes('please') ||
            lower.includes('sure') ||
            lower.includes('ok') ||
            lower.includes('theek') ||
            lower.includes('bana') ||
            lower.includes('download')
          ) {
            reply = `Ji bilkul! Main aapka official medical prescription prepare aur download kar raha hoon.`;
          } else {
            reply = `Samajh gaya. Maine isse aapki medical consultation file mein note kar liya hai. Kya aapko koi aur symptoms ya health issues hain jinke baare mein aap discuss karna chahte hain?`;
          }
        } else if (consultationLanguage === 'benglish') {
          if (
            lower.includes('my name is') ||
            lower.includes("i'm") ||
            lower.includes('naam') ||
            lower.includes('alex') ||
            lower.includes('sarah') ||
            lower.includes('david') ||
            /\d{1,2}\s*(years|yrs|bochhor)/.test(lower)
          ) {
            reply = `Dhonyobad. Apnar shonge kotha bole bhalo laglo. Apnar main symptoms ki ki, koto din dhore hocche, aar fever ba pain kemon ache ektu bolun?`;
          } else if (
            lower.includes('fever') ||
            lower.includes('throat') ||
            lower.includes('headache') ||
            lower.includes('cough') ||
            lower.includes('pain') ||
            lower.includes('migraine') ||
            lower.includes('jwor') ||
            lower.includes('byatha')
          ) {
            reply = `Ami apnar symptoms bhalobhabe examine korechi. Jwor aar pain-er jonyo Dolo 650, adequate rest aar hydration-er poramorsho dichhi. Apnar ki aar kono symptoms ba health issues ache ja niye kotha bolte chan?`;
          } else if (
            lower.includes('no') ||
            lower.includes('na') ||
            lower.includes('nothing') ||
            lower.includes('nope') ||
            lower.includes('that is all') ||
            lower.includes("that's all") ||
            lower.includes('aar kichu na')
          ) {
            reply = `Bujhte perechi. Apni ki chan ami apnar medical prescription ta ekhon prepare kori?`;
          } else if (
            lower.includes('yes') ||
            lower.includes('hae') ||
            lower.includes('thik ache') ||
            lower.includes('please') ||
            lower.includes('sure') ||
            lower.includes('ok') ||
            lower.includes('baniye din') ||
            lower.includes('download')
          ) {
            reply = `Nishchoi! Ami apnar official medical prescription prepare aar download korchi.`;
          } else {
            reply = `Bujhte perechi. Ami apnar consultation file-e eta note korechi. Apnar ki aar kono symptoms ba health issues ache ja niye kotha bolte chan?`;
          }
        } else {
          if (
            lower.includes('my name is') ||
            lower.includes("i'm") ||
            lower.includes('alex') ||
            lower.includes('sarah') ||
            lower.includes('david') ||
            /\d{1,2}\s*(years|yrs)/.test(lower)
          ) {
            reply = `Thank you. It is a pleasure to meet you. Please describe your main symptoms, how long you have felt this way, and your pain or fever level.`;
          } else if (
            lower.includes('fever') ||
            lower.includes('throat') ||
            lower.includes('headache') ||
            lower.includes('cough') ||
            lower.includes('pain') ||
            lower.includes('migraine')
          ) {
            reply = `I have carefully evaluated your symptoms. I recommend Dolo 650 for fever and pain, adequate rest, and proper hydration. Do you have any other symptoms or health issues you'd like to discuss?`;
          } else if (
            lower.includes('no') ||
            lower.includes('nothing') ||
            lower.includes('nope') ||
            lower.includes('that is all') ||
            lower.includes("that's all")
          ) {
            reply = `Understood. Would you like me to prepare your medical prescription now?`;
          } else if (
            lower.includes('yes') ||
            lower.includes('please') ||
            lower.includes('sure') ||
            lower.includes('ok') ||
            lower.includes('okay') ||
            lower.includes('make') ||
            lower.includes('generate') ||
            lower.includes('download')
          ) {
            reply = `Certainly! I am preparing and downloading your official medical prescription right now.`;
          } else {
            reply = `I understand. I have noted this in your medical consultation file. Do you have any other symptoms or health issues you'd like to discuss?`;
          }
        }

        setTimeout(() => {
          speakDoctorText(reply);
        }, 500);
      }
    },
    [consultationLanguage, isConnected, speakDoctorText]
  );

  // Simulated Doctor Walkthrough for Offline / Quota-depleted Demo
  const startSimulatedConsultation = useCallback(() => {
    setIsConnected(true);
    setIsConnecting(false);
    setStatusText('Dr. DoctoMPT is speaking...');

    // First greeting turn in selected consultation language
    const greeting = getSimulatedGreeting(consultationLanguage);
    speakDoctorText(greeting);
  }, [consultationLanguage, speakDoctorText]);

  // Set visual state to 'writing' when generating prescription
  const setWritingState = useCallback((isWriting: boolean) => {
    setVisualState(isWriting ? 'writing' : 'idle');
    if (isWriting) {
      setStatusText('Dr. DoctoMPT is preparing your prescription...');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (sessionRef.current) {
        try {
          sessionRef.current.close();
        } catch (e) {}
      }
    };
  }, [stopAudio]);

  return {
    isConnected,
    isConnecting,
    isMuted,
    statusText,
    visualState,
    micLevel,
    speakerLevel,
    transcript,
    setTranscript,
    patientName,
    setPatientName,
    patientAge,
    setPatientAge,
    connect,
    disconnect,
    toggleMute,
    sendTextMessage,
    setWritingState,
    startSimulatedConsultation,
    speakDoctorText,
  };
}
