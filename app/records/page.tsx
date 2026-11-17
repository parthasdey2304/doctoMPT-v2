'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  PhoneCall,
  FileText,
  Download,
  Database,
  Search,
  X,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  Calendar,
  User,
  Pill,
  ShieldCheck,
  Languages,
  Volume2,
  Mic,
  Globe,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Info,
  Check,
  Copy,
} from 'lucide-react';
import { SavedConsultation, PrescriptionData } from '@/types/consultation';
import { normalizeMedication } from '@/lib/medication-utils';
import {
  filterConsultations,
  getConsultationStats,
  formatConsultationDate,
  triggerPrescriptionDownload,
  RecordsFilterMode,
} from '@/lib/records-utils';

export default function RecordsPage() {
  // Theme state: light | dark (persisted via localStorage doctompt_theme)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Hamburger drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Consultations data state
  const [records, setRecords] = useState<SavedConsultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'local' | 'unknown'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<RecordsFilterMode>('all');

  // Selected consultation for Desktop Master-Detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Expanded card IDs for Mobile accordion view
  const [expandedMobileIds, setExpandedMobileIds] = useState<Set<string>>(new Set());

  // Collapsible transcript state inside detail view
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true);

  // Collapsible doctor prompt state
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  // Download notification toast
  const [downloadToast, setDownloadToast] = useState<{
    message: string;
    isError?: boolean;
  } | null>(null);

  // Copied reference code state
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Synchronize theme on mount
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
    } catch {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
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

  // Fetch consultations from database API
  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/save-consultation');
      if (!res.ok) {
        throw new Error(`Failed to load consultations: ${res.statusText}`);
      }
      const data = await res.json();
      if (Array.isArray(data.consultations)) {
        setRecords(data.consultations);
        setDataSource(data.source || 'unknown');
        // Auto-select first record on desktop if none selected
        if (data.consultations.length > 0) {
          setSelectedId((prev) => prev || data.consultations[0].id);
          // Auto-expand the first record on mobile as well
          setExpandedMobileIds(new Set([data.consultations[0].id]));
        }
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      console.error('Error fetching consultation records:', err);
      setErrorMessage(err?.message || 'Failed to load consultation records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return filterConsultations(records, searchQuery, filterMode);
  }, [records, searchQuery, filterMode]);

  // Overall database statistics
  const stats = useMemo(() => {
    return getConsultationStats(records);
  }, [records]);

  // Currently selected record for desktop detail view
  const selectedRecord = useMemo(() => {
    if (!selectedId) return filteredRecords[0] || null;
    return records.find((r) => r.id === selectedId) || filteredRecords[0] || null;
  }, [selectedId, records, filteredRecords]);

  // Toggle mobile accordion item
  const toggleMobileAccordion = (id: string) => {
    setExpandedMobileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle PDF Download
  const handleDownloadPdf = (prescription?: PrescriptionData) => {
    if (!prescription) return;
    const result = triggerPrescriptionDownload(prescription, true);
    if (result.success) {
      setDownloadToast({
        message: `Prescription PDF (${result.fileName}) downloaded successfully!`,
      });
      setTimeout(() => setDownloadToast(null), 4000);
    } else {
      setDownloadToast({
        message: result.error || 'Failed to download prescription PDF.',
        isError: true,
      });
      setTimeout(() => setDownloadToast(null), 5000);
    }
  };

  // Handle copy reference code
  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 2500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 font-sans selection:bg-teal-500/20 selection:text-teal-900 dark:selection:text-teal-300 transition-colors duration-200">
      {/* Top Clinical Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-neutral-800/80 bg-white/95 dark:bg-[#09090b]/90 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  DoctoMPT
                </h1>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  Virtual Clinic
                </span>
                <span className="hidden md:inline text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  EMR Archive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 hidden sm:block">
                Dr. DoctoMPT - Patient Records, Dialogue & Digital Prescription Archive
              </p>
            </div>
          </Link>

          {/* Top Right Controls: Live Consultation Link + Sun/Moon Theme Toggle + Hamburger Menu */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live Consultation Link */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/80 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-all cursor-pointer shadow-xs text-xs font-semibold"
              title="Return to Live Doctor Consultation"
            >
              <PhoneCall className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden sm:inline">Live Consultation</span>
            </Link>

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
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 hover:border-teal-500/40 transition-all cursor-pointer shadow-xs"
              title="Open Clinical Controls & Records Summary"
              aria-label="Open clinical navigation menu"
            >
              <Menu className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-semibold">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Side Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-84 sm:w-96 bg-white dark:bg-[#121215] border-l border-slate-200 dark:border-neutral-800 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Clinical Records & EMR
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* Quick Navigation Section */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Navigation
            </label>
            <div className="space-y-1.5">
              <Link
                href="/"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors flex items-center justify-between group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-neutral-200 block">
                      Live Voice Consultation
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Real-time interactive session with Dr. DoctoMPT
                    </span>
                  </div>
                </div>
                <span className="text-xs text-teal-600 dark:text-teal-400 font-bold group-hover:underline">
                  Visit &rarr;
                </span>
              </Link>

              <div className="w-full p-3 rounded-xl border border-teal-300 dark:border-teal-500/40 bg-teal-50/60 dark:bg-teal-950/30 text-left flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                  <div>
                    <span className="font-semibold text-teal-950 dark:text-teal-200 block">
                      Patient Records Portal (/records)
                    </span>
                    <span className="text-[11px] text-teal-700/80 dark:text-teal-400/80">
                      Currently viewing database & prescriptions
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-200/60 dark:bg-teal-800/60 text-teal-900 dark:text-teal-200">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Database Summary Statistics */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Database Metrics
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                  Total Consultations
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {stats.totalConsultations}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                  Prescriptions Issued
                </span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {stats.totalPrescriptions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                  Prescribed Medicines
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalMedications}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800">
                <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                  Unique Patients
                </span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.uniquePatients}
                </span>
              </div>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold tracking-wider uppercase text-slate-500 dark:text-neutral-400 block">
              Database Sync
            </label>
            <button
              type="button"
              onClick={() => {
                fetchRecords();
                setIsDrawerOpen(false);
              }}
              disabled={isLoading}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Records from Database</span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Source: <span className="font-semibold text-slate-700 dark:text-neutral-300">{dataSource === 'supabase' ? 'Supabase SQL Database' : 'Dual Local Database'}</span>
            </p>
          </div>

          {/* Architecture Badge */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 text-[11px] text-slate-500 dark:text-neutral-400 space-y-1">
            <div className="flex justify-between">
              <span>EMR Engine:</span>
              <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span>PDF Engine:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">jsPDF + Mrs Saint Delafield</span>
            </div>
            <div className="flex justify-between">
              <span>Signature:</span>
              <span className="font-semibold text-slate-700 dark:text-neutral-300">Dr. DoctoMPT Verified</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Floating Download Toast */}
      {downloadToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-md p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-fade-in transition-all ${
            downloadToast.isError
              ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          {downloadToast.isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{downloadToast.message}</span>
          <button
            type="button"
            onClick={() => setDownloadToast(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 dark:text-neutral-400 dark:hover:text-white"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-5">
        {/* Top Control Bar: Title, Search, Filter Pills & Stats */}
        <section className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Electronic Health Records & Patient Consultations
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                Full relational consultation transcripts, AI doctor clinical assessments, and official prescriptions.
              </p>
            </div>

            {/* Quick Metrics & Refresh Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-medium text-slate-600 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                <span className="font-bold text-slate-900 dark:text-white">{filteredRecords.length}</span> of {records.length} Records
              </span>
              <button
                type="button"
                onClick={fetchRecords}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-700 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                title="Refresh database records"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Filter Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient name, condition, chief complaint, symptom, Rx reference, IP..."
                className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-800 dark:text-neutral-200 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  filterMode === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                }`}
              >
                All Records ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('with-rx')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  filterMode === 'with-rx'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Pill className="w-3 h-3" />
                <span>With Prescription ({stats.totalPrescriptions})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('without-rx')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  filterMode === 'without-rx'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                }`}
              >
                Triage Only ({records.length - stats.totalPrescriptions})
              </button>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Loading Patient Health Records...
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Querying consultations, dialogue transcripts, and prescriptions.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <p className="font-semibold">Unable to fetch records</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={fetchRecords}
              className="ml-auto px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && filteredRecords.length === 0 && (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400 dark:text-neutral-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {searchQuery ? 'No matching patient records found' : 'No consultation records available'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md">
              {searchQuery
                ? `No consultations match "${searchQuery}". Try modifying your search query or switching filters.`
                : 'Start a live consultation with Dr. DoctoMPT from the home page. Consultations and prescriptions will automatically appear here.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Clear Search & Filters
              </button>
            ) : (
              <Link
                href="/"
                className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Start Live Consultation</span>
              </Link>
            )}
          </div>
        )}

        {/* Content Views: Desktop Split View vs Mobile Accordion View */}
        {!isLoading && !errorMessage && filteredRecords.length > 0 && (
          <>
            {/* ============================================================== */}
            {/* DESKTOP VIEW (Visible on lg and larger screens)                */}
            {/* Master-Detail Two Column Split Layout                          */}
            {/* ============================================================== */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Patients List (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400 px-1">
                  <span>Patients ({filteredRecords.length})</span>
                  <span>Select to inspect</span>
                </div>

                <div className="space-y-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                  {filteredRecords.map((item) => {
                    const isSelected = selectedRecord?.id === item.id;
                    const dateInfo = formatConsultationDate(item.createdAt);
                    const medCount = item.prescription?.medications?.length || 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`p-4 rounded-xl border text-xs cursor-pointer transition-all shadow-xs flex flex-col gap-2.5 ${
                          isSelected
                            ? 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-500 dark:border-teal-500/80 ring-2 ring-teal-500/20'
                            : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 hover:bg-slate-50/50 dark:hover:bg-neutral-800/50'
                        }`}
                      >
                        {/* Header: Name, Age, Date */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isSelected
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                              }`}
                            >
                              {(item.patientName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {item.patientName || 'Demo Patient'}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                                {item.patientAge || 'Age not specified'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 dark:text-neutral-400 block font-mono">
                              {dateInfo.formattedDate}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-neutral-500 block font-mono">
                              {dateInfo.formattedTime}
                            </span>
                          </div>
                        </div>

                        {/* Primary Condition Chip */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[10px] font-semibold text-teal-700 dark:text-teal-300 line-clamp-1">
                            {item.primaryCondition || item.chiefComplaint || 'General Consultation'}
                          </span>
                          {medCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                              <Pill className="w-2.5 h-2.5" />
                              <span>{medCount} Meds</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-[10px] text-slate-500 dark:text-neutral-400">
                              Triage Only
                            </span>
                          )}
                        </div>

                        {/* Dialogue preview snippet */}
                        <p className="text-slate-600 dark:text-neutral-400 text-[11px] line-clamp-2">
                          {item.transcript && item.transcript.length > 0
                            ? item.transcript.find((t) => t.role === 'patient')?.text || item.transcript[0].text
                            : 'No dialogue summary recorded'}
                        </p>

                        {/* Footer tags */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-[10px] text-slate-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            {item.transcript?.length || 0} turns
                          </span>
                          {item.clientIp && (
                            <span className="font-mono text-slate-400 dark:text-neutral-500">
                              IP: {item.clientIp}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Full Patient Details (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {selectedRecord ? (
                  <>
                    {/* Card 1: Patient Header & Metadata Overview */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {selectedRecord.patientName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                              {selectedRecord.patientAge}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{selectedRecord.status || 'Completed'}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatConsultationDate(selectedRecord.createdAt).fullDateTime}</span>
                          </p>
                        </div>

                        {/* Reference code & PDF Action */}
                        <div className="flex items-center gap-2">
                          {selectedRecord.prescription && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(selectedRecord.prescription)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer"
                              title="Download Prescription PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Metadata Grid: 4 items */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-neutral-800/80 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-0.5 flex items-center gap-1">
                            <Languages className="w-3 h-3 text-teal-600" />
                            Language
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-neutral-200">
                            {selectedRecord.language || 'Doctor will understand'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-0.5 flex items-center gap-1">
                            <Volume2 className="w-3 h-3 text-teal-600" />
                            Voice Persona
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate block">
                            {selectedRecord.voiceProfile?.split(' ')[0] || 'Charon'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-0.5 flex items-center gap-1">
                            <Mic className="w-3 h-3 text-teal-600" />
                            Audio Input
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate block" title={selectedRecord.audioDevice || 'Microphone'}>
                            {selectedRecord.audioDevice || 'Default Mic'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
                          <span className="text-[10px] text-slate-500 dark:text-neutral-400 block mb-0.5 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-teal-600" />
                            Client IP
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200 truncate block">
                            {selectedRecord.clientIp || '127.0.0.1'}
                          </span>
                        </div>
                      </div>

                      {/* Reference code row */}
                      {selectedRecord.prescription?.referenceCode && (
                        <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-neutral-950 p-2 rounded-xl border border-slate-200/60 dark:border-neutral-800/60">
                          <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                            Prescription Reference: <strong className="font-mono text-slate-800 dark:text-neutral-200">{selectedRecord.prescription.referenceCode}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedRecord.prescription?.referenceCode || '')}
                            className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold cursor-pointer"
                          >
                            {copiedRef === selectedRecord.prescription?.referenceCode ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Clinical Assessment, Chief Complaint & Symptoms */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col gap-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800/80 pb-3">
                        <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                          Clinical Assessment & Symptoms Profile
                        </h4>
                      </div>

                      <div className="space-y-3 text-xs">
                        {/* Primary Condition & Chief Complaint */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                            Primary Condition / Chief Complaint:
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200/80 dark:border-neutral-800">
                            {selectedRecord.chiefComplaint || selectedRecord.primaryCondition || 'General Consultation'}
                          </p>
                        </div>

                        {/* Symptoms Tags */}
                        {Array.isArray(selectedRecord.symptoms) && selectedRecord.symptoms.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 block mb-1.5">
                              Reported Symptoms ({selectedRecord.symptoms.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedRecord.symptoms.map((symptom, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[11px] font-medium text-teal-800 dark:text-teal-300"
                                >
                                  {symptom}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Doctor Clinical Notes */}
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                            Dr. DoctoMPT Clinical Impression:
                          </span>
                          <div className="p-3.5 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 text-slate-800 dark:text-neutral-200 leading-relaxed">
                            {selectedRecord.clinicalImpression ||
                              selectedRecord.doctorNotes ||
                              'Clinical evaluation completed. Patient presented with acute symptoms evaluated via virtual triage.'}
                          </div>
                        </div>

                        {/* Doctor Persona Used (Collapsible) */}
                        {selectedRecord.clinicalPrompt && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                              className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 cursor-pointer"
                            >
                              <span>Doctor System Directive Used</span>
                              {isPromptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isPromptExpanded && (
                              <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-[11px] font-mono text-slate-600 dark:text-neutral-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {selectedRecord.clinicalPrompt}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Complete Dialogue Transcript */}
                    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200">
                            Consultation Dialogue Transcript ({selectedRecord.transcript?.length || 0} turns)
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                          className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isTranscriptExpanded ? 'Collapse' : 'Expand'}</span>
                          {isTranscriptExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {isTranscriptExpanded && (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 text-xs">
                          {selectedRecord.transcript && selectedRecord.transcript.length > 0 ? (
                            selectedRecord.transcript.map((msg, idx) => {
                              const isDoctor = msg.role === 'doctor';
                              return (
                                <div
                                  key={msg.id || idx}
                                  className={`flex gap-3 items-start ${
                                    isDoctor ? 'justify-start' : 'justify-end'
                                  }`}
                                >
                                  {isDoctor && (
                                    <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                      <Stethoscope className="w-3.5 h-3.5" />
                                    </div>
                                  )}

                                  <div
                                    className={`p-3.5 rounded-2xl max-w-[85%] flex flex-col gap-1 shadow-xs ${
                                      isDoctor
                                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/50 text-slate-800 dark:text-neutral-100'
                                        : 'bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-100'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-3 text-[10px]">
                                      <span
                                        className={`font-bold ${
                                          isDoctor ? 'text-teal-800 dark:text-teal-300' : 'text-slate-600 dark:text-neutral-300'
                                        }`}
                                      >
                                        {isDoctor ? 'Dr. DoctoMPT' : selectedRecord.patientName}
                                      </span>
                                      {msg.timestamp && (
                                        <span className="text-slate-400 dark:text-neutral-500 font-mono">
                                          {msg.timestamp}
                                        </span>
                                      )}
                                    </div>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                  </div>

                                  {!isDoctor && (
                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-neutral-700 text-slate-700 dark:text-neutral-200 flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                                      {(selectedRecord.patientName || 'P').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-neutral-400 italic text-center py-4">
                              No transcript recorded for this session.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card 4: Full Structured Prescription Card */}
                    {selectedRecord.prescription ? (
                      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-teal-500/30 dark:border-teal-500/30 shadow-md flex flex-col gap-4">
                        {/* Prescription Header */}
                        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-sm tracking-wide">
                              DOCTOMPT MEDICAL CLINIC
                            </h3>
                            <p className="text-[11px] text-slate-300">
                              Virtual Healthcare & Comprehensive Consultation Services
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold block">Dr. DoctoMPT</span>
                            <span className="text-[10px] text-slate-400 block">
                              Reg: MED-2026-DOCMPT
                            </span>
                          </div>
                        </div>

                        {/* Patient Box */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase block">
                              Patient Details
                            </span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                              {selectedRecord.prescription.patientName || selectedRecord.patientName}
                            </p>
                            <p className="text-slate-600 dark:text-neutral-400 text-[11px]">
                              Age: {selectedRecord.prescription.patientAge || selectedRecord.patientAge}
                            </p>
                            <p className="text-slate-500 dark:text-neutral-500 text-[11px]">
                              Date: {selectedRecord.prescription.date || 'Today'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase block">
                              Chief Complaint
                            </span>
                            <p className="font-medium text-slate-800 dark:text-neutral-200 mt-0.5">
                              {selectedRecord.prescription.chiefComplaint}
                            </p>
                          </div>
                        </div>

                        {/* Prescription Assessment Notes */}
                        <div className="text-xs p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-neutral-400 uppercase block mb-1">
                            Clinical Triage & Assessment
                          </span>
                          <p className="text-slate-700 dark:text-neutral-300">
                            {selectedRecord.prescription.assessmentNotes}
                          </p>
                        </div>

                        {/* Rx Section Header */}
                        <div className="flex items-center gap-2 pt-1">
                          <span
                            className="text-2xl font-bold italic text-teal-600 dark:text-teal-400 select-none"
                            style={{ fontFamily: 'Georgia, serif' }}
                          >
                            Rx
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-neutral-200 uppercase tracking-wider">
                            Prescribed Medications ({selectedRecord.prescription.medications?.length || 0})
                          </span>
                        </div>

                        {/* Medications Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
                            <thead className="bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 font-semibold">
                              <tr>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Medicine & Strength</th>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Frequency</th>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Timing</th>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Duration</th>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Indication / Reason</th>
                                <th className="p-2.5 border-b border-slate-200 dark:border-neutral-800">Instructions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/80">
                              {selectedRecord.prescription.medications?.map((rawMed, idx) => {
                                const med = normalizeMedication(rawMed);
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
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
                                    <td className="p-2.5 text-slate-700 dark:text-neutral-300 font-medium">
                                      {med.frequency}
                                    </td>
                                    <td className="p-2.5 text-slate-700 dark:text-neutral-300">
                                      {med.timing}
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-neutral-400">
                                      {med.duration}
                                    </td>
                                    <td className="p-2.5 text-slate-700 dark:text-neutral-300">
                                      {med.reason}
                                    </td>
                                    <td className="p-2.5 text-slate-600 dark:text-neutral-400 text-[11px]">
                                      {med.instructions || 'As advised'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Supportive Advice Box */}
                        {Array.isArray(selectedRecord.prescription.advice) && selectedRecord.prescription.advice.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/30 text-xs">
                            <span className="font-bold text-teal-800 dark:text-teal-300 block mb-1.5 uppercase text-[10px] tracking-wider">
                              Supportive Care & Recovery Guidance
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-neutral-300">
                              {selectedRecord.prescription.advice.map((adv, idx) => (
                                <li key={idx}>{adv}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Follow-Up Guidance */}
                        {selectedRecord.prescription.followUp && (
                          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/30 text-xs">
                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1 uppercase text-[10px] tracking-wider">
                              Follow-Up & Clinical Safety Instructions
                            </span>
                            <p className="text-slate-700 dark:text-neutral-300">
                              {selectedRecord.prescription.followUp}
                            </p>
                          </div>
                        )}

                        {/* Signature & Reference Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-neutral-800">
                          <div>
                            <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono block">
                              Ref: {selectedRecord.prescription.referenceCode || `RX-${selectedRecord.id.substring(0, 8).toUpperCase()}`}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Clinic: DOCTOMPT MEDICAL CLINIC
                            </span>
                          </div>

                          <div className="text-right">
                            <div
                              className="text-2xl text-teal-700 dark:text-teal-400 font-normal leading-none select-none"
                              style={{ fontFamily: "'Mrs Saint Delafield', cursive" }}
                            >
                              Dr. DoctoMPT
                            </div>
                            <span className="text-[10px] text-slate-600 dark:text-neutral-400 font-semibold block mt-1 flex items-center gap-1 justify-end">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              <span>Verified Digital Signature</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(selectedRecord.prescription)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download Official Prescription (PDF)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center flex flex-col items-center justify-center gap-2 text-xs">
                        <Pill className="w-6 h-6 text-slate-400 dark:text-neutral-600" />
                        <span className="font-semibold text-slate-700 dark:text-neutral-300">
                          Triage Consultation - No Prescription Issued
                        </span>
                        <p className="text-slate-500 dark:text-neutral-500 max-w-sm">
                          This session recorded conversational triage dialogue without generating a pharmacological prescription.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-center flex flex-col items-center justify-center gap-2">
                    <User className="w-8 h-8 text-slate-400 dark:text-neutral-600" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      Select a patient record to view clinical details
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* MOBILE / PHONE VIEW (Visible on screens below lg)              */}
            {/* Clean Single-Column Accordion Layout                           */}
            {/* ============================================================== */}
            <div className="block lg:hidden space-y-3">
              {filteredRecords.map((item) => {
                const isExpanded = expandedMobileIds.has(item.id);
                const dateInfo = formatConsultationDate(item.createdAt);
                const medCount = item.prescription?.medications?.length || 0;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all"
                  >
                    {/* Collapsible Card Header */}
                    <button
                      type="button"
                      onClick={() => toggleMobileAccordion(item.id)}
                      className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                          {(item.patientName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {item.patientName}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                              ({item.patientAge})
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[10px] font-semibold text-teal-700 dark:text-teal-300 line-clamp-1">
                              {item.primaryCondition || item.chiefComplaint || 'Consultation'}
                            </span>
                            {medCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <Pill className="w-2.5 h-2.5" />
                                <span>{medCount} Meds</span>
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-[10px] text-slate-500 dark:text-neutral-400">
                                Triage
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{dateInfo.fullDateTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Collapsible Card Body */}
                    {isExpanded && (
                      <div className="p-4 pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-4 text-xs">
                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800">
                            <span className="text-slate-500 dark:text-neutral-500 block text-[10px]">Language:</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200">
                              {item.language || 'Doctor will understand'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800">
                            <span className="text-slate-500 dark:text-neutral-500 block text-[10px]">Voice Persona:</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200">
                              {item.voiceProfile?.split(' ')[0] || 'Charon'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800">
                            <span className="text-slate-500 dark:text-neutral-500 block text-[10px]">Client IP:</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-neutral-200">
                              {item.clientIp || '127.0.0.1'}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-950 border border-slate-200/60 dark:border-neutral-800">
                            <span className="text-slate-500 dark:text-neutral-500 block text-[10px]">Audio Device:</span>
                            <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate block">
                              {item.audioDevice || 'Microphone'}
                            </span>
                          </div>
                        </div>

                        {/* Symptoms */}
                        {Array.isArray(item.symptoms) && item.symptoms.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 block mb-1">
                              Symptoms:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.symptoms.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-[10px] text-teal-800 dark:text-teal-300"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Clinical Impression */}
                        <div className="p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40">
                          <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase block mb-1">
                            Dr. DoctoMPT Clinical Impression
                          </span>
                          <p className="text-slate-800 dark:text-neutral-200 leading-relaxed text-[11px]">
                            {item.clinicalImpression || item.doctorNotes || 'Evaluation completed.'}
                          </p>
                        </div>

                        {/* Transcript Accordion Sub-section */}
                        {item.transcript && item.transcript.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider block">
                              Dialogue Transcript ({item.transcript.length} turns)
                            </span>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {item.transcript.map((msg, idx) => {
                                const isDoctor = msg.role === 'doctor';
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl text-[11px] ${
                                      isDoctor
                                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-slate-800 dark:text-neutral-100'
                                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                                      <span className={isDoctor ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-neutral-300'}>
                                        {isDoctor ? 'Dr. DoctoMPT' : item.patientName}
                                      </span>
                                      {msg.timestamp && (
                                        <span className="text-slate-400 font-mono text-[9px]">{msg.timestamp}</span>
                                      )}
                                    </div>
                                    <p className="leading-snug">{msg.text}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Structured Prescription section on Mobile */}
                        {item.prescription && (
                          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-neutral-800">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs uppercase tracking-wide text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-teal-600" />
                                Prescribed Medications ({item.prescription.medications?.length || 0})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(item.prescription)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF</span>
                              </button>
                            </div>

                            {/* Mobile Medications Cards */}
                            <div className="space-y-2">
                              {item.prescription.medications?.map((rawMed, idx) => {
                                const med = normalizeMedication(rawMed);
                                return (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {med.brandName || med.name}
                                      </span>
                                      <span className="font-mono text-teal-600 dark:text-teal-400 text-[10px]">
                                        {med.dosage}
                                      </span>
                                    </div>
                                    {med.genericName && (
                                      <span className="text-slate-500 dark:text-neutral-400 block text-[10px]">
                                        Generic: {med.genericName}
                                      </span>
                                    )}
                                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 dark:text-neutral-400 pt-1 border-t border-slate-100 dark:border-neutral-900">
                                      <span>Freq: {med.frequency}</span>
                                      <span>Time: {med.timing}</span>
                                      <span>Duration: {med.duration}</span>
                                      <span>Reason: {med.reason}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Digital Signature on Mobile */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-neutral-800/80">
                              <span className="text-[10px] font-mono text-slate-400">
                                {item.prescription.referenceCode || 'RX-VERIFIED'}
                              </span>
                              <div className="text-right">
                                <div
                                  className="text-xl text-teal-700 dark:text-teal-400 font-normal leading-none"
                                  style={{ fontFamily: "'Mrs Saint Delafield', cursive" }}
                                >
                                  Dr. DoctoMPT
                                </div>
                                <span className="text-[9px] text-slate-500 dark:text-neutral-400 font-semibold block mt-0.5">
                                  Verified Digital Signature
                                </span>
                              </div>
                            </div>

                            {/* Full-width Download PDF Button on Mobile */}
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(item.prescription)}
                              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Official Prescription PDF</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
