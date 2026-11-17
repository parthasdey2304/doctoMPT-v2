import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  CLINICAL_404_DIAGNOSIS,
  executeReloadToMain,
} from '@/lib/not-found-utils';

describe('Doctor-Themed 404 Clinical Diagnosis & Ward Utilities', () => {
  it('defines valid 404 clinical diagnosis code and attending doctor persona', () => {
    expect(CLINICAL_404_DIAGNOSIS.code).toBe('404');
    expect(CLINICAL_404_DIAGNOSIS.attendingPhysician).toBe('Dr. DoctoMPT');
    expect(CLINICAL_404_DIAGNOSIS.condition).toContain('Acute Route Deficiency');
    expect(CLINICAL_404_DIAGNOSIS.status).toContain('Unregistered');
  });

  it('provides clinical vitals indicating a route flatline', () => {
    expect(CLINICAL_404_DIAGNOSIS.vitals.pulse).toContain('0 bpm');
    expect(CLINICAL_404_DIAGNOSIS.vitals.pulse).toContain('Flatline');
    expect(CLINICAL_404_DIAGNOSIS.vitals.bloodPressure).toBe('0/0 mmHg');
    expect(CLINICAL_404_DIAGNOSIS.vitals.oxygenSaturation).toBe('0% SpO2');
    expect(CLINICAL_404_DIAGNOSIS.vitals.temperature).toBeDefined();
  });

  it('contains comprehensive treatment plan recommending reload to main consultation', () => {
    expect(CLINICAL_404_DIAGNOSIS.treatmentPlan.length).toBeGreaterThanOrEqual(3);
    const hasReloadPlan = CLINICAL_404_DIAGNOSIS.treatmentPlan.some(
      (plan) => plan.includes('Doctor Consultation Room') && plan.includes('/')
    );
    expect(hasReloadPlan).toBe(true);

    const hasRecordsPlan = CLINICAL_404_DIAGNOSIS.treatmentPlan.some(
      (plan) => plan.includes('/records')
    );
    expect(hasRecordsPlan).toBe(true);
  });

  it('lists clinic wards including main consultation and records database', () => {
    const wardPaths = CLINICAL_404_DIAGNOSIS.wards.map((w) => w.path);
    expect(wardPaths).toContain('/');
    expect(wardPaths).toContain('/records');

    const consultationWard = CLINICAL_404_DIAGNOSIS.wards.find((w) => w.path === '/');
    expect(consultationWard?.title).toBeDefined();
    expect(consultationWard?.badge).toBeDefined();
  });

  it('executeReloadToMain safely handles browser vs server environments', () => {
    // In Bun test runner, window may be undefined or mockable
    if (typeof window === 'undefined') {
      const result = executeReloadToMain('/');
      expect(result).toBe(false);
    } else {
      // Mock window.location
      const originalLocation = window.location;
      try {
        const mockLocation = { href: '' } as any;
        Object.defineProperty(window, 'location', {
          value: mockLocation,
          writable: true,
          configurable: true,
        });
        const executed = executeReloadToMain('/');
        expect(executed).toBe(true);
        expect(mockLocation.href).toBe('/');
      } finally {
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          writable: true,
          configurable: true,
        });
      }
    }
  });

  it('strictly adheres to Dr. DoctoMPT zero-disclaimer persona guidelines', () => {
    const textBlob = JSON.stringify(CLINICAL_404_DIAGNOSIS).toLowerCase();
    expect(textBlob).not.toContain('educational purposes only');
    expect(textBlob).not.toContain('this is not medical advice');
    expect(textBlob).not.toContain('simulation');
    expect(textBlob).not.toContain('prototype');
    expect(textBlob).not.toContain('hackathon');
  });
});
