import { test, expect, describe } from 'bun:test';
import {
  filterConsultations,
  getConsultationStats,
  formatConsultationDate,
  resolveSelectedConsultation,
  triggerPrescriptionDownload,
} from '../lib/records-utils';
import { SavedConsultation, PrescriptionData } from '../types/consultation';
import { generatePrescriptionPdf } from '../lib/prescription-pdf';

describe('Records Route & EMR Archive Utilities', () => {
  const sampleRecords: SavedConsultation[] = [
    {
      id: 'cons-1',
      createdAt: '2026-11-17T19:40:00.000Z',
      patientName: 'Khushi Kumari',
      patientAge: '21 years',
      primaryCondition: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      chiefComplaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      symptoms: [
        'Elevated body temperature / fever',
        'Sore throat and respiratory irritation',
        'Body ache',
        'Fatigue',
      ],
      clinicalImpression:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome. Stable vitals.',
      doctorNotes:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome. Stable vitals.',
      clinicalPrompt: 'You are Dr. DoctoMPT, an empathetic clinician.',
      language: 'Doctor will understand',
      voiceProfile: 'Charon (Mature, Calm Male Doctor)',
      audioDevice: 'Default Microphone',
      clientIp: '103.21.244.15',
      userAgent: 'Mozilla/5.0 Chrome/131.0.0.0',
      status: 'completed',
      transcript: [
        { id: 't1', role: 'doctor', text: 'Hello, I am Dr. DoctoMPT. How may I help you today?', timestamp: '19:40' },
        { id: 't2', role: 'patient', text: 'Hi doctor, I have a high fever and sore throat since yesterday.', timestamp: '19:40' },
        { id: 't3', role: 'doctor', text: 'How high is your temperature, and do you feel pain while swallowing?', timestamp: '19:41' },
        { id: 't4', role: 'patient', text: 'Swallowing is painful and temperature reached 101F.', timestamp: '19:41' },
      ],
      prescription: {
        patientName: 'Khushi Kumari',
        patientAge: '21 years',
        date: '2026-11-17',
        chiefComplaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
        assessmentNotes: 'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome.',
        advice: [
          'Ensure 8 to 10 hours of uninterrupted bed rest',
          'Stay thoroughly hydrated with warm fluids and electrolytes',
        ],
        followUp: 'Return if fever exceeds 102F or persists past 48 hours.',
        referenceCode: 'RX-MWL3FWAQ',
        doctorName: 'Dr. DoctoMPT',
        clinicName: 'DOCTOMPT MEDICAL CLINIC',
        medications: [
          {
            name: 'Dolo 650',
            brandName: 'Dolo 650',
            genericName: 'Paracetamol',
            dosage: '650mg',
            frequency: '3 times a day',
            timing: 'After meals',
            duration: '3 to 5 days',
            reason: 'For reducing fever and body aches',
            instructions: 'Take with full glass of water',
          },
          {
            name: 'Zyrtec 10',
            brandName: 'Zyrtec 10',
            genericName: 'Cetirizine Hydrochloride',
            dosage: '10mg',
            frequency: '1 time a day',
            timing: 'At bedtime',
            duration: '5 days',
            reason: 'For throat irritation and sneezing',
            instructions: 'May cause drowsiness',
          },
        ],
      },
    },
    {
      id: 'cons-2',
      createdAt: '2026-11-16T14:15:00.000Z',
      patientName: 'David Miller',
      patientAge: '45 years',
      primaryCondition: 'Acute Lumbar Muscular Strain',
      chiefComplaint: 'Lower back stiffness and pain after lifting heavy boxes',
      symptoms: ['Lower back pain', 'Lumbar stiffness'],
      clinicalImpression: 'Mechanical back pain without radiculopathy.',
      doctorNotes: 'Mechanical back pain without radiculopathy.',
      language: 'English',
      voiceProfile: 'Fenrir (Deep, Authoritative Male)',
      audioDevice: 'External USB Mic',
      clientIp: '198.51.100.42',
      userAgent: 'Mozilla/5.0 Safari/605.1.15',
      status: 'completed',
      transcript: [
        { id: 't1', role: 'patient', text: 'I lifted furniture yesterday and my lower back seized up.', timestamp: '14:15' },
        { id: 't2', role: 'doctor', text: 'Rest your back and apply warm compresses.', timestamp: '14:16' },
      ],
      // No prescription generated (triage only)
    },
    {
      id: 'cons-3',
      createdAt: '2026-11-15T10:00:00.000Z',
      patientName: 'Amina Khan',
      patientAge: '32 years',
      primaryCondition: 'Acute Migraine with Photophobia',
      chiefComplaint: 'Unilateral throbbing headache with nausea',
      symptoms: ['Headache', 'Photophobia', 'Nausea'],
      clinicalImpression: 'Classic migraine presentation.',
      doctorNotes: 'Prescribed NSAID and anti-emetic. Advised dark room rest.',
      language: 'Hinglish',
      voiceProfile: 'Aoede (Breeze - Crisp Female)',
      audioDevice: 'AirPods Pro',
      clientIp: '203.0.113.88',
      userAgent: 'Mozilla/5.0 Firefox/133.0',
      status: 'completed',
      transcript: [
        { id: 't1', role: 'patient', text: 'Sir mere sar mein bohot tez dard hai subah se.', timestamp: '10:00' },
        { id: 't2', role: 'doctor', text: 'Kya roshni se dard badh raha hai?', timestamp: '10:01' },
      ],
      prescription: {
        patientName: 'Amina Khan',
        patientAge: '32 years',
        date: '2026-11-15',
        chiefComplaint: 'Unilateral throbbing headache with nausea',
        assessmentNotes: 'Acute migraine attack, mild to moderate.',
        advice: ['Rest in a quiet, dark room', 'Avoid caffeine and bright phone screens'],
        followUp: 'Consult a neurologist if headache frequency exceeds twice weekly.',
        referenceCode: 'RX-AMINA32M',
        doctorName: 'Dr. DoctoMPT',
        clinicName: 'DOCTOMPT MEDICAL CLINIC',
        medications: [
          {
            name: 'Naproxen',
            brandName: 'Naprosyn 500',
            genericName: 'Naproxen',
            dosage: '500mg',
            frequency: 'Twice daily as needed',
            timing: 'With food',
            duration: '2 to 3 days',
            reason: 'For migraine pain relief',
            instructions: 'Do not take on an empty stomach',
          },
        ],
      },
    },
  ];

  describe('Search & Filter Logic (filterConsultations)', () => {
    test('returns empty array when records input is empty or invalid', () => {
      expect(filterConsultations([])).toEqual([]);
      expect(filterConsultations(null as any)).toEqual([]);
      expect(filterConsultations(undefined as any)).toEqual([]);
    });

    test('returns all records when query is empty and mode is "all"', () => {
      const result = filterConsultations(sampleRecords, '', 'all');
      expect(result.length).toBe(3);
    });

    test('filters exclusively by "with-rx" filter mode', () => {
      const result = filterConsultations(sampleRecords, '', 'with-rx');
      expect(result.length).toBe(2);
      expect(result.every((r) => r.prescription !== undefined)).toBe(true);
      expect(result.map((r) => r.patientName)).toEqual(['Khushi Kumari', 'Amina Khan']);
    });

    test('filters exclusively by "without-rx" (triage only) filter mode', () => {
      const result = filterConsultations(sampleRecords, '', 'without-rx');
      expect(result.length).toBe(1);
      expect(result[0].patientName).toBe('David Miller');
      expect(result[0].prescription).toBeUndefined();
    });

    test('searches case-insensitively by patient name', () => {
      const result1 = filterConsultations(sampleRecords, 'khushi', 'all');
      expect(result1.length).toBe(1);
      expect(result1[0].patientName).toBe('Khushi Kumari');

      const result2 = filterConsultations(sampleRecords, 'DAVID', 'all');
      expect(result2.length).toBe(1);
      expect(result2[0].patientName).toBe('David Miller');
    });

    test('searches by condition or chief complaint', () => {
      const feverResult = filterConsultations(sampleRecords, 'fever', 'all');
      expect(feverResult.length).toBe(1);
      expect(feverResult[0].patientName).toBe('Khushi Kumari');

      const migraineResult = filterConsultations(sampleRecords, 'migraine', 'all');
      expect(migraineResult.length).toBe(1);
      expect(migraineResult[0].patientName).toBe('Amina Khan');
    });

    test('searches by reported symptoms in array', () => {
      const symptomResult = filterConsultations(sampleRecords, 'photophobia', 'all');
      expect(symptomResult.length).toBe(1);
      expect(symptomResult[0].patientName).toBe('Amina Khan');

      const backResult = filterConsultations(sampleRecords, 'lumbar stiffness', 'all');
      expect(backResult.length).toBe(1);
      expect(backResult[0].patientName).toBe('David Miller');
    });

    test('searches by client IP address and user agent', () => {
      const ipResult = filterConsultations(sampleRecords, '103.21.244.15', 'all');
      expect(ipResult.length).toBe(1);
      expect(ipResult[0].patientName).toBe('Khushi Kumari');

      const uaResult = filterConsultations(sampleRecords, 'Firefox', 'all');
      expect(uaResult.length).toBe(1);
      expect(uaResult[0].patientName).toBe('Amina Khan');
    });

    test('searches by consultation language and voice persona', () => {
      const langResult = filterConsultations(sampleRecords, 'Hinglish', 'all');
      expect(langResult.length).toBe(1);
      expect(langResult[0].patientName).toBe('Amina Khan');

      const voiceResult = filterConsultations(sampleRecords, 'Fenrir', 'all');
      expect(voiceResult.length).toBe(1);
      expect(voiceResult[0].patientName).toBe('David Miller');
    });

    test('searches by prescription reference code', () => {
      const refResult = filterConsultations(sampleRecords, 'RX-MWL3FWAQ', 'all');
      expect(refResult.length).toBe(1);
      expect(refResult[0].patientName).toBe('Khushi Kumari');
    });

    test('searches by prescribed medication brand or generic molecule name', () => {
      const doloResult = filterConsultations(sampleRecords, 'Dolo 650', 'all');
      expect(doloResult.length).toBe(1);
      expect(doloResult[0].patientName).toBe('Khushi Kumari');

      const genericResult = filterConsultations(sampleRecords, 'Cetirizine', 'all');
      expect(genericResult.length).toBe(1);
      expect(genericResult[0].patientName).toBe('Khushi Kumari');

      const naprosynResult = filterConsultations(sampleRecords, 'Naproxen', 'all');
      expect(naprosynResult.length).toBe(1);
      expect(naprosynResult[0].patientName).toBe('Amina Khan');
    });

    test('searches across prescription dosage, instructions, advice, and follow-up', () => {
      const dosageResult = filterConsultations(sampleRecords, '650mg', 'all');
      expect(dosageResult.length).toBe(1);
      expect(dosageResult[0].patientName).toBe('Khushi Kumari');

      const instructionResult = filterConsultations(sampleRecords, 'empty stomach', 'all');
      expect(instructionResult.length).toBe(1);
      expect(instructionResult[0].patientName).toBe('Amina Khan');

      const adviceResult = filterConsultations(sampleRecords, 'warm fluids', 'all');
      expect(adviceResult.length).toBe(1);
      expect(adviceResult[0].patientName).toBe('Khushi Kumari');

      const followUpResult = filterConsultations(sampleRecords, 'neurologist', 'all');
      expect(followUpResult.length).toBe(1);
      expect(followUpResult[0].patientName).toBe('Amina Khan');
    });

    test('searches by dialogue transcript turns', () => {
      const dialogueResult = filterConsultations(sampleRecords, 'furniture', 'all');
      expect(dialogueResult.length).toBe(1);
      expect(dialogueResult[0].patientName).toBe('David Miller');
    });

    test('combines search query with filter mode', () => {
      const allPain = filterConsultations(sampleRecords, 'pain', 'all');
      expect(allPain.length).toBeGreaterThanOrEqual(2);

      const rxPain = filterConsultations(sampleRecords, 'pain', 'with-rx');
      expect(rxPain.every((r) => r.prescription !== undefined)).toBe(true);

      const triagePain = filterConsultations(sampleRecords, 'pain', 'without-rx');
      expect(triagePain.length).toBe(1);
      expect(triagePain[0].patientName).toBe('David Miller');
    });

    test('returns empty array when query has no matches', () => {
      const noMatch = filterConsultations(sampleRecords, 'xyz-non-existent-symptom-999', 'all');
      expect(noMatch).toEqual([]);
    });

    test('defensively handles nulls, malformed items, and numeric ages without crashing', () => {
      const corruptedRecords: any[] = [
        null,
        undefined,
        {
          id: 'corrupt-1',
          createdAt: '',
          patientName: 'Corrupt Patient',
          patientAge: 25 as any, // numeric age
          symptoms: [null, undefined, 'Fever', 123 as any],
          transcript: [null, { text: 'Some text' }],
          prescription: {
            medications: [null, { name: 'Aspirin', dosage: '100mg' }],
            advice: [null, 'Rest'],
          },
        },
      ];

      expect(() => filterConsultations(corruptedRecords, 'fever')).not.toThrow();
      const match = filterConsultations(corruptedRecords, 'fever');
      expect(match.length).toBe(1);
      expect(match[0].patientName).toBe('Corrupt Patient');

      // Search by numeric age
      const ageMatch = filterConsultations(corruptedRecords, '25');
      expect(ageMatch.length).toBe(1);

      // Search by medication inside partially null list
      const medMatch = filterConsultations(corruptedRecords, 'Aspirin');
      expect(medMatch.length).toBe(1);
    });
  });

  describe('Consultation Statistics Calculator (getConsultationStats)', () => {
    test('calculates correct summary metrics for sample data', () => {
      const stats = getConsultationStats(sampleRecords);

      expect(stats.totalConsultations).toBe(3);
      expect(stats.totalPrescriptions).toBe(2);
      expect(stats.totalMedications).toBe(3); // 2 from Khushi + 1 from Amina
      expect(stats.uniquePatients).toBe(3);
    });

    test('handles empty records cleanly', () => {
      const stats = getConsultationStats([]);
      expect(stats.totalConsultations).toBe(0);
      expect(stats.totalPrescriptions).toBe(0);
      expect(stats.totalMedications).toBe(0);
      expect(stats.uniquePatients).toBe(0);
    });

    test('deduplicates patient names case-insensitively and ignores null records', () => {
      const duplicateRecords: any[] = [
        sampleRecords[0],
        null, // null item in array
        {
          ...sampleRecords[0],
          id: 'cons-dup',
          patientName: 'KHUSHI KUMARI',
          prescription: {
            medications: [null, { name: 'Med 1' }],
          },
        },
      ];

      const stats = getConsultationStats(duplicateRecords);
      expect(stats.totalConsultations).toBe(2);
      expect(stats.uniquePatients).toBe(1);
      expect(stats.totalPrescriptions).toBe(2);
      expect(stats.totalMedications).toBe(3); // 2 from first + 1 non-null from second
    });
  });

  describe('Date & Time Formatter (formatConsultationDate)', () => {
    test('formats a valid ISO timestamp into date and time components', () => {
      const result = formatConsultationDate('2026-11-17T19:40:00.000Z');

      expect(result.formattedDate).toBeDefined();
      expect(result.formattedTime).toBeDefined();
      expect(result.formattedDate).toContain('2026');
      expect(result.fullDateTime).toContain(result.formattedDate);
    });

    test('handles undefined and invalid dates without throwing', () => {
      const emptyResult = formatConsultationDate(undefined);
      expect(emptyResult.formattedDate).toBe('Date unavailable');

      const invalidResult = formatConsultationDate('not-a-valid-date');
      expect(invalidResult.formattedDate).toBe('not-a-valid-date');
    });
  });

  describe('Prescription PDF Download Integration', () => {
    test('successfully generates PDF and returns filename for prescription in records', () => {
      const rx = sampleRecords[0].prescription!;
      const result = triggerPrescriptionDownload(rx, false);

      expect(result.success).toBe(true);
      expect(result.fileName).toContain('Prescription-Khushi_Kumari');
      expect(result.fileName?.endsWith('.pdf')).toBe(true);
    });

    test('directly invokes generatePrescriptionPdf and outputs valid PDF binary with reference code', () => {
      const rx = sampleRecords[0].prescription!;
      const pdfOutput = generatePrescriptionPdf(rx, false);

      expect(pdfOutput.doc).toBeDefined();
      expect(pdfOutput.fileName).toContain('Khushi_Kumari');
      expect(pdfOutput.doc.getNumberOfPages()).toBe(1);

      const rawPdf = pdfOutput.doc.output();
      expect(rawPdf.startsWith('%PDF')).toBe(true);
      // Confirms reference code RX-MWL3FWAQ is embedded in PDF output
      expect(rawPdf).toContain('RX-MWL3FWAQ');
    });

    test('gracefully handles prescription without medications', () => {
      const minimalRx: PrescriptionData = {
        patientName: 'Minimal Test',
        patientAge: '50',
        date: '2026-11-17',
        chiefComplaint: 'Mild checkup',
        assessmentNotes: 'All clear',
        medications: [],
        advice: ['Drink water'],
        followUp: 'As needed',
      };

      const result = triggerPrescriptionDownload(minimalRx, false);
      expect(result.success).toBe(true);
    });

    test('returns failure object when prescription input is invalid or missing', () => {
      const result = triggerPrescriptionDownload(null as any, false);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Desktop Master-Detail Selection Resolver (resolveSelectedConsultation)', () => {
    test('returns null when filtered records list is empty', () => {
      const result = resolveSelectedConsultation([], 'cons-1');
      expect(result).toBeNull();
    });

    test('returns matching record when selectedId exists in filtered records', () => {
      const result = resolveSelectedConsultation(sampleRecords, 'cons-2');
      expect(result).toBeDefined();
      expect(result?.id).toBe('cons-2');
      expect(result?.patientName).toBe('David Miller');
    });

    test('falls back to the first record when selectedId is not found in filtered list', () => {
      // Simulating: User had selected cons-2 (David), then searched for "Khushi" (only cons-1 is in filtered list)
      const filteredToKhushi = filterConsultations(sampleRecords, 'Khushi', 'all');
      expect(filteredToKhushi.length).toBe(1);

      // Even though selectedId is cons-2, resolver returns cons-1 so detail view updates to match search results
      const resolved = resolveSelectedConsultation(filteredToKhushi, 'cons-2');
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('cons-1');
      expect(resolved?.patientName).toBe('Khushi Kumari');
    });

    test('falls back to the first record when selectedId is null', () => {
      const nullResult = resolveSelectedConsultation(sampleRecords, null);
      expect(nullResult).toBeDefined();
      expect(nullResult?.id).toBe('cons-1');
    });
  });
});
