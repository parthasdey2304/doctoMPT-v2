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
}

export type DoctorVisualState = 'idle' | 'listening' | 'speaking' | 'writing';

export interface SavedConsultation {
  id: string;
  createdAt: string;
  patientName: string;
  patientAge: string;
  transcript: TranscriptItem[];
  prescription?: PrescriptionData;
}
