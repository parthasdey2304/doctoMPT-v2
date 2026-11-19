'use client';

import React, { useId, useState, useEffect } from 'react';
import { DoctorVisualState } from '@/types/consultation';
import { Mic, MicOff, Volume2, Sparkles, PenTool } from 'lucide-react';

interface DoctorAvatarProps {
  state: DoctorVisualState;
  speakerLevel: number; // 0 to 1
  micLevel: number; // 0 to 1
  isMuted?: boolean;
  onToggleMute?: () => void;
  statusText: string;
}

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  state,
  speakerLevel,
  micLevel,
  isMuted,
  onToggleMute,
  statusText,
}) => {
  const maskId = useId();

  // Natural speech cadence mouth oscillation (opens and closes while doctor is speaking)
  const [mouthOscillation, setMouthOscillation] = useState(0.5);

  useEffect(() => {
    if (state !== 'speaking') {
      setMouthOscillation(0);
      return;
    }
    let animId: number;
    const start = performance.now();
    const frame = (now: number) => {
      const elapsed = (now - start) / 1000;
      // Syllabic speech oscillation between 0.15 and 1.0 at ~5.5Hz
      const osc = Math.abs(Math.sin(elapsed * Math.PI * 5.5));
      setMouthOscillation(osc);
      animId = requestAnimationFrame(frame);
    };
    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [state]);

  // Dynamic mouth aperture height: continuously opens and closes while speaking
  const effectiveAudioGain = Math.max(speakerLevel, 0.35);
  const mouthOpenHeight =
    state === 'speaking'
      ? Math.max(4, Math.min(26, Math.round(5 + mouthOscillation * effectiveAudioGain * 24)))
      : 3;

  // Mouth smile curve when idle/listening
  const isSmiling = state === 'idle' || state === 'listening';

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-5 w-full max-w-md mx-auto">
      {/* Visual Avatar Container */}
      <div className="relative w-60 h-60 sm:w-68 sm:h-68 flex items-center justify-center">
        {/* Ambient Glow Aura */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
            state === 'speaking'
              ? 'bg-teal-500/20 dark:bg-teal-500/25 scale-110'
              : state === 'listening'
              ? 'bg-blue-500/15 dark:bg-blue-500/20 scale-105'
              : state === 'writing'
              ? 'bg-amber-500/15 dark:bg-amber-500/20 scale-100'
              : 'bg-teal-500/5 dark:bg-teal-500/10 scale-95'
          }`}
        />

        {/* Outer Circular Halo Indicator */}
        <div
          className={`absolute inset-1 rounded-full border-2 transition-colors duration-500 ${
            state === 'speaking'
              ? 'border-teal-500 dark:border-teal-400/70 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
              : state === 'listening'
              ? 'border-blue-500 dark:border-blue-400/70 shadow-[0_0_18px_rgba(59,130,246,0.3)] animate-pulse'
              : state === 'writing'
              ? 'border-amber-500 dark:border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.3)]'
              : 'border-slate-200 dark:border-neutral-800'
          }`}
        />

        {/* Doctor SVG Character */}
        <svg
          viewBox="0 0 300 300"
          className="w-full h-full relative z-10 transition-transform duration-300 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            <linearGradient id="scrubsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>

            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>

            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <clipPath id={`${maskId}-avatar-clip`}>
              <circle cx="150" cy="150" r="140" />
            </clipPath>
          </defs>

          {/* Background circle inside avatar - deep clinical slate for high contrast */}
          <circle cx="150" cy="150" r="138" fill="#0f172a" />

          {/* Audio soundwaves behind doctor during speaking / listening */}
          {state === 'speaking' && (
            <g className="animate-pulse opacity-70">
              <circle cx="150" cy="150" r="120" stroke="#14b8a6" strokeWidth="2" strokeDasharray="6 6" />
              <circle cx="150" cy="150" r="132" stroke="#2dd4bf" strokeWidth="1" strokeDasharray="3 3" />
            </g>
          )}

          {state === 'listening' && (
            <g className="animate-pulse opacity-60">
              <path d="M 60 130 C 50 145 50 165 60 180" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
              <path d="M 48 120 C 35 145 35 175 48 200" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
              <path d="M 240 130 C 250 145 250 165 240 180" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
              <path d="M 252 120 C 265 145 265 175 252 200" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {/* Doctor Body & Head Group inside clip */}
          <g clipPath={`url(#${maskId}-avatar-clip)`}>
            {/* Shoulders / Torso / White Medical Coat */}
            <path
              d="M 60 310 C 60 250 90 230 150 230 C 210 230 240 250 240 310 Z"
              fill="url(#coatGrad)"
            />

            {/* Teal Scrubs V-neck under coat */}
            <polygon points="120,230 180,230 150,270" fill="url(#scrubsGrad)" />

            {/* Stethoscope around neck */}
            <path
              d="M 115 220 C 115 270 130 285 150 285 C 170 285 185 270 185 220"
              stroke="#475569"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Stethoscope chest piece bell */}
            <circle cx="150" cy="285" r="8" fill="#94a3b8" stroke="#475569" strokeWidth="2" />

            {/* White Coat Lapels */}
            <polygon points="100,230 130,285 110,290 85,235" fill="#f8fafc" />
            <polygon points="200,230 170,285 190,290 215,235" fill="#f8fafc" />

            {/* Neck */}
            <rect x="135" y="180" width="30" height="35" rx="5" fill="url(#skinGrad)" />

            {/* Head */}
            <ellipse
              cx="150"
              cy={state === 'writing' ? 148 : 142}
              rx="46"
              ry="54"
              fill="url(#skinGrad)"
              className="transition-all duration-300"
            />

            {/* Ears */}
            <ellipse cx="102" cy="142" rx="7" ry="12" fill="url(#skinGrad)" />
            <ellipse cx="198" cy="142" rx="7" ry="12" fill="url(#skinGrad)" />

            {/* Hair */}
            <path
              d="M 103 135 C 100 95 120 75 150 75 C 180 75 200 95 197 135 C 190 100 175 90 150 90 C 125 90 110 100 103 135 Z"
              fill="url(#hairGrad)"
            />
            {/* Side hair locks */}
            <path d="M 102 120 C 100 140 106 150 106 150" stroke="url(#hairGrad)" strokeWidth="6" strokeLinecap="round" />
            <path d="M 198 120 C 200 140 194 150 194 150" stroke="url(#hairGrad)" strokeWidth="6" strokeLinecap="round" />

            {/* Eyebrows */}
            {state === 'listening' ? (
              // Inquisitive / Attentive Eyebrows
              <g stroke="#334155" strokeWidth="3" strokeLinecap="round">
                <path d="M 124 116 Q 134 112 142 115" />
                <path d="M 158 115 Q 166 110 176 114" />
              </g>
            ) : state === 'writing' ? (
              // Focused downward Eyebrows
              <g stroke="#334155" strokeWidth="3" strokeLinecap="round">
                <path d="M 124 122 Q 134 120 142 124" />
                <path d="M 158 124 Q 166 120 176 122" />
              </g>
            ) : (
              // Calm / Friendly Eyebrows
              <g stroke="#334155" strokeWidth="3" strokeLinecap="round">
                <path d="M 124 118 Q 134 114 142 118" />
                <path d="M 158 118 Q 166 114 176 118" />
              </g>
            )}

            {/* Eyes */}
            {state === 'writing' ? (
              // Looking down at prescription
              <g stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round">
                <path d="M 126 132 Q 134 136 142 132" />
                <path d="M 158 132 Q 166 136 174 132" />
              </g>
            ) : (
              // Open alert, warm doctor eyes
              <g>
                <circle cx="134" cy="130" r="6" fill="#1e293b" />
                <circle cx="166" cy="130" r="6" fill="#1e293b" />
                {/* Eye sparkle reflection */}
                <circle cx="136" cy="128" r="2" fill="#ffffff" />
                <circle cx="168" cy="128" r="2" fill="#ffffff" />
              </g>
            )}

            {/* Glasses */}
            <g stroke="#0f766e" strokeWidth="2.5" fill="none">
              <rect x="122" y="120" width="24" height="18" rx="6" />
              <rect x="154" y="120" width="24" height="18" rx="6" />
              <line x1="146" y1="128" x2="154" y2="128" />
              {/* Arms to ears */}
              <line x1="122" y1="127" x2="105" y2="129" />
              <line x1="178" y1="127" x2="195" y2="129" />
            </g>

            {/* Nose */}
            <path
              d="M 150 134 L 148 147 Q 152 150 155 147"
              stroke="#ea580c"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Mouth: Syllabic open/close during speech */}
            {state === 'speaking' ? (
              <g>
                {/* Lip outline / mouth cavity */}
                <ellipse
                  cx="150"
                  cy="165"
                  rx="13"
                  ry={mouthOpenHeight}
                  fill="#881337"
                  stroke="#be123c"
                  strokeWidth="2"
                />
                {/* Teeth visibility when mouth opens wider */}
                {mouthOpenHeight > 10 && (
                  <path
                    d={`M 141 ${165 - mouthOpenHeight + 3} Q 150 ${
                      165 - mouthOpenHeight + 5
                    } 159 ${165 - mouthOpenHeight + 3}`}
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                )}
                {/* Tongue accent */}
                {mouthOpenHeight > 14 && (
                  <ellipse cx="150" cy={165 + mouthOpenHeight - 4} rx="6" ry="3" fill="#fb7185" />
                )}
              </g>
            ) : isSmiling ? (
              // Friendly Doctor Smile
              <path
                d="M 140 162 Q 150 171 160 162"
                stroke="#991b1b"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              // Neutral/focused
              <line x1="142" y1="164" x2="158" y2="164" stroke="#991b1b" strokeWidth="2.5" strokeLinecap="round" />
            )}
          </g>
        </svg>

        {/* Dynamic Status Pill overlay */}
        <div className="absolute -bottom-2 z-20">
          {state === 'speaking' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all text-teal-800 bg-teal-50 border border-teal-300 dark:text-teal-200 dark:bg-teal-950/90 dark:border-teal-500/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              Dr. DoctoMPT Speaking...
            </span>
          ) : state === 'listening' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all text-blue-800 bg-blue-50 border border-blue-300 dark:text-blue-200 dark:bg-blue-950/90 dark:border-blue-500/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Listening to You...
            </span>
          ) : state === 'writing' ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-md transition-all text-amber-800 bg-amber-50 border border-amber-300 dark:text-amber-200 dark:bg-amber-950/90 dark:border-amber-500/50">
              <PenTool className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />
              Writing Prescription...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs transition-all text-slate-700 bg-white border border-slate-200 dark:text-slate-300 dark:bg-slate-900/90 dark:border-slate-700/60">
              <Sparkles className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              Doctor Ready
            </span>
          )}
        </div>
      </div>

      {/* Mic Volume Level Bar with clear status text */}
      <div className="w-48 flex flex-col items-center mt-5">
        <div className="w-full h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden border border-slate-300/60 dark:border-neutral-700/40">
          <div
            className={`h-full transition-all duration-75 rounded-full ${
              state === 'speaking'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                : 'bg-gradient-to-r from-blue-500 to-emerald-500'
            }`}
            style={{
              width: `${Math.round(
                (state === 'speaking' ? speakerLevel : isMuted ? 0 : micLevel) * 100
              )}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between w-full mt-1.5 px-1 text-[10px]">
          {state === 'listening' ? (
            micLevel > 0.05 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Mic Receiving Voice ({Math.round(micLevel * 100)}%)
              </span>
            ) : (
              <span className="text-slate-500 dark:text-neutral-500">Speak into microphone...</span>
            )
          ) : state === 'speaking' ? (
            <span className="text-teal-700 dark:text-teal-400 font-semibold">Dr. DoctoMPT Audio</span>
          ) : (
            <span className="text-slate-400 dark:text-neutral-500">Audio Ready</span>
          )}
        </div>
      </div>

      {/* Subtext info */}
      <p className="text-xs text-slate-500 dark:text-neutral-400 mt-2 text-center max-w-xs truncate font-medium">
        {statusText}
      </p>
    </div>
  );
};
