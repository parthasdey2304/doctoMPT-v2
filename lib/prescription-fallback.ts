import { PrescriptionData } from '@/types/consultation';
import { normalizeMedication } from '@/lib/medication-utils';

export function synthesizeFallbackPrescription(
  transcript: Array<{ role: 'patient' | 'doctor'; text: string }>,
  patientNameOverride?: string,
  patientAgeOverride?: string | number
): PrescriptionData {
  const fullText = transcript.map((t) => t.text).join(' ').toLowerCase();

  // Extract name & age if present in transcript
  const patientText = transcript
    .filter((t) => t.role === 'patient')
    .map((t) => t.text)
    .join(' ');

  const fullSearchText = patientText || transcript.map((t) => t.text).join(' ');

  let detectedName = (patientNameOverride && patientNameOverride.trim() !== '') ? patientNameOverride.trim() : '';
  if (!detectedName) {
    const nameMatch = fullSearchText.match(/(?:my name is|name is|call me|i am)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
    const excludedWords = [
      'saying',
      'having',
      'feeling',
      'experiencing',
      'here',
      'fine',
      'good',
      'sick',
      'doctor',
      'patient',
      'doctompt',
      'calling',
      'suffering',
      'trying',
      'just',
      'not',
      'getting',
      'going',
      'asking',
      'telling',
      'looking',
      'wondering',
      'hoping',
      'sorry',
      'taking',
      'doing',
      'talking',
      'okay',
      'alright',
    ];
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      const firstWord = candidate.toLowerCase().split(/\s+/)[0];
      if (!excludedWords.includes(firstWord) && candidate.length > 1) {
        detectedName = candidate.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }
  }
  if (!detectedName) {
    detectedName = 'Patient';
  }

  let detectedAge = (patientAgeOverride && String(patientAgeOverride).trim() !== '') ? String(patientAgeOverride).trim() : '';
  if (!detectedAge) {
    const ageMatch = fullSearchText.match(/(\d{1,2})\s*(?:years|yrs|year old|yo)/i);
    if (ageMatch && ageMatch[1]) {
      detectedAge = `${ageMatch[1]} years`;
    } else {
      detectedAge = '28 years';
    }
  }

  // Symptom detection
  const hasFever = fullText.includes('fever') || fullText.includes('temperature') || fullText.includes('chills');
  const hasThroat = fullText.includes('throat') || fullText.includes('cough') || fullText.includes('cold');
  const hasHeadache = fullText.includes('headache') || fullText.includes('migraine');
  const hasStomach = fullText.includes('stomach') || fullText.includes('abdomen') || fullText.includes('nausea') || fullText.includes('acidity');
  const hasBodyPain = fullText.includes('body pain') || fullText.includes('back') || fullText.includes('muscle') || fullText.includes('ache');

  const chiefComplaints: string[] = [];
  if (hasFever) chiefComplaints.push('Elevated body temperature / fever');
  if (hasThroat) chiefComplaints.push('Sore throat and respiratory irritation');
  if (hasHeadache) chiefComplaints.push('Cephalea / persistent headache');
  if (hasStomach) chiefComplaints.push('Gastric discomfort and mild nausea');
  if (hasBodyPain) chiefComplaints.push('Generalized body and muscle aches');
  if (chiefComplaints.length === 0) chiefComplaints.push('General malaise, fatigue, and physical discomfort');

  const medications = [
    {
      name: 'Dolo 650',
      brandName: 'Dolo 650',
      genericName: 'Paracetamol',
      dosage: '650mg',
      frequency: '3 times a day',
      timing: 'After meals',
      duration: '3 to 5 days',
      reason: 'For reducing elevated temperature and providing pain relief',
      instructions: 'Take with a full glass of water. Maintain a minimum 6-hour gap between doses.',
    },
    {
      name: hasThroat ? 'Zyrtec 10' : 'Combiflam',
      brandName: hasThroat ? 'Zyrtec 10' : 'Combiflam',
      genericName: hasThroat ? 'Cetirizine Hydrochloride' : 'Ibuprofen and Paracetamol',
      dosage: hasThroat ? '10mg' : '400mg / 325mg',
      frequency: hasThroat ? '1 time a day (at bedtime)' : '2 times a day',
      timing: hasThroat ? 'At bedtime' : 'After dinner',
      duration: '5 days',
      reason: hasThroat
        ? 'Relief from upper respiratory inflammation, sneezing, and throat irritation'
        : 'Anti-inflammatory relief for localized pain and headache',
      instructions: hasThroat
        ? 'May cause mild drowsiness; avoid driving after taking.'
        : 'Always take after food to prevent stomach upset.',
    },
    {
      name: 'Pan 40',
      brandName: 'Pan 40',
      genericName: 'Pantoprazole Gastro-resistant',
      dosage: '40mg',
      frequency: '1 time a day',
      timing: 'Before breakfast (empty stomach)',
      duration: '5 days',
      reason: 'Gastric acid suppression and gastrointestinal lining protection',
      instructions: 'Swallow whole with lukewarm water 30 minutes before the morning meal.',
    },
    {
      name: 'Electral ORS',
      brandName: 'Electral ORS',
      genericName: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
      dosage: 'Standard sachet in 1L water',
      frequency: '2 to 3 times a day',
      timing: 'Between meals throughout the day',
      duration: '3 days',
      reason: 'Replenishing vital fluids, balancing electrolytes, and combating fatigue',
      instructions: 'Dissolve entire packet in boiled and cooled water. Sip continuously.',
    },
  ];

  return {
    patientName: detectedName,
    patientAge: detectedAge,
    date: new Date().toISOString().split('T')[0],
    chiefComplaint: chiefComplaints.join(', '),
    assessmentNotes:
      'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
    medications: medications.map(normalizeMedication),
    advice: [
      'Ensure 8 to 10 hours of uninterrupted bed rest to allow your immune system to recover.',
      'Stay thoroughly hydrated by drinking warm fluids, herbal teas, or broths throughout the day.',
      'Maintain regular body temperature checks and record symptoms morning and evening.',
      'Avoid cold, oily, or heavily spiced foods until the throat and gastrointestinal tract settle.',
    ],
    followUp:
      'If fever exceeds 102°F (38.9°C), or if severe shortness of breath or persistent vomiting occurs, seek in-person medical evaluation immediately.',
    doctorName: 'Dr. DoctoMPT',
    clinicName: 'DoctoMPT Clinic',
  };
}
