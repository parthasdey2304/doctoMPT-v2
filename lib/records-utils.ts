import { SavedConsultation, PrescriptionData } from '@/types/consultation';
import { generatePrescriptionPdf } from '@/lib/prescription-pdf';

export type RecordsFilterMode = 'all' | 'with-rx' | 'without-rx';

export interface RecordsStats {
  totalConsultations: number;
  totalPrescriptions: number;
  totalMedications: number;
  uniquePatients: number;
}

/**
 * Filter consultations based on a search query and Rx presence mode.
 * Defensively handles null/undefined records, non-string fields, and malformed arrays.
 */
export function filterConsultations(
  records: SavedConsultation[],
  searchQuery: string = '',
  filterMode: RecordsFilterMode = 'all'
): SavedConsultation[] {
  if (!Array.isArray(records)) return [];

  const query = (searchQuery || '').trim().toLowerCase();

  return records.filter((item) => {
    if (!item || typeof item !== 'object') return false;

    // 1. Filter by prescription presence mode
    if (filterMode === 'with-rx' && !item.prescription) {
      return false;
    }
    if (filterMode === 'without-rx' && item.prescription) {
      return false;
    }

    // 2. If no search query, match all that passed the filter mode
    if (!query) {
      return true;
    }

    // 3. Search query matching across relevant clinical fields
    const nameMatch = String(item.patientName || '').toLowerCase().includes(query);
    const ageMatch = String(item.patientAge || '').toLowerCase().includes(query);
    const conditionMatch = String(item.primaryCondition || '').toLowerCase().includes(query);
    const complaintMatch = String(item.chiefComplaint || '').toLowerCase().includes(query);
    const impressionMatch = String(item.clinicalImpression || '').toLowerCase().includes(query);
    const notesMatch = String(item.doctorNotes || '').toLowerCase().includes(query);
    const languageMatch = String(item.language || '').toLowerCase().includes(query);
    const voiceMatch = String(item.voiceProfile || '').toLowerCase().includes(query);
    const ipMatch = String(item.clientIp || '').toLowerCase().includes(query);
    const statusMatch = String(item.status || '').toLowerCase().includes(query);
    const agentMatch = String(item.userAgent || '').toLowerCase().includes(query);

    // Symptoms search (safe against null / non-string items)
    const symptomsMatch =
      Array.isArray(item.symptoms) &&
      item.symptoms.some((s) => s && typeof s === 'string' && s.toLowerCase().includes(query));

    // Prescription search (reference code, clinic name, doctor, advice, follow-up, medications)
    let rxMatch = false;
    if (item.prescription && typeof item.prescription === 'object') {
      const rx = item.prescription;
      const refMatch = String(rx.referenceCode || '').toLowerCase().includes(query);
      const clinicMatch = String(rx.clinicName || '').toLowerCase().includes(query);
      const doctorMatch = String(rx.doctorName || '').toLowerCase().includes(query);
      const rxComplaintMatch = String(rx.chiefComplaint || '').toLowerCase().includes(query);
      const rxAssessmentMatch = String(rx.assessmentNotes || '').toLowerCase().includes(query);
      const followUpMatch = String(rx.followUp || '').toLowerCase().includes(query);

      const adviceMatch =
        Array.isArray(rx.advice) &&
        rx.advice.some((adv) => adv && typeof adv === 'string' && adv.toLowerCase().includes(query));

      const medsMatch =
        Array.isArray(rx.medications) &&
        rx.medications.some((m) => {
          if (!m || typeof m !== 'object') return false;
          return (
            String(m.name || '').toLowerCase().includes(query) ||
            String(m.brandName || '').toLowerCase().includes(query) ||
            String(m.genericName || '').toLowerCase().includes(query) ||
            String(m.reason || '').toLowerCase().includes(query) ||
            String(m.dosage || '').toLowerCase().includes(query) ||
            String(m.frequency || '').toLowerCase().includes(query) ||
            String(m.timing || '').toLowerCase().includes(query) ||
            String(m.duration || '').toLowerCase().includes(query) ||
            String(m.instructions || '').toLowerCase().includes(query)
          );
        });

      rxMatch =
        refMatch ||
        clinicMatch ||
        doctorMatch ||
        rxComplaintMatch ||
        rxAssessmentMatch ||
        followUpMatch ||
        adviceMatch ||
        medsMatch;
    }

    // Transcript messages search (safe against null / non-string items)
    const transcriptMatch =
      Array.isArray(item.transcript) &&
      item.transcript.some(
        (t) => t && typeof t.text === 'string' && t.text.toLowerCase().includes(query)
      );

    return (
      nameMatch ||
      ageMatch ||
      conditionMatch ||
      complaintMatch ||
      impressionMatch ||
      notesMatch ||
      languageMatch ||
      voiceMatch ||
      ipMatch ||
      statusMatch ||
      agentMatch ||
      symptomsMatch ||
      rxMatch ||
      transcriptMatch
    );
  });
}

/**
 * Compute summary statistics from consultation records safely.
 */
export function getConsultationStats(records: SavedConsultation[]): RecordsStats {
  if (!Array.isArray(records)) {
    return {
      totalConsultations: 0,
      totalPrescriptions: 0,
      totalMedications: 0,
      uniquePatients: 0,
    };
  }

  let totalConsultations = 0;
  let totalPrescriptions = 0;
  let totalMedications = 0;
  const uniqueNames = new Set<string>();

  for (const item of records) {
    if (!item || typeof item !== 'object') continue;
    totalConsultations += 1;

    if (item.patientName && typeof item.patientName === 'string') {
      const trimmed = item.patientName.trim().toLowerCase();
      if (trimmed) {
        uniqueNames.add(trimmed);
      }
    }

    if (item.prescription && typeof item.prescription === 'object') {
      totalPrescriptions += 1;
      if (Array.isArray(item.prescription.medications)) {
        totalMedications += item.prescription.medications.filter(
          (m) => m && typeof m === 'object'
        ).length;
      }
    }
  }

  return {
    totalConsultations,
    totalPrescriptions,
    totalMedications,
    uniquePatients: uniqueNames.size,
  };
}

/**
 * Format a consultation date string into human-readable date, time, and relative representation.
 */
export function formatConsultationDate(dateStr?: string): {
  formattedDate: string;
  formattedTime: string;
  fullDateTime: string;
} {
  if (!dateStr) {
    return {
      formattedDate: 'Date unavailable',
      formattedTime: '',
      fullDateTime: 'Date unavailable',
    };
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return {
        formattedDate: dateStr,
        formattedTime: '',
        fullDateTime: dateStr,
      };
    }

    const formattedDate = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const formattedTime = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      formattedDate,
      formattedTime,
      fullDateTime: `${formattedDate} at ${formattedTime}`,
    };
  } catch {
    return {
      formattedDate: dateStr,
      formattedTime: '',
      fullDateTime: dateStr,
    };
  }
}

/**
 * Resolves the active consultation for desktop master-detail view.
 * Ensures the selected record is always member of the filtered list,
 * preventing desynchronization between list and detail panes.
 */
export function resolveSelectedConsultation(
  filteredRecords: SavedConsultation[],
  selectedId: string | null
): SavedConsultation | null {
  if (!Array.isArray(filteredRecords) || filteredRecords.length === 0) {
    return null;
  }
  if (selectedId) {
    const match = filteredRecords.find((r) => r.id === selectedId);
    if (match) return match;
  }
  return filteredRecords[0];
}

/**
 * Trigger PDF download for a prescription with error handling.
 */
export function triggerPrescriptionDownload(
  prescription: PrescriptionData,
  autoDownload: boolean = true
): { success: boolean; fileName?: string; error?: string } {
  if (!prescription || typeof prescription !== 'object') {
    return {
      success: false,
      error: 'Prescription data is missing or invalid.',
    };
  }

  try {
    const result = generatePrescriptionPdf(prescription, autoDownload);
    return {
      success: true,
      fileName: result.fileName,
    };
  } catch (err: any) {
    console.error('Failed to generate prescription PDF:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate PDF',
    };
  }
}
