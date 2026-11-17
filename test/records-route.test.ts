import { test, expect, describe } from 'bun:test';
import {
  filterConsultations,
  getConsultationStats,
  formatConsultationDate,
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
      status: 'completed',
      transcript: [
        { id: 't1', role: 'patient', text: 'I lifted furniture yesterday and my lower back seized up.', timestamp: '14:15' },
        { id: 't2', role: 'doctor', text: 'Rest your back and apply warm compresses.', timestamp: '14:16' },
      ],
      // No prescription generated (Triage consultation only)
    },
    {
      id: 'cons-3',
      createdAt: '2026-11-15T09:30:00.000Z',
      patientName: 'Amina Khan',
      patientAge: '29 years',
      primaryCondition: 'Acute Migraine with Photophobia',
      chiefComplaint: 'Unilateral throbbing headache and light sensitivity',
      symptoms: ['Throbbing headache', 'Photophobia', 'Nausea'],
      clinicalImpression: 'Classic migraine attack.',
      doctorNotes: 'Classic migraine attack without neurological deficits.',
      language: 'Hinglish',
      voiceProfile: 'Kore (Warm, Empathetic Female)',
      clientIp: '182.74.12.8',
      status: 'completed',
      transcript: [
        { id: 't1', role: 'patient', text: 'Doctor mere sar me bahut tez dard ho raha hai.', timestamp: '09:30' },
        { id: 't2', role: 'doctor', text: 'Aap shant andhere kamre me aaram karein.', timestamp: '09:31' },
      ],
      prescription: {
        patientName: 'Amina Khan',
        patientAge: '29 years',
        date: '2026-11-15',
        chiefComplaint: 'Acute Migraine with Photophobia',
        assessmentNotes: 'Classic migraine attack without neurological deficits.',
        advice: ['Rest in a dark, quiet room', 'Avoid bright screens'],
        followUp: 'Seek emergency care if severe vomiting or vision loss occurs.',
        referenceCode: 'RX-MIGR8899',
        medications: [
          {
            name: 'Naprosyn 500',
            brandName: 'Naprosyn 500',
            genericName: 'Naproxen',
            dosage: '500mg',
            frequency: 'Twice daily as needed',
            timing: 'After meals',
            duration: '3 days',
            reason: 'Migraine acute relief',
            instructions: 'Do not take on empty stomach',
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

    test('searches by client IP address', () => {
      const ipResult = filterConsultations(sampleRecords, '103.21.244.15', 'all');
      expect(ipResult.length).toBe(1);
      expect(ipResult[0].patientName).toBe('Khushi Kumari');
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

    test('searches by dialogue transcript turns', () => {
      const dialogueResult = filterConsultations(sampleRecords, 'furniture', 'all');
      expect(dialogueResult.length).toBe(1);
      expect(dialogueResult[0].patientName).toBe('David Miller');
    });

    test('combines search query with filter mode', () => {
      // Searching for "pain": matches David Miller (back pain) and Khushi Kumari (throat pain / body ache)
      const allPain = filterConsultations(sampleRecords, 'pain', 'all');
      expect(allPain.length).toBeGreaterThanOrEqual(2);

      // But with "with-rx", David Miller is excluded because he has no prescription
      const rxPain = filterConsultations(sampleRecords, 'pain', 'with-rx');
      expect(rxPain.every((r) => r.prescription !== undefined)).toBe(true);
      expect(rxPain.some((r) => r.patientName === 'David Miller')).toBe(false);
    });

    test('returns empty array when query has no matches', () => {
      const noMatch = filterConsultations(sampleRecords, 'nonexistentXYZ999', 'all');
      expect(noMatch).toEqual([]);
    });
  });

  describe('Consultation Statistics Calculator (getConsultationStats)', () => {
    test('calculates correct summary metrics for sample data', () => {
      const stats = getConsultationStats(sampleRecords);
      expect(stats.totalConsultations).toBe(3);
      expect(stats.totalPrescriptions).toBe(2);
      // Khushi has 2 meds, Amina has 1 med = 3 meds total
      expect(stats.totalMedications).toBe(3);
      expect(stats.uniquePatients).toBe(3);
    });

    test('handles empty records cleanly', () => {
      const stats = getConsultationStats([]);
      expect(stats).toEqual({
        totalConsultations: 0,
        totalPrescriptions: 0,
        totalMedications: 0,
        uniquePatients: 0,
      });
    });

    test('deduplicates patient names case-insensitively', () => {
      const duplicateRecords: SavedConsultation[] = [
        { id: '1', createdAt: '', patientName: 'John Doe', patientAge: '40', transcript: [] },
        { id: '2', createdAt: '', patientName: 'john doe', patientAge: '40', transcript: [] },
        { id: '3', createdAt: '', patientName: 'Jane Smith', patientAge: '30', transcript: [] },
      ];
      const stats = getConsultationStats(duplicateRecords);
      expect(stats.totalConsultations).toBe(3);
      expect(stats.uniquePatients).toBe(2);
    });
  });

  describe('Date & Time Formatter (formatConsultationDate)', () => {
    test('formats a valid ISO timestamp into date and time components', () => {
      const result = formatConsultationDate('2026-11-17T19:40:00.000Z');
      expect(result.formattedDate).toBeDefined();
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

    test('directly invokes generatePrescriptionPdf and outputs valid PDF binary', () => {
      const rx = sampleRecords[0].prescription!;
      const pdfOutput = generatePrescriptionPdf(rx, false);

      expect(pdfOutput.doc).toBeDefined();
      expect(pdfOutput.fileName).toContain('Khushi_Kumari');
      expect(pdfOutput.doc.getNumberOfPages()).toBe(1);

      const rawPdf = pdfOutput.doc.output();
      expect(rawPdf.startsWith('%PDF')).toBe(true);
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
  });
});
