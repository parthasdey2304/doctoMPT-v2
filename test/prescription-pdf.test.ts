import { test, expect, describe } from 'bun:test';
import { generatePrescriptionPdf } from '../lib/prescription-pdf';
import { PrescriptionData } from '../types/consultation';

describe('Prescription PDF Generator', () => {
  const samplePrescription: PrescriptionData = {
    patientName: 'Jane Doe',
    patientAge: '34 years',
    date: '2026-11-17',
    chiefComplaint: 'Severe sore throat, dry cough, and mild fever for 2 days.',
    assessmentNotes: 'Acute pharyngitis, likely viral. Stable vitals.',
    medications: [
      {
        name: 'Dolo 650',
        brandName: 'Dolo 650',
        genericName: 'Paracetamol',
        dosage: '650mg',
        frequency: '3 times a day',
        timing: 'After meals',
        duration: '5 days',
        reason: 'For fever reduction and throat pain relief',
        instructions: 'Take with plenty of warm water',
      },
      {
        name: 'Zyrtec 10',
        brandName: 'Zyrtec 10',
        genericName: 'Cetirizine Hydrochloride',
        dosage: '10mg',
        frequency: 'Once a day',
        timing: 'At bedtime',
        duration: '5 days',
        reason: 'For allergic rhinitis and post-nasal drip',
        instructions: 'May cause drowsiness',
      },
    ],
    advice: [
      'Warm saline water gargles 3-4 times a day',
      'Stay well hydrated with warm liquids',
      'Adequate voice rest',
    ],
    followUp: 'Visit a clinic in person if fever rises above 102F or breathing difficulties occur.',
    doctorName: 'Dr. DoctoMPT',
    clinicName: 'DoctoMPT Clinic',
  };

  test('successfully generates a jsPDF document and blob output', () => {
    // Run without window autoDownload
    const result = generatePrescriptionPdf(samplePrescription, false);
    expect(result).toBeDefined();
    expect(result.doc).toBeDefined();
    expect(result.fileName).toContain('Jane_Doe');
    expect(result.fileName.endsWith('.pdf')).toBe(true);

    // Verify document pages
    expect(result.doc.getNumberOfPages()).toBe(1);

    // Verify raw output data
    const outputString = result.doc.output();
    expect(outputString).toContain('%PDF');
    expect(outputString.length).toBeGreaterThan(1000);

    // Verify disclaimers and old prototype text are completely removed
    expect(outputString).not.toContain('HACKATHON SIMULATION ONLY');
    expect(outputString).not.toContain('Strictly Educational');
  });

  test('handles minimal/fallback prescription data gracefully', () => {
    const minimalPrescription: PrescriptionData = {
      patientName: '',
      patientAge: '',
      date: '',
      chiefComplaint: '',
      assessmentNotes: '',
      medications: [],
      advice: [],
      followUp: '',
    };

    const result = generatePrescriptionPdf(minimalPrescription, false);
    expect(result).toBeDefined();
    expect(result.doc.getNumberOfPages()).toBe(1);
    const outputString = result.doc.output();
    expect(outputString).toContain('%PDF');
    expect(outputString).not.toContain('HACKATHON SIMULATION ONLY');
  });

  test('correctly renders multiple medications with brand names, generic drug names, and strengths', () => {
    const multiMedPrescription: PrescriptionData = {
      patientName: 'Alex Mercer',
      patientAge: '42 years',
      date: '2026-11-17',
      chiefComplaint: 'Gastric discomfort, acute tension headache, and dehydration',
      assessmentNotes: 'Gastroenteritis with secondary tension headache. Vitals normal.',
      medications: [
        {
          name: 'Pan 40',
          brandName: 'Pan 40',
          genericName: 'Pantoprazole Gastro-resistant',
          dosage: '40mg',
          frequency: 'Once a day',
          timing: 'Before breakfast (empty stomach)',
          duration: '7 days',
          reason: 'To reduce gastric acid secretion and soothe stomach lining',
          instructions: 'Swallow whole with a full glass of water 30 minutes before meal',
        },
        {
          name: 'Dolo 650',
          brandName: 'Dolo 650',
          genericName: 'Paracetamol',
          dosage: '650mg',
          frequency: '3 times a day',
          timing: 'After meals',
          duration: '3 days',
          reason: 'For headache and bodily pain relief',
          instructions: 'Do not exceed 3000mg in 24 hours',
        },
        {
          name: 'Motilium',
          brandName: 'Motilium',
          genericName: 'Domperidone',
          dosage: '10mg',
          frequency: '2 times a day',
          timing: 'Before meals',
          duration: '5 days',
          reason: 'For controlling nausea and improving gut motility',
          instructions: 'Take 15-30 minutes before food',
        },
        {
          name: 'Electral ORS',
          brandName: 'Electral ORS',
          genericName: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
          dosage: '1 sachet in 1L water',
          frequency: 'As needed throughout the day',
          timing: 'Between meals throughout the day',
          duration: '3 days',
          reason: 'Electrolyte replenishment and fluid maintenance',
          instructions: 'Sip steadily throughout waking hours',
        },
      ],
      advice: [
        'Bland diet: steamed rice, bananas, toast, and clear broths',
        'Avoid spicy, fried, or caffeinated food and drinks',
        'Rest in a cool, quiet room',
      ],
      followUp: 'Seek medical care if severe abdominal pain or persistent vomiting develops within 24h.',
      doctorName: 'Dr. DoctoMPT',
      clinicName: 'DoctoMPT Clinic',
    };

    const result = generatePrescriptionPdf(multiMedPrescription, false);
    expect(result).toBeDefined();
    expect(result.fileName).toContain('Alex_Mercer');
    expect(result.doc.getNumberOfPages()).toBe(1);

    const pdfContent = result.doc.output();
    expect(pdfContent.length).toBeGreaterThan(1500);
    expect(pdfContent).not.toContain('HACKATHON SIMULATION ONLY');
    expect(pdfContent).not.toContain('Strictly Educational');
  });

  test('embeds Mrs Saint Delafield font and renders Dr. DoctoMPT signature', () => {
    const rx: PrescriptionData = {
      patientName: 'John Test',
      patientAge: '40 years',
      date: '2026-11-17',
      chiefComplaint: 'Viral fever',
      assessmentNotes: 'Clinical impression stable.',
      medications: [
        {
          name: 'Dolo 650',
          brandName: 'Dolo 650',
          genericName: 'Paracetamol',
          dosage: '650mg',
          frequency: '3 times daily',
          timing: 'After meals',
          duration: '3 days',
          reason: 'Fever',
          instructions: 'Water',
        },
      ],
      advice: ['Rest'],
      followUp: 'Review in 3 days',
    };

    const result = generatePrescriptionPdf(rx, false);
    expect(result).toBeDefined();

    // Verify font is registered in the jsPDF document
    const fontList = result.doc.getFontList();
    expect(fontList['MrsSaintDelafield']).toBeDefined();

    const pdfOutput = result.doc.output();
    expect(pdfOutput).toContain('MrsSaintDelafield');
    expect(pdfOutput).not.toContain('Dr. Gemini (AI)');
    expect(pdfOutput).not.toContain('AI MedConsult Prototype');
  });

  test('normalizes raw chemical drug names to real brand name, chemical generic name, and strength', () => {
    const rawRx: PrescriptionData = {
      patientName: 'Bharat Kumar',
      patientAge: '28 years',
      date: '2026-11-17',
      chiefComplaint: 'High fever, severe cold, and acid reflux',
      assessmentNotes: 'Upper respiratory infection with acute gastric distress.',
      medications: [
        {
          name: 'Paracetamol',
          dosage: '',
          frequency: '3 times daily',
          timing: 'After meals',
          duration: '5 days',
          reason: 'Fever',
          instructions: 'Take with warm water',
        },
        {
          name: 'Cetirizine Hydrochloride',
          dosage: '',
          frequency: 'Once daily at bedtime',
          timing: 'At bedtime',
          duration: '5 days',
          reason: 'Cold and runny nose',
          instructions: 'May cause drowsiness',
        },
        {
          name: 'Pantoprazole',
          dosage: '',
          frequency: 'Once daily',
          timing: 'Before breakfast (empty stomach)',
          duration: '7 days',
          reason: 'Acidity',
          instructions: 'Swallow whole',
        },
        {
          name: 'Oral Electrolyte Rehydration Salts (ORS)',
          dosage: '',
          frequency: '2-3 times a day',
          timing: 'Between meals throughout the day',
          duration: '3 days',
          reason: 'Hydration',
          instructions: 'Dissolve in 1L water',
        },
      ],
      advice: [
        'Maintain adequate hydration by drinking plenty of warm fluids and electrolytes throughout the day.',
        'Get sufficient uninterrupted bed rest and avoid strenuous physical activity during the recovery period.',
        'Monitor body temperature and record symptom progression every morning and evening.',
        'Eat soft, easily digestible foods like rice porridge and clear broths.',
      ],
      followUp:
        'Please return for clinical review with Dr. DoctoMPT if high fever persists beyond 48 hours, or seek emergency medical care immediately for severe shortness of breath.',
    };

    const result = generatePrescriptionPdf(rawRx, false);
    expect(result).toBeDefined();
    expect(result.doc.getNumberOfPages()).toBe(1);

    const pdfOutput = result.doc.output();
    // Brand names should be present
    expect(pdfOutput).toContain('Dolo 650');
    expect(pdfOutput).toContain('Zyrtec 10');
    expect(pdfOutput).toContain('Pan 40');
    expect(pdfOutput).toContain('Electral ORS');
    // Doctor signature and title
    expect(pdfOutput).toContain('Dr. DoctoMPT');
    expect(pdfOutput).toContain('DOCTOMPT MEDICAL CLINIC');
    // Ensure disclaimers and old text absent
    expect(pdfOutput).not.toContain('HACKATHON SIMULATION ONLY');
    expect(pdfOutput).not.toContain('Dr. Gemini');
    expect(pdfOutput).not.toContain('Strictly Educational');
  });
});
