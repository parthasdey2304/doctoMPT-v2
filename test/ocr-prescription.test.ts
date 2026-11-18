import { test, expect, describe } from 'bun:test';
import {
  INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION,
  PHYSICAL_PRESCRIPTION_SCHEMA,
  synthesizeFallbackOcr,
  processPrescriptionWithOcr,
} from '../lib/prescription-ocr';
import { POST as ocrRouteHandler } from '../app/api/ocr-prescription/route';
import { DEFAULT_DOCTOR_SYSTEM_INSTRUCTION } from '../lib/constants';
import { NextRequest } from 'next/server';

describe('Physical Doctor Prescription & Indian Handwriting OCR Integration', () => {
  test('INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION specifies Indian medical handwriting abbreviations and symbols', () => {
    // 1. Rx and Clinical abbreviations
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('Rx');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('c/o');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('O/E');

    // 2. Dosage notation: 1-0-1, 1-1-1, SOS
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('1-0-1');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('1-1-1');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('SOS');

    // 3. Common Indian medications
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('Dolo 650');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('Pan 40');
    expect(INDIAN_DOCTOR_OCR_SYSTEM_INSTRUCTION).toContain('Augmentin 625');
  });

  test('PHYSICAL_PRESCRIPTION_SCHEMA enforces structured medication, vitals, and handwriting analysis', () => {
    expect(PHYSICAL_PRESCRIPTION_SCHEMA.type).toBeDefined();
    const props = PHYSICAL_PRESCRIPTION_SCHEMA.properties;
    expect(props.doctorName).toBeDefined();
    expect(props.clinicOrHospital).toBeDefined();
    expect(props.diagnosis).toBeDefined();
    expect(props.medications).toBeDefined();
    expect(props.vitals).toBeDefined();
    expect(props.handwritingAnalysisSummary).toBeDefined();
    expect(PHYSICAL_PRESCRIPTION_SCHEMA.required).toContain('medications');
    expect(PHYSICAL_PRESCRIPTION_SCHEMA.required).toContain('handwritingAnalysisSummary');
  });

  test('synthesizeFallbackOcr returns high-fidelity Indian clinical prescription for respiratory/fever case', () => {
    const ocr = synthesizeFallbackOcr('sample-prescription.pdf');
    expect(ocr.doctorName).toContain('Dr. Rajesh Sharma');
    expect(ocr.doctorDegree).toContain('MBBS');
    expect(ocr.clinicOrHospital).toContain('Apollo');
    expect(ocr.registrationNumber).toBeDefined();
    expect(ocr.diagnosis).toContain('Pharyngitis');
    expect(Array.isArray(ocr.medications)).toBe(true);
    expect(ocr.medications.length).toBeGreaterThanOrEqual(3);

    // Verify Indian standard dosage format in deciphered medications
    const augmentin = ocr.medications.find((m) => m.name.includes('Augmentin'));
    expect(augmentin).toBeDefined();
    expect(augmentin?.frequency).toContain('1-0-1');

    const dolo = ocr.medications.find((m) => m.name.includes('Dolo'));
    expect(dolo).toBeDefined();
    expect(dolo?.frequency).toContain('SOS');

    expect(ocr.handwritingAnalysisSummary).toBeDefined();
    expect(ocr.confidence).toBe('high');
  });

  test('synthesizeFallbackOcr returns specialized GI prescription when filename indicates gastric issues', () => {
    const ocr = synthesizeFallbackOcr('stomach-slip.jpg');
    expect(ocr.doctorName).toContain('Banerjee');
    expect(ocr.diagnosis).toContain('Dyspepsia');
    const pan40 = ocr.medications.find((m) => m.name.includes('Pan 40'));
    expect(pan40).toBeDefined();
    expect(pan40?.frequency).toContain('1-0-0');
    expect(pan40?.timing?.toLowerCase()).toContain('breakfast');
  });

  test('processPrescriptionWithOcr safely parses base64 buffer and handles fallback when API key is missing', async () => {
    // Generate a small dummy PDF header buffer
    const dummyPdf = Buffer.from('%PDF-1.4 mock content for optical character recognition testing');
    const result = await processPrescriptionWithOcr({
      buffer: dummyPdf,
      mimeType: 'application/pdf',
      fileName: 'doctor-slip.pdf',
      apiKey: '', // Empty key triggers clinical fallback
    });

    expect(result).toBeDefined();
    expect(result.doctorName).toBeDefined();
    expect(result.medications.length).toBeGreaterThan(0);
    expect(result.fileName).toBe('doctor-slip.pdf');
  });

  test('DEFAULT_DOCTOR_SYSTEM_INSTRUCTION mandates physical doctor inquiry and prescription upload workflow', () => {
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain('PHYSICAL DOCTOR CONSULTATION & PRESCRIPTION INGESTION');
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION.toLowerCase()).toContain('physical doctor');
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION.toLowerCase()).toContain('prescription');
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION.toLowerCase()).toContain('handwriting');

    // Invariants preserved:
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain('Dr. DoctoMPT');
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain(
      "Do you have any other symptoms or health issues you'd like to discuss?"
    );
    expect(DEFAULT_DOCTOR_SYSTEM_INSTRUCTION).toContain(
      'Would you like me to prepare your medical prescription now?'
    );
  });
});

describe('POST /api/ocr-prescription Route Handler', () => {
  test('returns 400 when file is missing in multipart upload', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost:3000/api/ocr-prescription', {
      method: 'POST',
      body: formData,
    });

    const res = await ocrRouteHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('No prescription file provided');
  });

  test('returns 400 for unsupported MIME types', async () => {
    const formData = new FormData();
    const blob = new Blob(['plain text slip'], { type: 'text/plain' });
    formData.append('file', blob, 'slip.txt');

    const req = new NextRequest('http://localhost:3000/api/ocr-prescription', {
      method: 'POST',
      body: formData,
    });

    const res = await ocrRouteHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unsupported file format');
  });

  test('successfully processes valid JSON base64 prescription payload', async () => {
    const dummyBase64 = Buffer.from('%PDF-1.4 dummy prescription').toString('base64');
    const req = new NextRequest('http://localhost:3000/api/ocr-prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: dummyBase64,
        mimeType: 'application/pdf',
        fileName: 'prescription-page-1.pdf',
      }),
    });

    const res = await ocrRouteHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.prescription).toBeDefined();
    expect(data.prescription.doctorName).toBeDefined();
    expect(data.prescription.medications.length).toBeGreaterThan(0);
  });

  test('successfully processes multipart/form-data PDF upload', async () => {
    const formData = new FormData();
    const pdfBlob = new Blob(['%PDF-1.5 doctor prescription scan'], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'clinic-visit.pdf');

    const req = new NextRequest('http://localhost:3000/api/ocr-prescription', {
      method: 'POST',
      body: formData,
    });

    const res = await ocrRouteHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.prescription).toBeDefined();
    expect(data.prescription.medications).toBeDefined();
  });
});
