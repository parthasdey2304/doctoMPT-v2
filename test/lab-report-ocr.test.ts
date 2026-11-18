import { describe, expect, it } from 'bun:test';
import {
  synthesizeFallbackLabReport,
  processLabReportWithOcr,
  INDIAN_LAB_REPORT_OCR_SYSTEM_INSTRUCTION,
  LAB_REPORT_SCHEMA,
} from '../lib/lab-report-ocr';

describe('Laboratory Diagnostic Reports OCR Engine', () => {
  it('should synthesize standard Dr Lal PathLabs CBC report correctly', () => {
    const report = synthesizeFallbackLabReport('dr-lal-pathlabs-cbc-report.pdf');

    expect(report.laboratoryName).toContain('Dr Lal PathLabs');
    expect(report.accreditation).toContain('NABL');
    expect(report.overallImpression).toContain('leukocytosis');
    expect(report.abnormalFindings.length).toBeGreaterThan(0);
    expect(report.tests.length).toBeGreaterThanOrEqual(5);

    // Verify CBC tests
    const wbc = report.tests.find((t) => t.testName.includes('Total Leucocyte Count'));
    expect(wbc).toBeDefined();
    expect(wbc?.status).toBe('high');
    expect(wbc?.observedValue).toBe('12,400');

    const hb = report.tests.find((t) => t.testName.includes('Hemoglobin'));
    expect(hb).toBeDefined();
    expect(hb?.status).toBe('normal');

    const esr = report.tests.find((t) => t.testName.includes('ESR'));
    expect(esr).toBeDefined();
    expect(esr?.status).toBe('high');
  });

  it('should synthesize metabolic / diabetes & lipid panel when requested', () => {
    const report = synthesizeFallbackLabReport('patient-blood-sugar-lipid-test.pdf');

    expect(report.laboratoryName).toContain('Metropolis');
    expect(report.overallImpression).toContain('Pre-diabetes');

    const fbs = report.tests.find((t) => t.testName.includes('Fasting Blood Sugar'));
    expect(fbs).toBeDefined();
    expect(fbs?.status).toBe('high');
    expect(fbs?.observedValue).toBe('116');

    const hba1c = report.tests.find((t) => t.testName.includes('HbA1c'));
    expect(hba1c).toBeDefined();
    expect(hba1c?.status).toBe('high');
  });

  it('should gracefully fallback when processing without API key', async () => {
    const dummyBuffer = Buffer.from('Mock PDF Content for Lab Report');
    const result = await processLabReportWithOcr({
      buffer: dummyBuffer,
      mimeType: 'application/pdf',
      fileName: 'lab-test-blood.pdf',
    });

    expect(result).toBeDefined();
    expect(result.tests.length).toBeGreaterThan(0);
    expect(result.confidence).toBe('high');
  });

  it('should have a valid schema and system instruction for Gemini multimodal vision', () => {
    expect(INDIAN_LAB_REPORT_OCR_SYSTEM_INSTRUCTION).toContain('COMPLETE BLOOD COUNT');
    expect(INDIAN_LAB_REPORT_OCR_SYSTEM_INSTRUCTION).toContain('LIVER FUNCTION');
    expect(INDIAN_LAB_REPORT_OCR_SYSTEM_INSTRUCTION).toContain('RENAL / KIDNEY');
    expect(LAB_REPORT_SCHEMA.properties.tests).toBeDefined();
    expect(LAB_REPORT_SCHEMA.properties.abnormalFindings).toBeDefined();
  });
});
