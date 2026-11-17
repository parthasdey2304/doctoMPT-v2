import { test, expect, describe } from 'bun:test';
import {
  DEFAULT_DOCTOR_SYSTEM_INSTRUCTION,
  DEFAULT_DOCTOR_VOICE,
  AVAILABLE_VOICES,
  CONSULTATION_LANGUAGES,
  getLanguageInstruction,
  buildSystemInstructionWithLanguage,
  getGreetingPrompt,
  getSimulatedGreeting,
  shouldAutoTriggerRx,
} from '../lib/constants';

describe('Doctor Consultation Flow & Protocol Guidelines', () => {
  test('DEFAULT_DOCTOR_VOICE is configured to mature male doctor (Charon)', () => {
    expect(DEFAULT_DOCTOR_VOICE).toBe('Charon');
    const charonVoice = AVAILABLE_VOICES.find((v) => v.id === 'Charon');
    expect(charonVoice).toBeDefined();
    expect(charonVoice?.label.toLowerCase()).toContain('male');
  });

  test('DEFAULT_DOCTOR_SYSTEM_INSTRUCTION contains name/age greeting prompt requirement', () => {
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain('Dr. DoctoMPT');
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION.toLowerCase()).toContain('name and age');
  });

  test('DEFAULT_DOCTOR_SYSTEM_INSTRUCTION contains explicit wrap-up questions and Rx offer', () => {
    // 1. Must ask for other symptoms / health issues
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain(
      "Do you have any other symptoms or health issues you'd like to discuss?"
    );
    // 2. Must ask if patient wants the prescription prepared
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain(
      'Would you like me to prepare your medical prescription now?'
    );
  });

  test('CONSULTATION_LANGUAGES has exactly 4 options with required labels', () => {
    expect(CONSULTATION_LANGUAGES.length).toBe(4);
    const labels = CONSULTATION_LANGUAGES.map((l) => l.label);
    expect(labels).toContain('Doctor will understand');
    expect(labels).toContain('English');
    expect(labels).toContain('Hinglish');
    expect(labels).toContain('Benglish');
  });

  test('getLanguageInstruction generates appropriate directives for each language option', () => {
    const autoDirective = getLanguageInstruction('auto');
    expect(autoDirective).toContain('Multilingual auto-detection enabled');
    expect(autoDirective).toContain('English, Hindi, Bengali, Hinglish, or Benglish');

    const enDirective = getLanguageInstruction('en');
    expect(enDirective).toContain('exclusively in clear, warm, and professional English');

    const hinglishDirective = getLanguageInstruction('hinglish');
    expect(hinglishDirective).toContain('Hinglish');
    expect(hinglishDirective).toContain('Hindi and English');

    const benglishDirective = getLanguageInstruction('benglish');
    expect(benglishDirective).toContain('Benglish');
    expect(benglishDirective).toContain('Bengali and English');
  });

  test('buildSystemInstructionWithLanguage correctly appends and replaces directives without duplicates', () => {
    const base = 'You are Dr. DoctoMPT.';
    const withHinglish = buildSystemInstructionWithLanguage(base, 'hinglish');
    expect(withHinglish).toContain('You are Dr. DoctoMPT.');
    expect(withHinglish).toContain('Hinglish');

    // Switch to Benglish — previous Hinglish directive must be replaced, not stacked
    const withBenglish = buildSystemInstructionWithLanguage(withHinglish, 'benglish');
    expect(withBenglish).toContain('You are Dr. DoctoMPT.');
    expect(withBenglish).toContain('Benglish');
    expect(withBenglish).not.toContain('Hinglish');
  });

  describe('Greeting Prompts & Simulated Intro in All 4 Languages', () => {
    test('getGreetingPrompt targets correct language for live WebSocket connect', () => {
      expect(getGreetingPrompt('hinglish')).toContain('Hinglish');
      expect(getGreetingPrompt('benglish')).toContain('Benglish');
      expect(getGreetingPrompt('en')).toContain('clear English');
      expect(getGreetingPrompt('auto')).toContain('name and age');
    });

    test('getSimulatedGreeting returns language-appropriate introductory phrases', () => {
      const hinglishSim = getSimulatedGreeting('hinglish');
      expect(hinglishSim).toContain('Namaste');
      expect(hinglishSim).toContain('Dr. DoctoMPT');
      expect(hinglishSim).toContain('naam aur age');

      const benglishSim = getSimulatedGreeting('benglish');
      expect(benglishSim).toContain('Nomoshkar');
      expect(benglishSim).toContain('Dr. DoctoMPT');
      expect(benglishSim).toContain('naam ebong boyosh');

      const enSim = getSimulatedGreeting('en');
      expect(enSim).toContain('Hello, I am Dr. DoctoMPT');
      expect(enSim).toContain('name and your age');

      const autoSim = getSimulatedGreeting('auto');
      expect(autoSim).toContain('Hello, I am Dr. DoctoMPT');
    });
  });

  describe('Auto-Rx Generation Trigger Detector Logic (shouldAutoTriggerRx)', () => {
    test('triggers when doctor offers prescription and patient says yes please', () => {
      const transcript = [
        {
          role: 'doctor' as const,
          text: 'Understood. Would you like me to prepare your medical prescription now?',
        },
        { role: 'patient' as const, text: 'Yes please' },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(true);
    });

    test('triggers when patient confirms with sure / please do / okay', () => {
      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Do you need the prescription now?',
          },
          { role: 'patient', text: 'Sure, please do!' },
        ])
      ).toBe(true);

      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Shall I prepare your prescription?',
          },
          { role: 'patient', text: 'Yes doctor, thank you.' },
        ])
      ).toBe(true);
    });

    test('triggers with Hinglish affirmations (haan, haanji, theek hai, bilkul)', () => {
      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Would you like me to prepare your medical prescription now?',
          },
          { role: 'patient', text: 'Haanji please doctor, bana dijiye' },
        ])
      ).toBe(true);

      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Kya main aapka prescription prepare kar doon?',
          },
          { role: 'patient', text: 'Haan please' },
        ])
      ).toBe(true);

      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Kya aapko prescription chahiye?',
          },
          { role: 'patient', text: 'Bilkul' },
        ])
      ).toBe(true);
    });

    test('triggers with Benglish affirmations (thik ache, hae, nishchoi)', () => {
      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Apni ki chan ami apnar medical prescription ta ekhon prepare kori?',
          },
          { role: 'patient', text: 'Thik ache please' },
        ])
      ).toBe(true);

      expect(
        shouldAutoTriggerRx([
          {
            role: 'doctor',
            text: 'Apnar ki prescription lagbe?',
          },
          { role: 'patient', text: 'Hae please' },
        ])
      ).toBe(true);
    });

    test('triggers when patient directly requests prescription generation', () => {
      const transcript = [
        { role: 'doctor' as const, text: 'Take Dolo 650 twice a day.' },
        {
          role: 'patient' as const,
          text: 'Please make the prescription and download it in pdf.',
        },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(true);
    });

    test('triggers when doctor confirms prescription is being prepared', () => {
      const transcript = [
        { role: 'patient' as const, text: 'I am all done.' },
        {
          role: 'doctor' as const,
          text: 'Certainly! I am preparing and downloading your medical prescription right now.',
        },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(true);
    });

    test('handles lookback when doctor offered prescription 2 turns ago', () => {
      const transcript = [
        {
          role: 'doctor' as const,
          text: 'Would you like me to prepare your medical prescription now?',
        },
        { role: 'patient' as const, text: 'One second' },
        { role: 'doctor' as const, text: 'Take your time.' },
        { role: 'patient' as const, text: 'Yes please, generate it.' },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(true);
    });

    test('does NOT trigger when patient says yes to general clinical question', () => {
      const transcript = [
        { role: 'doctor' as const, text: 'Have you had a high fever for two days?' },
        { role: 'patient' as const, text: 'Yes, around 101 degrees.' },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(false);
    });

    test('does NOT trigger when doctor asks for other symptoms and patient says no', () => {
      const transcript = [
        {
          role: 'doctor' as const,
          text: "Do you have any other symptoms or health issues you'd like to discuss?",
        },
        { role: 'patient' as const, text: 'No, nothing else doctor.' },
      ];
      expect(shouldAutoTriggerRx(transcript)).toBe(false);
    });

    test('returns false for empty or single-turn transcripts', () => {
      expect(shouldAutoTriggerRx([])).toBe(false);
      expect(shouldAutoTriggerRx([{ role: 'doctor', text: 'Hello' }])).toBe(false);
    });
  });
});
