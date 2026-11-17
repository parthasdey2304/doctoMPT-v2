'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Stethoscope,
  RotateCcw,
  Home,
  Database,
  ArrowLeft,
  Activity,
  HeartPulse,
  FileQuestion,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  PhoneCall,
  Pill,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { CLINICAL_404_DIAGNOSIS, executeReloadToMain } from '@/lib/not-found-utils';

export default function NotFound() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Synchronize theme with localStorage and root element
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('doctompt_theme') as 'light' | 'dark' | null;
      if (savedTheme === 'dark' || document.documentElement.classList.contains('dark')) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
      }
    } catch {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'doctompt_theme') {
        const next = e.newValue === 'dark' ? 'dark' : 'light';
        setTheme(next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('doctompt_theme', nextTheme);
    } catch {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleReload = () => {
    setIsReloading(true);
    router.push('/');
    router.refresh();
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      handleReload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 font-sans selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-300 transition-colors duration-200">
      {/* Top Clinical Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-neutral-800/80 bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  DoctoMPT
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  Virtual Clinic
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                  Ward 404
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:block">
                Dr. DoctoMPT - Emergency Triage & Diagnostic Navigation
              </p>
            </div>
          </Link>

          {/* Navigation & Controls */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all cursor-pointer text-xs font-semibold"
              title="Return to Main Doctor Consultation"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Doctor Consultation</span>
            </Link>

            <Link
              href="/records"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer text-xs font-semibold"
              title="View Patient Records Database"
            >
              <Database className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
              <span className="hidden sm:inline">Records Database</span>
            </Link>

            {/* Sun / Moon Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              suppressHydrationWarning
              className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              title={mounted && theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle light and dark mode"
            >
              {mounted && theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="text-xs font-medium hidden sm:inline text-neutral-300">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-medium hidden sm:inline text-slate-700">Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main 404 Medical Triage Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Medical Status Pill */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>DIAGNOSIS CODE: 404 • CLINICAL CHART NOT FOUND</span>
          </div>
        </div>

        {/* Hero Title & Doctor Assessment */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Digital Ward Not Found
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-neutral-300 leading-relaxed">
            {CLINICAL_404_DIAGNOSIS.clinicalImpression}
          </p>
        </div>

        {/* Clinical Patient Monitor & ECG Flatline Display */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-lg">
          {/* Monitor Top Status Bar */}
          <div className="bg-slate-900 text-neutral-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>PATIENT MONITOR: DR. DOCTOMPT CLINIC</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-neutral-400">
              <span>WARD: UNREGISTERED</span>
              <span className="text-rose-400 font-bold">STATUS: FLATLINE 0 BPM</span>
            </div>
          </div>

          {/* ECG Oscilloscope Screen */}
          <div className="p-4 sm:p-6 bg-slate-950 text-emerald-400 font-mono relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #10b981 1px, transparent 1px), linear-gradient(to right, #10b98108 1px, transparent 1px), linear-gradient(to bottom, #10b98108 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* ECG Pulse SVG Waveform */}
            <div className="relative z-10 my-2">
              <svg
                viewBox="0 0 800 100"
                className="w-full h-16 sm:h-20 stroke-current text-teal-400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 50 L180 50 L200 48 L215 50 L240 50 L250 15 L260 85 L270 35 L280 58 L290 50 L460 50 L470 48 L480 50 L520 50 L530 18 L540 82 L550 38 L560 56 L570 50 L800 50"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-90"
                />
              </svg>
            </div>

            {/* Clinical Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-950/80 text-xs">
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-emerald-500/20">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-rose-400" />
                  Heart Rate
                </div>
                <div className="text-base sm:text-lg font-bold text-rose-400 mt-0.5">
                  {CLINICAL_404_DIAGNOSIS.vitals.pulse}
                </div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-emerald-500/20">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  Blood Pressure
                </div>
                <div className="text-base sm:text-lg font-bold text-cyan-400 mt-0.5">
                  {CLINICAL_404_DIAGNOSIS.vitals.bloodPressure}
                </div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-emerald-500/20">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  SpO2 Saturation
                </div>
                <div className="text-base sm:text-lg font-bold text-teal-400 mt-0.5">
                  {CLINICAL_404_DIAGNOSIS.vitals.oxygenSaturation}
                </div>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-emerald-500/20">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  <Pill className="w-3 h-3 text-amber-400" />
                  Temperature
                </div>
                <div className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">
                  {CLINICAL_404_DIAGNOSIS.vitals.temperature}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor's Diagnostic Clipboard & Treatment Plan */}
        <div className="mb-8 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-xs">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-neutral-800">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <FileQuestion className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Clinical Examination Note • Dr. DoctoMPT
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Attending Physician: {CLINICAL_404_DIAGNOSIS.attendingPhysician} ({CLINICAL_404_DIAGNOSIS.specialization})
              </p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 dark:text-neutral-300 space-y-2 mb-5">
            <p className="font-semibold text-slate-900 dark:text-white">
              Doctor&apos;s Recommended Clinical Treatment Plan:
            </p>
            <ul className="space-y-2 pl-1">
              {CLINICAL_404_DIAGNOSIS.treatmentPlan.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons: Primary Reload to Main Page, Secondary Records, Go Back */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
            {/* Primary Action Button: Reload to Main Page */}
            <button
              type="button"
              onClick={handleReload}
              disabled={isReloading}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-70"
            >
              <RotateCcw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
              <span>{isReloading ? 'Reloading Main Page...' : 'Reload to Main Page'}</span>
            </button>

            {/* Link to Main Page */}
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-semibold transition-all shadow-xs"
            >
              <Home className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Clinic Home</span>
            </Link>

            {/* Link to Records Portal */}
            <Link
              href="/records"
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-800 text-sm font-semibold transition-all shadow-xs"
            >
              <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Patient Records</span>
            </Link>

            {/* Go Back in History Button */}
            <button
              type="button"
              onClick={handleGoBack}
              className="flex items-center justify-center gap-1.5 px-3.5 py-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-all cursor-pointer"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Available Clinical Wards Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CLINICAL_404_DIAGNOSIS.wards.map((ward) => (
            <Link
              key={ward.id}
              href={ward.path}
              className="p-4 rounded-xl border border-slate-200/90 dark:border-neutral-800/80 bg-white dark:bg-[#121215] hover:border-teal-500/50 dark:hover:border-teal-500/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {ward.title}
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  {ward.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mb-2.5">
                {ward.description}
              </p>
              <div className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                <span>Enter Ward</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Clinical Footer */}
      <footer className="border-t border-slate-200 dark:border-neutral-800/80 py-4 px-4 bg-white/50 dark:bg-[#09090b]/50 text-center text-xs text-slate-500 dark:text-neutral-500">
        <p>
          Dr. DoctoMPT Virtual Clinic • AI-Powered Doctor Consultation & Instant Prescriptions
        </p>
      </footer>
    </div>
  );
}
