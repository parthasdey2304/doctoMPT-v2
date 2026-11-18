export interface TranscriptItem {
  id: string;
  role: 'patient' | 'doctor';
  text: string;
  timestamp: string;
}

export interface MedicationItem {
  name: string;
  brandName?: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  reason: string;
  instructions: string;
}

export interface PrescriptionData {
  patientName: string;
  patientAge: string;
  date: string;
  chiefComplaint: string;
  assessmentNotes: string;
  medications: MedicationItem[];
  advice: string[];
  followUp: string;
  doctorName?: string;
  clinicName?: string;
  referenceCode?: string;
}

export type DoctorVisualState = 'idle' | 'listening' | 'speaking' | 'writing';

export interface ExtractedMedication {
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  instructions?: string;
}

export interface PhysicalPrescriptionOCR {
  doctorName?: string;
  doctorDegree?: string;
  clinicOrHospital?: string;
  registrationNumber?: string;
  date?: string;
  patientName?: string;
  patientAge?: string;
  chiefComplaints?: string[];
  diagnosis?: string;
  vitals?: {
    bloodPressure?: string;
    pulseRate?: string;
    temperature?: string;
    spo2?: string;
    weight?: string;
  };
  medications: ExtractedMedication[];
  investigations?: string[];
  advice?: string[];
  handwritingAnalysisSummary: string;
  rawText?: string;
  confidence?: 'high' | 'medium' | 'low';
  pageCount?: number;
  fileName?: string;
}

export type LabResultStatus = 'normal' | 'high' | 'low' | 'critical' | 'abnormal' | 'borderline';

export interface LabTestItem {
  testName: string;
  category?: string; // e.g., 'Hematology (CBC)', 'Liver Function (LFT)', 'Renal / Kidney (KFT)', 'Lipid Profile', 'Diabetic Profile', 'Thyroid Profile', 'Urinalysis'
  observedValue: string;
  unit?: string;
  referenceRange?: string;
  status: LabResultStatus;
  clinicalSignificance?: string;
}

export interface LabReportOCR {
  laboratoryName?: string;
  accreditation?: string; // e.g. NABL Accredited, CAP, ISO 15189
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  referringDoctor?: string;
  collectionDate?: string;
  reportDate?: string;
  sampleType?: string; // e.g. EDTA Whole Blood, Serum, Spot Urine
  overallImpression: string;
  abnormalFindings: string[];
  tests: LabTestItem[];
  criticalAlerts?: string[];
  rawText?: string;
  confidence?: 'high' | 'medium' | 'low';
  pageCount?: number;
  fileName?: string;
}

export interface SavedConsultation {
  id: string;
  createdAt: string;
  patientName: string;
  patientAge: string;
  transcript: TranscriptItem[];
  prescription?: PrescriptionData;
  physicalPrescription?: PhysicalPrescriptionOCR;
  labReport?: LabReportOCR;
  primaryCondition?: string;
  chiefComplaint?: string;
  symptoms?: string[];
  clinicalImpression?: string;
  doctorNotes?: string;
  clinicalPrompt?: string;
  language?: string;
  voiceProfile?: string;
  audioDevice?: string;
  clientIp?: string;
  userAgent?: string;
  status?: string;
}
