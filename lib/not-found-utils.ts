/**
 * Doctor-Themed 404 Not Found Clinical Diagnosis & Ward Utilities
 * For Dr. DoctoMPT Virtual Health Consultation
 */

export interface ClinicalVitals {
  pulse: string;
  bloodPressure: string;
  oxygenSaturation: string;
  temperature: string;
}

export interface ClinicWard {
  id: string;
  title: string;
  path: string;
  badge: string;
  description: string;
}

export interface Clinical404Diagnosis {
  code: string;
  condition: string;
  status: string;
  attendingPhysician: string;
  specialization: string;
  vitals: ClinicalVitals;
  clinicalImpression: string;
  treatmentPlan: string[];
  wards: ClinicWard[];
}

export const CLINICAL_404_DIAGNOSIS: Clinical404Diagnosis = {
  code: '404',
  condition: 'Acute Route Deficiency & Missing Clinical Ward',
  status: 'Unregistered Digital Endpoint',
  attendingPhysician: 'Dr. DoctoMPT',
  specialization: 'Chief Virtual Physician & Clinical Triage Lead',
  vitals: {
    pulse: '0 bpm (Flatline)',
    bloodPressure: '0/0 mmHg',
    oxygenSaturation: '0% SpO2',
    temperature: '98.6°F (Room Temp)',
  },
  clinicalImpression:
    'The requested URL or clinical file was examined by Dr. DoctoMPT. No active medical chart, patient prescription, or active consultation session exists at this digital ward. The route may have been discharged, relocated, or mistyped.',
  treatmentPlan: [
    'Administer immediate reload to the primary Doctor Consultation Room (/)',
    'Verify registered patient consultations in the EMR Prescription Database (/records)',
    'Initiate a live two-way voice consultation with Dr. DoctoMPT for personalized medical guidance',
  ],
  wards: [
    {
      id: 'consultation',
      title: 'Main Doctor Consultation Room',
      path: '/',
      badge: 'Active Clinic',
      description:
        'Live two-way doctor voice consultation, clinical examination, and instant PDF prescription generation.',
    },
    {
      id: 'records',
      title: 'Patient EMR & Prescription Archive',
      path: '/records',
      badge: 'Database',
      description:
        'Inspect saved patient consultation histories, doctor clinical impressions, and download PDF prescriptions.',
    },
  ],
};

/**
 * Safely executes a browser reload or navigation to the main clinic page.
 * Returns true if executed in a browser environment.
 */
export function executeReloadToMain(targetUrl: string = '/'): boolean {
  if (typeof window !== 'undefined') {
    try {
      window.location.href = targetUrl;
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
