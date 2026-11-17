# DoctoMPT - Dr. DoctoMPT Medical Consultation & Prescription Platform

A minimal, low-latency two-model Medical Consultation & Prescription web application built with **Next.js (App Router, TypeScript, Tailwind CSS)**, the official **`@google/genai`** SDK, and **Strictly Bun Runtime**.

---

## Architecture Overview (Two Gemini Models Working Together)

```
                     ┌────────────────────────────────────────┐
                     │          User (Browser / Mic)          │
                     └──────────────────┬─────────────────────┘
                                        │
                         16kHz Audio    │   24kHz Audio
                          Streaming     │    Streaming
                                        ▼
             ┌────────────────────────────────────────────────────────┐
             │       Model 1: Voice Consultation (gemini-3.8-live)    │
             │   - WebSocket bidirectional low-latency audio stream    │
             │   - Barge-in interruption handling                     │
             │   - Live input & output audio transcription            │
             │   - Empathetic triage doctor roleplay persona          │
             └──────────────────────────┬─────────────────────────────┘
                                        │
                               Live Transcript
                                        │
                                        ▼
             ┌────────────────────────────────────────────────────────┐
             │    Model 2: Prescription Generator (gemini-3.5-flash-lite)
             │   - Structured Output (responseSchema JSON)            │
             │   - Extracts Patient Name, Age, Symptoms, Complaint    │
             │   - Formulates 2–4 medications with:                   │
             │       * Strength / Dosage (e.g., 500mg, 100mg)         │
             │       * Frequency & Timing (e.g., 3x daily, after food)│
             │       * Duration & Medical Reason                      │
             │   - Renders authentic downloadable PDF (jsPDF)         │
             └──────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
             ┌────────────────────────────────────────────────────────┐
             │            NoSQL Document Store / Cloud Firestore      │
             │   - Documented schema with valid Security Rules        │
             │   - Stores consultation sessions & generated Rx        │
             └────────────────────────────────────────────────────────┘
```

1. **Model 1 — Voice Consultation (`gemini-3.8-live`):** Conducts real-time, low-latency spoken doctor-patient triage roleplay over WebSockets. Uses short-lived ephemeral tokens from `/api/live-token` so `GEMINI_API_KEY` is never exposed to the client. Features barge-in interruption handling (doctor halts speech immediately when user talks) and live bi-directional audio transcription.
2. **Model 2 — Prescription Generator (`gemini-3.5-flash-lite`):** Takes captured conversation transcripts, extracts structured patient information (name, age, clinical complaint), and generates structured JSON prescriptions with complete medication regimens (dosage, timing relative to food, duration, and clinical reason).
3. **Reactive SVG Doctor Avatar:** An interactive doctor illustration with states for `idle`, `listening`, `speaking` (mouth dynamically opens and closes synced to speech amplitude), and `writing` (clipboard writing animation when generating Rx).
4. **Client-Side PDF Prescription Generator (`jspdf`):** Formats professional clinical prescriptions with warning banners, medication tables, lifestyle care advice, and digital verification signatures.
5. **NoSQL Database Storage (`firestore.rules` & `/api/save-consultation`):** Stores consultation records and transcripts with validated Firestore security rules.

---

## CRITICAL RUNTIME: Bun Only

This project strictly uses **Bun**. Do not use `npm`, `npx`, `yarn`, `pnpm`, or `node`.

### Prerequisites

Verify that `bun` is installed:
```bash
bun --version
```

If not installed:
- **Windows (PowerShell):**
  ```powershell
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```
- **Linux / macOS:**
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```

---

## Quick Start (Bun Only)

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Gemini API Key
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Edit `.env.local` and add your Gemini API Key from [Google AI Studio](https://aistudio.google.com/apikey):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: You can also enter or override your API key directly in the web UI settings drawer!)*

### 3. Run Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Bun Scripts

- **Development:** `bun run dev` (starts Next.js on Bun runtime)
- **Typecheck:** `bun run typecheck` (`bunx tsc --noEmit`)
- **Unit & Integration Tests:** `bun test`
- **Production Build:** `bun run build` (`bun --bun next build`)
- **Production Start:** `bun run start`

---

## Security & Firestore Rules

Production-grade prototype Firestore security rules are defined in [`firestore.rules`](./firestore.rules) conforming to the Validator Function Pattern:
- Strict document schema validation for collection `consultations/{consultationId}`.
- Immutable creation timestamps and bounded transcript sizes.
- Default-deny rules for unmapped paths.

---

## Clinical Note

Consultation sessions and prescriptions are managed with Dr. DoctoMPT virtual clinical consultation services.
