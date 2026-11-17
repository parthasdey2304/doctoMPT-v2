'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import { DoctorAvatar } from '@/components/DoctorAvatar';
import { generatePrescriptionPdf } from '@/lib/prescription-pdf';
import { formatErrorMessage } from '@/lib/error-utils';
import {
  DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  DEFAULT_DOCTOR_VOICE,
  AVAILABLE_VOICES,
  VoiceName,
  CONSULTATION_LANGUAGES,
  ConsultationLanguage,
  DEFAULT_CONSULTATION_LANGUAGE,
  buildSystemInstructionWithLanguage,
  shouldAutoTriggerRx,
} from '@/lib/constants';
import { PrescriptionData, SavedConsultation } from '@/types/consultation';
import { normalizeMedication } from '@/lib/medication-utils';
import {
  Stethoscope,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  FileText,
  Download,
  Database,
  Settings,
  Send,
  Sparkles,
  User,
  Calendar,
  Pill,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  History,
  Info,
  Sun,
  Moon,
  Menu,
  Volume2,
  Languages,
} from 'lucide-react';

export default function Home() {
  // Theme state: defaults to 'light' (clean white medical UI)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hamburger drawer / side panel state
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Config & State stored in localStorage
  const [apiKey, setApiKey] = useState('');
  const [systemInstruction, setSystemInstruction] = useState(
    DEFAULT_DOCTOR_SYSTEM_INSTRUCTION
  );
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(DEFAULT_DOCTOR_VOICE);
  const [selectedLanguage, setSelectedLanguage] = useState<ConsultationLanguage>(
    DEFAULT_CONSULTATION_LANGUAGE
  );

  // Dynamically inject selected consultation language into doctor system instructions
  const effectiveSystemInstruction = useMemo(() => {
    return buildSystemInstructionWithLanguage(systemInstruction, selectedLanguage);
  }, [systemInstruction, selectedLanguage]);

  // Microphone selection state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Manual text fallback input
  const [textInput, setTextInput] = useState('');

  // Prescription state
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  // Saved Consultations history from NoSQL database
  const [savedConsultations, setSavedConsultations] = useState<SavedConsultation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize useGeminiLive hook
  const {
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
    patientAge,
    connect,
    disconnect,
    toggleMute,
    sendTextMessage,
    setWritingState,
    startSimulatedConsultation,
  } = useGeminiLive({
    customSystemInstruction: effectiveSystemInstruction,
    voiceName: selectedVoice,
    customApiKey: apiKey,
    audioDeviceId: selectedAudioDeviceId,
    consultationLanguage: selectedLanguage,
  });

  // Theme synchronization on mount and toggle
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('doctompt_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark') {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('doctompt_theme', nextTheme);
    } catch (e) {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Enumerate available microphone devices
  const enumerateMicrophones = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let audioInputs = devices.filter((d) => d.kind === 'audioinput');

      // If device labels are empty, trigger a quick permission check so labels appear
      if (audioInputs.length > 0 && !audioInputs[0].label) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          audioInputs = devices.filter((d) => d.kind === 'audioinput');
          tempStream.getTracks().forEach((track) => track.stop());
        } catch (permErr) {
          // Microphone permission not yet granted
        }
      }

      setAudioDevices(audioInputs);
      if (audioInputs.length > 0) {
        const savedMic = localStorage.getItem('doctor_selected_mic_id');
        if (savedMic && audioInputs.some((d) => d.deviceId === savedMic)) {
          setSelectedAudioDeviceId(savedMic);
        } else if (!selectedAudioDeviceId) {
          setSelectedAudioDeviceId(audioInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err);
    }
  }, [selectedAudioDeviceId]);

  useEffect(() => {
    enumerateMicrophones();
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', enumerateMicrophones);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', enumerateMicrophones);
      };
    }
  }, [enumerateMicrophones]);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey && !storedKey.includes('AQ.Ab8RN6LoUI0u')) {
        setApiKey(storedKey);
      } else if (storedKey && storedKey.includes('AQ.Ab8RN6LoUI0u')) {
        localStorage.removeItem('gemini_api_key');
      }

      const storedPrompt = localStorage.getItem('doctor_system_instruction');
      if (
        storedPrompt &&
        !storedPrompt.includes('Gemini') &&
        !storedPrompt.includes('educational') &&
        !storedPrompt.includes('hackathon') &&
        !storedPrompt.includes('simulation')
      ) {
        setSystemInstruction(storedPrompt);
      } else {
        setSystemInstruction(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION);
        if (storedPrompt) {
          try {
            localStorage.setItem('doctor_system_instruction', DEFAULT_DOCTOR_SYSTEM_INSTRUCTION);
          } catch {}
        }
      }

      const storedVoice = localStorage.getItem('doctor_voice') as VoiceName;
      if (storedVoice && AVAILABLE_VOICES.some((v) => v.id === storedVoice)) {
        setSelectedVoice(storedVoice);
      } else {
        setSelectedVoice(DEFAULT_DOCTOR_VOICE);
      }

      const storedLang = localStorage.getItem('doctor_language') as ConsultationLanguage;
      if (storedLang && CONSULTATION_LANGUAGES.some((l) => l.id === storedLang)) {
        setSelectedLanguage(storedLang);
      }
    } catch (e) {}
  }, []);

  // Auto-scroll transcript container ONLY (never scroll the browser page/window on mobile)
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  // Handle Save Settings
  const handleSaveSettings = (newKey: string) => {
    setApiKey(newKey);
    try {
      localStorage.setItem('gemini_api_key', newKey);
    } catch (e) {}
    setShowSettingsModal(false);
  };

  const handleSavePrompt = (newPrompt: string) => {
    setSystemInstruction(newPrompt);
    try {
      localStorage.setItem('doctor_system_instruction', newPrompt);
    } catch (e) {}
    setShowPromptModal(false);
  };

  const handleVoiceChange = (voice: VoiceName) => {
    setSelectedVoice(voice);
    try {
      localStorage.setItem('doctor_voice', voice);
    } catch (e) {}
  };

  const handleLanguageChange = (lang: ConsultationLanguage) => {
    setSelectedLanguage(lang);
    try {
      localStorage.setItem('doctor_language', lang);
    } catch (e) {}
  };

  // Handle Prescription Generation via Model 2 (gemini-3.5-flash-lite)
  const handleGeneratePrescription = useCallback(async () => {
    if (transcript.length === 0) {
      setPrescriptionError('Please conduct at least one conversational exchange first.');
      return;
    }

    try {
      setIsGeneratingPrescription(true);
      setPrescriptionError(null);
      setWritingState(true);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey.trim()) {
        headers['x-gemini-api-key'] = apiKey.trim();
      }

      const res = await fetch('/api/generate-prescription', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript,
          patientName: patientName || undefined,
          patientAge: patientAge || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate prescription');
      }

      setPrescription(data);
      // Auto-download PDF
      generatePrescriptionPdf(data, true);
    } catch (err: any) {
      console.error('Prescription generation failed:', err);
      setPrescriptionError(formatErrorMessage(err));
      // Reset trigger ref on failure to allow user to retry
      autoTriggeredRxRef.current = false;
    } finally {
      setIsGeneratingPrescription(false);
      setWritingState(false);
    }
  }, [transcript, apiKey, patientName, patientAge, setWritingState]);

  const autoTriggeredRxRef = useRef(false);

  // Automatic Prescription Generation & Download Detector
  useEffect(() => {
    // Reset auto-trigger state if transcript is empty
    if (transcript.length === 0) {
      autoTriggeredRxRef.current = false;
      return;
    }

    if (isGeneratingPrescription || autoTriggeredRxRef.current || transcript.length < 2) {
      return;
    }

    if (shouldAutoTriggerRx(transcript)) {
      console.log('[Auto-Rx] Prescription trigger condition met in transcript. Generating PDF...');
      autoTriggeredRxRef.current = true;
      handleGeneratePrescription();
    }
  }, [transcript, isGeneratingPrescription, handleGeneratePrescription]);

  // Save consultation to NoSQL database
  const handleSaveToDatabase = async () => {
    if (transcript.length === 0) return;
    try {
      setIsSavingToDb(true);
      setSavedSuccessMessage(null);

      const res = await fetch('/api/save-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          prescription,
          patientName: prescription?.patientName || patientName || 'Demo Patient',
          patientAge: prescription?.patientAge || patientAge || 'Not specified',
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setSavedSuccessMessage('Consultation stored in NoSQL database successfully!');
        setTimeout(() => setSavedSuccessMessage(null), 4000);
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (e: any) {
      alert('Error saving to database: ' + e?.message);
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Fetch Database History
  const fetchConsultationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/save-consultation');
      const data = await res.json();
      if (res.ok && data.consultations) {
        setSavedConsultations(data.consultations);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Handle manual message send
  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput('');
  };

  // Quick Symptom Injection scenarios for easy demoing
  const quickScenarios = [
    {
      name: 'Alex',
      age: '28',
      tag: 'Fever & Throat',
      prompt: 'Hi doctor, my name is Alex, 28 years old. I have had a high fever and sore throat for 2 days.',
    },
    {
      name: 'Sarah',
      age: '35',
      tag: 'Acute Migraine',
      prompt: 'Doctor, I am Sarah, 35. Severe migraine on the left side of my head and nausea since this morning.',
    },
    {
      name: 'David',
      age: '45',
      tag: 'Back Pain',
      prompt: 'Hello doctor, my name is David, 45. Pain in my lower back and mild stiffness after lifting boxes yesterday.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 font-sans selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-300 transition-colors duration-200">
      {/* Top Clinical Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-neutral-800/80 bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  DoctoMPT
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  Virtual Clinic
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:block">
                Dr. DoctoMPT - AI Voice Consultation & Digital Prescription
              </p>
            </div>
          </div>

          {/* Top Right Controls: Status Pill + Light/Dark Mode Toggle + Hamburger Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Audio Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-100/80 dark:bg-neutral-900 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : isConnecting
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-slate-400 dark:bg-neutral-600'
                }`}
              />
              <span className="font-medium text-slate-600 dark:text-neutral-300">
                {isConnected ? 'Session Active' : isConnecting ? 'Connecting...' : 'Doctor Standby'}
              </span>
            </div>

            {/* Sun / Moon Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle light and dark mode"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4 text-slate-700 hover:text-teal-600 transition-colors" />
                  <span className="text-xs font-medium text-slate-700 hidden lg:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400 hover:text-amber-300 transition-colors" />
                  <span className="text-xs font-medium text-neutral-200 hidden lg:inline">Light</span>
                </>
              )}
            </button>

            {/* Hamburger Side Panel Button */}
            <button
              type="button"
              onClick={() => setIsSidePanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:border-teal-500/40 transition-all cursor-pointer shadow-xs"
              title="Open Clinical Controls & Settings"
              aria-label="Open settings menu"
            >
              <Menu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Side Panel (Drawer) on the Right Side */}
      {isSidePanelOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsSidePanelOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-84 sm:w-96 bg-white dark:bg-[#121215] border-l border-slate-200 dark:border-neutral-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Clinical Controls & Tools
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsSidePanelOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Section 1: Audio & Microphone Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Audio Hardware Input
            </label>
            <div
              className={`p-3 rounded-xl border bg-slate-50 dark:bg-neutral-900/80 transition-all ${
                micLevel > 0.05
                  ? 'border-emerald-500/50 shadow-xs'
                  : 'border-slate-200 dark:border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Mic
                    className={`w-3.5 h-3.5 ${
                      micLevel > 0.05
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-neutral-400'
                    }`}
                  />
                  Microphone Device
                </span>
                {micLevel > 0.05 && (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 animate-pulse">
                    Active ({Math.round(micLevel * 100)}%)
                  </span>
                )}
              </div>
              <select
                value={selectedAudioDeviceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedAudioDeviceId(id);
                  try {
                    localStorage.setItem('doctor_selected_mic_id', id);
                  } catch (err) {}
                }}
                disabled={isConnected || isConnecting}
                className="w-full bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-50"
              >
                {audioDevices.length === 0 ? (
                  <option value="" className="bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300">
                    Default System Microphone
                  </option>
                ) : (
                  audioDevices.map((device, idx) => (
                    <option
                      key={device.deviceId || idx}
                      value={device.deviceId}
                      className="bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300"
                    >
                      {device.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1.5">
                Live stream sends 16kHz PCM audio directly to Dr. DoctoMPT.
              </p>
            </div>
          </div>

          {/* Section 2: Doctor Voice Persona */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Doctor Voice Persona
            </label>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/80">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Voice Profile
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">
                  {selectedVoice}
                </span>
              </div>
              <select
                value={selectedVoice}
                onChange={(e) => handleVoiceChange(e.target.value as VoiceName)}
                disabled={isConnected || isConnecting}
                className="w-full bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-50"
              >
                {AVAILABLE_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300">
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1.5">
                Neural synthesized voice for Dr. DoctoMPT during live consultation.
              </p>
            </div>
          </div>

          {/* Section 3: Consultation Language */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Consultation Language
            </label>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/80">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  Language
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  {CONSULTATION_LANGUAGES.find((l) => l.id === selectedLanguage)?.label}
                </span>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as ConsultationLanguage)}
                disabled={isConnected || isConnecting}
                className="w-full bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg p-2 text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-teal-500 cursor-pointer disabled:opacity-50"
              >
                {CONSULTATION_LANGUAGES.map((lang) => (
                  <option
                    key={lang.id}
                    value={lang.id}
                    className="bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300"
                  >
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1.5">
                Dr. DoctoMPT will understand and speak with you in your selected language.
              </p>
            </div>
          </div>

          {/* Section 4: Clinical System Prompt */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Doctor Clinical Persona
            </label>
            <button
              type="button"
              onClick={() => {
                setShowPromptModal(true);
                setIsSidePanelOpen(false);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                    Customize Doctor Prompt
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Adjust questioning cadence or specialization
                  </span>
                </div>
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-semibold group-hover:underline">
                Edit
              </span>
            </button>
          </div>

          {/* Section 5: Consultation Records (NoSQL) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Electronic Health Records (EMR)
            </label>
            <button
              type="button"
              onClick={() => {
                fetchConsultationHistory();
                setShowHistoryModal(true);
                setIsSidePanelOpen(false);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                    Saved Consultations Database
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    View previous patient transcripts & Rx
                  </span>
                </div>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                View
              </span>
            </button>
          </div>

          {/* Section 6: API Key Settings */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              API Credentials & Models
            </label>
            <button
              type="button"
              onClick={() => {
                setShowSettingsModal(true);
                setIsSidePanelOpen(false);
              }}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-600 dark:text-neutral-400" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                    Gemini API Key
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                    {apiKey ? 'Custom key configured' : 'Using environment key'}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-600 dark:text-neutral-400 font-semibold group-hover:underline">
                Configure
              </span>
            </button>
          </div>

          {/* Section 7: Interactive Walkthrough Demo */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Offline Simulation
            </label>
            <button
              type="button"
              onClick={() => {
                startSimulatedConsultation();
                setIsSidePanelOpen(false);
              }}
              className="w-full p-3 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100/60 dark:hover:bg-teal-900/30 text-left transition-colors flex items-center justify-between group cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <div>
                  <span className="font-semibold text-teal-900 dark:text-teal-200 block">
                    Interactive Doctor Walkthrough
                  </span>
                  <span className="text-[11px] text-teal-700/80 dark:text-teal-400/80">
                    Test complete voice dialogue & Rx generation
                  </span>
                </div>
              </div>
              <span className="text-xs text-teal-700 dark:text-teal-300 font-bold">
                Run
              </span>
            </button>
          </div>

          {/* Architecture Badge */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 space-y-1">
            <div className="flex justify-between">
              <span>Doctor Engine:</span>
              <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">gemini-3.8-live</span>
            </div>
            <div className="flex justify-between">
              <span>Prescription Parser:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">gemini-3.5-flash-lite</span>
            </div>
            <div className="flex justify-between">
              <span>Verified Signature:</span>
              <span className="font-semibold text-slate-700 dark:text-neutral-300">Dr. DoctoMPT</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Doctor Avatar & Audio Controls (5 cols) */}
        <section className="lg:col-span-5 flex flex-col items-center bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden transition-colors">
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Doctor Card Header */}
          <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-neutral-800/80 pb-3 mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Dr. DoctoMPT
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">
                General Physician & Medical Consultant
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-mono text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/50 px-2 py-0.5 rounded-md font-semibold">
                gemini-3.8-live
              </span>
            </div>
          </div>

          {/* Animated Doctor SVG Avatar with dynamic mouth opening and states */}
          <DoctorAvatar
            state={visualState}
            speakerLevel={speakerLevel}
            micLevel={micLevel}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            statusText={statusText}
          />

          {/* Primary Consultation Call Actions */}
          <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800/80 flex flex-col items-center gap-3">
            {/* Quota / Billing Depletion Notice & Switch to Demo Banner */}
            {(statusText.toLowerCase().includes('depleted') ||
              statusText.toLowerCase().includes('1011') ||
              statusText.toLowerCase().includes('prepayment')) && (
              <div className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col gap-2 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-800 dark:text-amber-300">
                      Google AI Studio Notice:
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-200/80 mt-0.5">
                      Your current API key has 0 remaining prepayment credits for the Live WebSocket server. You can still test the entire voice doctor with <strong>Interactive Demo Mode</strong>!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startSimulatedConsultation}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Launch Interactive Doctor Demo</span>
                </button>
              </div>
            )}

            {!isConnected ? (
              <div className="w-full flex flex-col gap-2">
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting to Live Session...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-4 h-4 text-white" />
                      <span>Start Voice Consultation</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={startSimulatedConsultation}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700/60 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Start Interactive Doctor (Demo Mode)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={disconnect}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>End Consultation Call</span>
              </button>
            )}

            {/* Quick Demo Starters */}
            <div className="w-full mt-3">
              <p className="text-xs font-bold text-slate-800 dark:text-neutral-300 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>One-Click Quick Test Scenarios:</span>
              </p>
              <div className="flex flex-col gap-2">
                {quickScenarios.map((scen, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      sendTextMessage(scen.prompt);
                      if (!isConnected && !isConnecting) {
                        connect();
                      }
                    }}
                    className="w-full text-left bg-slate-50/80 hover:bg-teal-50/50 dark:bg-neutral-950/90 dark:hover:bg-neutral-800/90 border border-slate-200 hover:border-teal-400 dark:border-neutral-800/90 dark:hover:border-teal-500/40 p-3 rounded-xl transition-all shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-teal-300 group-hover:text-teal-700 dark:group-hover:text-teal-200">
                        {scen.name} ({scen.age} yrs)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 dark:bg-teal-500/10 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 font-semibold">
                        {scen.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed font-normal">
                      &ldquo;{scen.prompt}&rdquo;
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Live Transcript & Prescription Generator (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Live Transcript Strip */}
          <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col h-[390px] transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Consultation Transcript
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                {transcript.length} {transcript.length === 1 ? 'turn' : 'turns'} recorded
              </span>
            </div>

            {/* Scrollable Conversation Turns */}
            <div
              ref={transcriptContainerRef}
              className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs sm:text-sm bg-slate-50/50 dark:bg-neutral-950/40 rounded-xl my-2 px-2 border border-slate-100 dark:border-neutral-800/40"
            >
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 dark:text-neutral-500">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-800/50 flex items-center justify-center mb-3">
                    <Mic className="w-6 h-6 text-slate-400 dark:text-neutral-500" />
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-neutral-300">
                    No conversation yet
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-500 max-w-xs mt-1">
                    Start the voice consultation above and speak, or type your symptoms below.
                    Dr. DoctoMPT will capture your symptoms, clinical history, and patient details.
                  </p>
                </div>
              ) : (
                transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col ${
                      item.role === 'patient' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-500 dark:text-neutral-400 font-medium">
                      <span>{item.role === 'patient' ? 'You (Patient)' : 'Dr. DoctoMPT'}</span>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-600">*{item.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        item.role === 'patient'
                          ? 'bg-teal-50 border border-teal-200 text-teal-950 dark:bg-teal-500/15 dark:border-teal-500/30 dark:text-teal-100 rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 dark:bg-neutral-800/90 dark:border-neutral-700/60 dark:text-neutral-200 rounded-tl-none'
                      }`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Text Fallback Input Bar */}
            <form
              onSubmit={handleSendText}
              className="mt-1 pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message or answer doctor's question..."
                className="flex-1 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-teal-500 transition-colors shadow-xs"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Prescription Action & Rx Preview Card */}
          <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-neutral-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Medical Prescription (Rx) Generator
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-md font-semibold">
                    gemini-3.5-flash-lite
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Synthesizes clinical notes and formats instant downloadable PDF Rx
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGeneratePrescription}
                disabled={isGeneratingPrescription || transcript.length === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer ${
                  transcript.length > 0
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95 animate-pulse'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 border border-slate-200 dark:border-neutral-700/50 cursor-not-allowed'
                }`}
              >
                {isGeneratingPrescription ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing & Drafting Rx...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Generate Prescription PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message if any */}
            {prescriptionError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{prescriptionError}</span>
              </div>
            )}

            {/* Success Message for DB Save */}
            {savedSuccessMessage && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{savedSuccessMessage}</span>
              </div>
            )}

            {/* Structured Rx Preview Display */}
            {prescription ? (
              <div className="mt-4 bg-slate-50/70 dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xs">
                {/* Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400 tracking-wider">
                      CLINICAL PRESCRIPTION
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Patient: {prescription.patientName} ({prescription.patientAge})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" />
                    <span>{prescription.date}</span>
                  </div>
                </div>

                {/* Complaint & Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xs">
                    <span className="text-slate-500 dark:text-neutral-400 font-semibold block mb-1">
                      Chief Complaint:
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 font-medium">
                      {prescription.chiefComplaint}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-xs">
                    <span className="text-slate-500 dark:text-neutral-400 font-semibold block mb-1">
                      Assessment & Impression:
                    </span>
                    <p className="text-slate-800 dark:text-neutral-200 font-medium">
                      {prescription.assessmentNotes}
                    </p>
                  </div>
                </div>

                {/* Medications List */}
                <div className="mt-3">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300 block mb-2">
                    Prescribed Medications ({prescription.medications?.length || 0}):
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-900 shadow-xs">
                      <thead className="bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-400 font-semibold">
                        <tr>
                          <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Medicine & Strength</th>
                          <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Frequency</th>
                          <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Timing</th>
                          <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Duration</th>
                          <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Clinical Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                        {prescription.medications?.map((rawMed, i) => {
                          const med = normalizeMedication(rawMed);
                          return (
                            <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/40">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {med.brandName || med.name}
                                </span>
                                {med.genericName && (
                                  <span className="text-[11px] text-teal-700 dark:text-teal-400 block font-medium">
                                    {med.genericName}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-mono">
                                  Strength: {med.dosage}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-700 dark:text-neutral-300 font-medium">{med.frequency}</td>
                              <td className="p-2.5 text-slate-700 dark:text-neutral-300">{med.timing}</td>
                              <td className="p-2.5 text-slate-600 dark:text-neutral-400">{med.duration}</td>
                              <td className="p-2.5 text-slate-700 dark:text-neutral-300">{med.reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Supportive Advice & Follow-Up */}
                <div className="mt-3 p-3.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/30 text-xs shadow-xs">
                  <span className="font-bold text-teal-800 dark:text-teal-300 block mb-1">
                    Supportive Care & Lifestyle Advice:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-neutral-300">
                    {prescription.advice?.map((adv, i) => (
                      <li key={i}>{adv}</li>
                    ))}
                  </ul>
                  <div className="mt-2.5 pt-2.5 border-t border-teal-200 dark:border-teal-800/30 text-slate-600 dark:text-neutral-400">
                    <span className="font-bold text-amber-700 dark:text-amber-300">Follow-up: </span>
                    {prescription.followUp}
                  </div>
                </div>

                {/* Digital Verification Signature with Google Font Mrs Saint Delafield */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-800 px-1">
                  <span className="text-[11px] text-slate-500 dark:text-neutral-500 font-mono">
                    Ref: RX-{prescription.date ? prescription.date.replace(/-/g, '') : '2026'}
                  </span>
                  <div className="text-right">
                    <div
                      className="text-2xl text-teal-700 dark:text-teal-400 font-normal leading-none select-none"
                      style={{ fontFamily: "'Mrs Saint Delafield', cursive" }}
                    >
                      Dr. DoctoMPT
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-neutral-400 font-semibold block mt-1">
                      Verified Digital Signature
                    </span>
                  </div>
                </div>

                {/* Action Buttons for the Rx */}
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => generatePrescriptionPdf(prescription, true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF Again</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToDatabase}
                    disabled={isSavingToDb}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 transition-colors shadow-xs cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isSavingToDb ? 'Saving...' : 'Save to NoSQL Database'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-8 border border-dashed border-slate-200 dark:border-neutral-800 rounded-xl text-center text-slate-500 dark:text-neutral-500 text-xs">
                <FileText className="w-8 h-8 text-slate-400 dark:text-neutral-600 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-slate-700 dark:text-neutral-400">
                  No prescription generated yet
                </p>
                <p className="text-slate-500 dark:text-neutral-500 mt-1 max-w-sm mx-auto">
                  Once your consultation finishes, click &ldquo;Generate Prescription PDF&rdquo; above.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/90 dark:border-neutral-800/80 mt-auto py-3 px-6 text-center text-xs text-slate-500 dark:text-neutral-500 bg-white/50 dark:bg-transparent">
        DoctoMPT - Dr. DoctoMPT Virtual Health Consultation & Instant Digital Prescriptions
      </footer>

      {/* --- MODAL 1: Customize Doctor System Instruction --- */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Customize Doctor System Instruction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-400">
              Modify the live doctor persona, questioning style, or medical focus. This prompt is sent to <code className="text-teal-700 dark:text-teal-300 font-mono">gemini-3.8-live</code> at session start.
            </p>

            <textarea
              rows={8}
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-slate-900 dark:text-neutral-200 focus:outline-none focus:border-teal-500 font-mono leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setSystemInstruction(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION)}
                className="text-xs text-slate-500 dark:text-neutral-400 hover:underline cursor-pointer"
              >
                Reset to Default
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePrompt(systemInstruction)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-xs"
                >
                  Save Persona
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: API Key Configuration --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gemini API Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-400">
              You can set your Gemini API key in <code className="text-teal-700 dark:text-teal-300 font-mono">.env.local</code> or enter it here directly. Stored securely in your browser&apos;s local storage.
            </p>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-slate-900 dark:text-neutral-200 focus:outline-none focus:border-teal-500 font-mono"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(apiKey)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-xs"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Saved Consultations History (NoSQL Database) --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[80vh] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Consultation Records (NoSQL Database)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-neutral-400">
                  <span className="inline-block w-4 h-4 border-2 border-teal-600 dark:border-teal-400 border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Loading database records...</p>
                </div>
              ) : savedConsultations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-neutral-500">
                  <History className="w-8 h-8 text-slate-400 dark:text-neutral-600 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-700 dark:text-neutral-400">
                    No saved records found
                  </p>
                  <p className="text-slate-500 dark:text-neutral-500 mt-1">
                    Consultations you save will be listed here with full transcripts and prescriptions.
                  </p>
                </div>
              ) : (
                savedConsultations.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs flex flex-col gap-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.patientName} ({item.patientAge})
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-500 font-mono">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-neutral-400 line-clamp-1">
                      {item.transcript[0]?.text || 'No dialogue summary'}
                    </p>

                    {item.prescription && (
                      <div className="mt-1 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-neutral-900">
                        <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                          {item.prescription.medications?.length || 0} Medications Prescribed
                        </span>
                        <button
                          type="button"
                          onClick={() => generatePrescriptionPdf(item.prescription!, true)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
