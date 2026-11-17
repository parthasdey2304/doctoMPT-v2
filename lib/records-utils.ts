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
 */
export function filterConsultations(
  records: SavedConsultation[],
  searchQuery: string = '',
  filterMode: RecordsFilterMode = 'all'
): SavedConsultation[] {
  if (!Array.isArray(records)) return [];

  const query = searchQuery.trim().toLowerCase();

  return records.filter((item) => {
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
    const nameMatch = (item.patientName || '').toLowerCase().includes(query);
    const ageMatch = (item.patientAge || '').toLowerCase().includes(query);
    const conditionMatch = (item.primaryCondition || '').toLowerCase().includes(query);
    const complaintMatch = (item.chiefComplaint || '').toLowerCase().includes(query);
    const impressionMatch = (item.clinicalImpression || '').toLowerCase().includes(query);
    const notesMatch = (item.doctorNotes || '').toLowerCase().includes(query);
    const languageMatch = (item.language || '').toLowerCase().includes(query);
    const voiceMatch = (item.voiceProfile || '').toLowerCase().includes(query);
    const ipMatch = (item.clientIp || '').toLowerCase().includes(query);
    const statusMatch = (item.status || '').toLowerCase().includes(query);

    // Symptoms search
    const symptomsMatch = Array.isArray(item.symptoms) &&
      item.symptoms.some((s) => s.toLowerCase().includes(query));

    // Prescription search (reference code, clinic name, medications)
    let rxMatch = false;
    if (item.prescription) {
      const refMatch = (item.prescription.referenceCode || '').toLowerCase().includes(query);
      const clinicMatch = (item.prescription.clinicName || '').toLowerCase().includes(query);
      const medsMatch = Array.isArray(item.prescription.medications) &&
        item.prescription.medications.some((m) =>
          (m.name || '').toLowerCase().includes(query) ||
          (m.brandName || '').toLowerCase().includes(query) ||
          (m.genericName || '').toLowerCase().includes(query) ||
          (m.reason || '').toLowerCase().includes(query)
        );
      rxMatch = refMatch || clinicMatch || medsMatch;
    }

    // Transcript messages search
    const transcriptMatch = Array.isArray(item.transcript) &&
      item.transcript.some((t) => (t.text || '').toLowerCase().includes(query));

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
      symptomsMatch ||
      rxMatch ||
      transcriptMatch
    );
  });
}

/**
 * Compute summary statistics from consultation records.
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

  const totalConsultations = records.length;
  let totalPrescriptions = 0;
  let totalMedications = 0;
  const uniqueNames = new Set<string>();

  for (const item of records) {
    if (item.patientName) {
      uniqueNames.add(item.patientName.trim().toLowerCase());
    }
    if (item.prescription) {
      totalPrescriptions += 1;
      if (Array.isArray(item.prescription.medications)) {
        totalMedications += item.prescription.medications.length;
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
 * Trigger PDF download for a prescription with error handling.
 */
export function triggerPrescriptionDownload(
  prescription: PrescriptionData,
  autoDownload: boolean = true
): { success: boolean; fileName?: string; error?: string } {
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
