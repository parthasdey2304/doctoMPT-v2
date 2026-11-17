import { MedicationItem } from '@/types/consultation';

export interface MedicationDirectoryEntry {
  brand: string;
  generic: string;
  defaultStrength: string;
}

// Comprehensive clinical lookup mapping common chemical drugs to their widely prescribed brand names
export const DRUG_TO_BRAND_MAP: Record<string, MedicationDirectoryEntry> = {
  paracetamol: { brand: 'Dolo 650', generic: 'Paracetamol', defaultStrength: '650mg' },
  acetaminophen: { brand: 'Tylenol', generic: 'Acetaminophen (Paracetamol)', defaultStrength: '500mg' },
  cetirizine: { brand: 'Zyrtec 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  'cetirizine hydrochloride': { brand: 'Zyrtec 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  cetzine: { brand: 'Cetzine 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  pantoprazole: { brand: 'Pan 40', generic: 'Pantoprazole Gastro-resistant', defaultStrength: '40mg' },
  'pantoprazole gastro-resistant': { brand: 'Pan 40', generic: 'Pantoprazole Gastro-resistant', defaultStrength: '40mg' },
  omeprazole: { brand: 'Prilosec 20', generic: 'Omeprazole Gastro-resistant', defaultStrength: '20mg' },
  'oral rehydration salts': {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  'oral electrolyte rehydration salts': {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  'oral electrolyte rehydration salts (ors)': {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  ors: {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  ibuprofen: { brand: 'Brufen 400', generic: 'Ibuprofen', defaultStrength: '400mg' },
  amoxicillin: {
    brand: 'Augmentin 625',
    generic: 'Amoxicillin and Clavulanate Potassium',
    defaultStrength: '625mg',
  },
  'amoxicillin and clavulanate': {
    brand: 'Augmentin 625',
    generic: 'Amoxicillin and Clavulanate Potassium',
    defaultStrength: '625mg',
  },
  'amoxicillin and clavulanate potassium': {
    brand: 'Augmentin 625',
    generic: 'Amoxicillin and Clavulanate Potassium',
    defaultStrength: '625mg',
  },
  azithromycin: { brand: 'Azithral 500', generic: 'Azithromycin', defaultStrength: '500mg' },
  fexofenadine: {
    brand: 'Allegra 120',
    generic: 'Fexofenadine Hydrochloride',
    defaultStrength: '120mg',
  },
  'fexofenadine hydrochloride': {
    brand: 'Allegra 120',
    generic: 'Fexofenadine Hydrochloride',
    defaultStrength: '120mg',
  },
  domperidone: { brand: 'Motilium 10', generic: 'Domperidone', defaultStrength: '10mg' },
  montelukast: {
    brand: 'Montair LC',
    generic: 'Montelukast and Levocetirizine',
    defaultStrength: '10mg / 5mg',
  },
  dextromethorphan: {
    brand: 'Benadryl DR',
    generic: 'Dextromethorphan Hydrobromide',
    defaultStrength: '10ml',
  },
  'ibuprofen and paracetamol': {
    brand: 'Combiflam',
    generic: 'Ibuprofen and Paracetamol',
    defaultStrength: '400mg / 325mg',
  },
};

// Brand names to their respective generic chemical drug names
export const BRAND_TO_GENERIC_MAP: Record<string, MedicationDirectoryEntry> = {
  'dolo 650': { brand: 'Dolo 650', generic: 'Paracetamol', defaultStrength: '650mg' },
  dolo: { brand: 'Dolo 650', generic: 'Paracetamol', defaultStrength: '650mg' },
  tylenol: { brand: 'Tylenol', generic: 'Acetaminophen (Paracetamol)', defaultStrength: '500mg' },
  'pan 40': { brand: 'Pan 40', generic: 'Pantoprazole Gastro-resistant', defaultStrength: '40mg' },
  pan: { brand: 'Pan 40', generic: 'Pantoprazole Gastro-resistant', defaultStrength: '40mg' },
  'zyrtec 10': { brand: 'Zyrtec 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  zyrtec: { brand: 'Zyrtec 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  cetzine: { brand: 'Cetzine 10', generic: 'Cetirizine Hydrochloride', defaultStrength: '10mg' },
  'electral ors': {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  electral: {
    brand: 'Electral ORS',
    generic: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
    defaultStrength: 'Standard sachet in 1L water',
  },
  combiflam: {
    brand: 'Combiflam',
    generic: 'Ibuprofen and Paracetamol',
    defaultStrength: '400mg / 325mg',
  },
  'augmentin 625': {
    brand: 'Augmentin 625',
    generic: 'Amoxicillin and Clavulanate Potassium',
    defaultStrength: '625mg',
  },
  augmentin: {
    brand: 'Augmentin 625',
    generic: 'Amoxicillin and Clavulanate Potassium',
    defaultStrength: '625mg',
  },
  'azithral 500': { brand: 'Azithral 500', generic: 'Azithromycin', defaultStrength: '500mg' },
  azithral: { brand: 'Azithral 500', generic: 'Azithromycin', defaultStrength: '500mg' },
  'allegra 120': {
    brand: 'Allegra 120',
    generic: 'Fexofenadine Hydrochloride',
    defaultStrength: '120mg',
  },
  allegra: {
    brand: 'Allegra 120',
    generic: 'Fexofenadine Hydrochloride',
    defaultStrength: '120mg',
  },
  'motilium 10': { brand: 'Motilium 10', generic: 'Domperidone', defaultStrength: '10mg' },
  motilium: { brand: 'Motilium 10', generic: 'Domperidone', defaultStrength: '10mg' },
  'montair lc': {
    brand: 'Montair LC',
    generic: 'Montelukast and Levocetirizine',
    defaultStrength: '10mg / 5mg',
  },
};

/**
 * Normalizes any MedicationItem so that:
 * 1. brandName contains the real commercial medicine brand (e.g. Dolo 650, Pan 40, Zyrtec 10)
 * 2. genericName contains the chemical drug name (e.g. Paracetamol, Pantoprazole, Cetirizine Hydrochloride)
 * 3. dosage contains the clinical strength (e.g. 650mg, 40mg, 10mg)
 */
export function normalizeMedication(med: Partial<MedicationItem>): MedicationItem {
  const rawBrand = (med.brandName || '').trim();
  const rawGeneric = (med.genericName || '').trim();
  const rawName = (med.name || '').trim();
  let dosage = (med.dosage || '').trim();

  // Determine starting candidates
  let resolvedBrand = rawBrand || rawName;
  let resolvedGeneric = rawGeneric;

  // Clean key for dictionary matching
  const brandKey = resolvedBrand.toLowerCase().replace(/[()]/g, '').trim();
  const genericKey = resolvedGeneric.toLowerCase().replace(/[()]/g, '').trim();
  const nameKey = rawName.toLowerCase().replace(/[()]/g, '').trim();

  // If the brand passed is actually a known chemical drug name (e.g., "Paracetamol", "Cetirizine", "Pantoprazole"),
  // convert it to the commercial brand name and assign the chemical name to generic.
  let matchedEntry: MedicationDirectoryEntry | undefined =
    DRUG_TO_BRAND_MAP[brandKey] || DRUG_TO_BRAND_MAP[nameKey];

  if (!matchedEntry) {
    for (const [k, entry] of Object.entries(DRUG_TO_BRAND_MAP)) {
      if (brandKey.includes(k) || nameKey.includes(k)) {
        matchedEntry = entry;
        break;
      }
    }
  }

  if (matchedEntry) {
    resolvedBrand = matchedEntry.brand;
    resolvedGeneric = resolvedGeneric || matchedEntry.generic;
    if (!dosage || dosage === 'As directed') dosage = matchedEntry.defaultStrength;
  }

  // If the generic is missing or identical to the brand, look up the brand to find the active ingredient
  if (!resolvedGeneric || resolvedGeneric.toLowerCase() === resolvedBrand.toLowerCase()) {
    const lookupKey = resolvedBrand.toLowerCase().trim();
    if (BRAND_TO_GENERIC_MAP[lookupKey]) {
      resolvedGeneric = BRAND_TO_GENERIC_MAP[lookupKey].generic;
      if (!dosage) dosage = BRAND_TO_GENERIC_MAP[lookupKey].defaultStrength;
    } else {
      // Partial matching (e.g. 'dolo' in 'dolo 650' or vice versa)
      for (const [k, entry] of Object.entries(BRAND_TO_GENERIC_MAP)) {
        if (lookupKey.includes(k) || k.includes(lookupKey)) {
          resolvedGeneric = entry.generic;
          if (!dosage) dosage = entry.defaultStrength;
          break;
        }
      }
    }
  }

  // If still generic is missing, check if genericKey matches DRUG_TO_BRAND_MAP
  if (!resolvedGeneric && DRUG_TO_BRAND_MAP[genericKey]) {
    resolvedGeneric = DRUG_TO_BRAND_MAP[genericKey].generic;
  }

  // Fallback if brand was not specified
  if (!resolvedBrand) {
    resolvedBrand = resolvedGeneric || 'Medication';
  }

  return {
    name: resolvedBrand,
    brandName: resolvedBrand,
    genericName: resolvedGeneric || undefined,
    dosage: dosage || 'As directed',
    frequency: med.frequency || 'As directed',
    timing: med.timing || 'After food',
    duration: med.duration || '3 to 5 days',
    reason: med.reason || 'Symptom relief',
    instructions: med.instructions || 'Take as prescribed by Dr. DoctoMPT',
  };
}
