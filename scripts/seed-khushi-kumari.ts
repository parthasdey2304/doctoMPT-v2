import { getSupabaseAdminClient } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

async function seedData() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('Failed to initialize Supabase client.');
    process.exit(1);
  }

  console.log('--- Cleaning dummy test records from Supabase ---');
  // Delete all dummy/test consultation records
  // Match any test names or delete non-Khushi records
  const { data: existingConsultations, error: fetchErr } = await supabase
    .from('consultations')
    .select('id, patient_name');

  if (fetchErr) {
    console.error('Error fetching existing consultations:', fetchErr);
  } else if (existingConsultations && existingConsultations.length > 0) {
    console.log(`Found ${existingConsultations.length} records in consultations table.`);
    for (const record of existingConsultations) {
      if (record.patient_name !== 'Khushi Kumari') {
        console.log(`Deleting dummy record: ${record.id} (${record.patient_name})`);
        const { error: delErr } = await supabase
          .from('consultations')
          .delete()
          .eq('id', record.id);
        if (delErr) {
          console.error(`Error deleting ${record.id}:`, delErr);
        }
      }
    }
  }

  // Also clean any orphaned rows in prescriptions or transcripts
  const { data: orphanRx } = await supabase.from('prescriptions').select('id, patient_name');
  if (orphanRx) {
    for (const rx of orphanRx) {
      if (rx.patient_name !== 'Khushi Kumari') {
        await supabase.from('prescriptions').delete().eq('id', rx.id);
      }
    }
  }

  console.log('--- Checking if Khushi Kumari already exists ---');
  const { data: existingKhushi } = await supabase
    .from('consultations')
    .select('id, patient_name')
    .eq('patient_name', 'Khushi Kumari');

  let khushiConsultationId: string;

  if (existingKhushi && existingKhushi.length > 0) {
    console.log(`Khushi Kumari consultation already exists with id: ${existingKhushi[0].id}`);
    khushiConsultationId = existingKhushi[0].id;
    // Delete existing to re-insert freshly and cleanly
    await supabase.from('consultations').delete().eq('id', khushiConsultationId);
  }

  console.log('--- Inserting real consultation record for Khushi Kumari ---');
  const { data: consultation, error: consErr } = await supabase
    .from('consultations')
    .insert({
      patient_name: 'Khushi Kumari',
      patient_age: '21 years',
      primary_condition: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      chief_complaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      symptoms: [
        'Elevated body temperature / fever',
        'Sore throat and respiratory irritation',
        'Body ache',
        'Fatigue'
      ],
      clinical_impression:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
      doctor_notes:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
      clinical_prompt:
        'You are Dr. DoctoMPT, an empathetic, highly experienced clinician specializing in virtual outpatient triage and primary care.',
      language: 'Doctor will understand',
      voice_profile: 'Charon (Mature, Calm Male Doctor)',
      audio_device: 'Default Microphone',
      client_ip: '103.21.244.15',
      user_agent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      status: 'completed',
      created_at: '2026-11-17T19:40:00.000Z',
    })
    .select()
    .single();

  if (consErr || !consultation) {
    console.error('Error inserting consultation:', consErr);
    process.exit(1);
  }

  khushiConsultationId = consultation.id;
  console.log(`Successfully created consultation: ${khushiConsultationId}`);

  console.log('--- Inserting realistic transcripts for Khushi Kumari ---');
  const transcripts = [
    {
      consultation_id: khushiConsultationId,
      turn_index: 0,
      role: 'doctor',
      text: 'Hello, I am Dr. DoctoMPT. I am here to help you today. Could you please share your name, age, and what brings you in?',
      timestamp_label: '19:40',
      created_at: '2026-11-17T19:40:05.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 1,
      role: 'patient',
      text: 'Hi Doctor, my name is Khushi Kumari, I am 21 years old. I have been running a high fever and have a scratchy sore throat and body aches since yesterday.',
      timestamp_label: '19:40',
      created_at: '2026-11-17T19:40:25.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 2,
      role: 'doctor',
      text: 'Hello Khushi. Thank you for sharing. How high has the fever reached, and do you have any severe difficulty swallowing, breathing trouble, or cough?',
      timestamp_label: '19:41',
      created_at: '2026-11-17T19:41:00.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 3,
      role: 'patient',
      text: 'The fever was around 101°F last night. Swallowing is a bit painful and I have mild throat irritation, but breathing is normal. I just feel very weak and tired.',
      timestamp_label: '19:41',
      created_at: '2026-11-17T19:41:35.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 4,
      role: 'doctor',
      text: 'Understood, Khushi. Your presentation is consistent with an acute mild viral upper respiratory syndrome. Vital signs in our virtual triage appear stable. I will prepare a comprehensive supportive pharmacological prescription with antipyretics, hydration, and rest. Would you like me to generate your prescription now?',
      timestamp_label: '19:42',
      created_at: '2026-11-17T19:42:10.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 5,
      role: 'patient',
      text: 'Yes please, Doctor. That would be very helpful. Thank you.',
      timestamp_label: '19:42',
      created_at: '2026-11-17T19:42:25.000Z',
    },
    {
      consultation_id: khushiConsultationId,
      turn_index: 6,
      role: 'doctor',
      text: 'Certainly, Khushi. I am generating your official digital prescription and care guidance right now. Please rest well and stay hydrated.',
      timestamp_label: '19:42',
      created_at: '2026-11-17T19:42:45.000Z',
    },
  ];

  const { error: trErr } = await supabase.from('consultation_transcripts').insert(transcripts);
  if (trErr) {
    console.error('Error inserting transcripts:', trErr);
  } else {
    console.log(`Inserted ${transcripts.length} transcript turns.`);
  }

  console.log('--- Inserting real prescription for Khushi Kumari ---');
  const adviceList = [
    'Ensure 8 to 10 hours of uninterrupted bed rest to allow your immune system to recover.',
    'Stay thoroughly hydrated by drinking warm fluids, herbal teas, or broths throughout the day.',
    'Maintain regular body temperature checks and record symptoms morning and evening.',
    'Avoid cold, oily, or heavily spiced foods until the throat and gastrointestinal tract settle.',
  ];

  const { data: prescription, error: rxErr } = await supabase
    .from('prescriptions')
    .insert({
      consultation_id: khushiConsultationId,
      patient_name: 'Khushi Kumari',
      patient_age: '21 years',
      date: '2026-11-17',
      chief_complaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      assessment_notes:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
      advice: adviceList,
      follow_up:
        'If fever exceeds 102°F (38.9°C), or if severe shortness of breath or persistent vomiting occurs, seek in-person medical evaluation immediately.',
      reference_code: 'RX-MWL3FWAQ',
      doctor_signature: 'Dr. DoctoMPT',
      clinic_name: 'DOCTOMPT MEDICAL CLINIC',
      created_at: '2026-11-17T19:43:00.000Z',
    })
    .select()
    .single();

  if (rxErr || !prescription) {
    console.error('Error inserting prescription:', rxErr);
    process.exit(1);
  }

  console.log(`Successfully created prescription: ${prescription.id}`);

  console.log('--- Inserting 4 real medications ---');
  const medications = [
    {
      prescription_id: prescription.id,
      medicine_name: 'Dolo 650',
      brand_name: 'Dolo 650',
      generic_name: 'Paracetamol',
      dosage_strength: '650mg',
      frequency: '3 times a day',
      timing: 'After meals',
      duration: '3 to 5 days',
      clinical_reason: 'For reducing elevated temperature and providing pain relief',
      instructions: 'Take with a full glass of water. Maintain a minimum 6-hour gap between doses.',
    },
    {
      prescription_id: prescription.id,
      medicine_name: 'Zyrtec 10',
      brand_name: 'Zyrtec 10',
      generic_name: 'Cetirizine Hydrochloride',
      dosage_strength: '10mg',
      frequency: '1 time a day (at bedtime)',
      timing: 'At bedtime',
      duration: '5 days',
      clinical_reason: 'Relief from upper respiratory inflammation, sneezing, and throat irritation',
      instructions: 'May cause mild drowsiness; avoid driving after taking.',
    },
    {
      prescription_id: prescription.id,
      medicine_name: 'Pan 40',
      brand_name: 'Pan 40',
      generic_name: 'Pantoprazole Gastro-resistant',
      dosage_strength: '40mg',
      frequency: '1 time a day',
      timing: 'Before breakfast (empty stomach)',
      duration: '5 days',
      clinical_reason: 'Gastric acid suppression and gastrointestinal lining protection',
      instructions: 'Swallow whole with lukewarm water 30 minutes before the morning meal.',
    },
    {
      prescription_id: prescription.id,
      medicine_name: 'Electral ORS',
      brand_name: 'Electral ORS',
      generic_name: 'Oral Electrolyte Rehydration Salts (WHO Formula)',
      dosage_strength: 'Standard sachet in 1L water',
      frequency: '2 to 3 times a day',
      timing: 'Between meals throughout the day',
      duration: '3 days',
      clinical_reason: 'Replenishing vital fluids, balancing electrolytes, and combating fatigue',
      instructions: 'Dissolve entire packet in boiled and cooled water. Sip continuously.',
    },
  ];

  const { error: medErr } = await supabase.from('prescription_medications').insert(medications);
  if (medErr) {
    console.error('Error inserting medications:', medErr);
  } else {
    console.log(`Inserted ${medications.length} medications successfully.`);
  }

  console.log('--- Syncing local disk store (.data/consultations.json) ---');
  const dataDir = path.join(process.cwd(), '.data');
  const dbFile = path.join(dataDir, 'consultations.json');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const localRecord = {
    id: khushiConsultationId,
    createdAt: '2026-11-17T19:40:00.000Z',
    patientName: 'Khushi Kumari',
    patientAge: '21 years',
    primaryCondition: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
    chiefComplaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
    symptoms: [
      'Elevated body temperature / fever',
      'Sore throat and respiratory irritation',
      'Body ache',
      'Fatigue'
    ],
    clinicalImpression:
      'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
    doctorNotes:
      'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
    clinicalPrompt:
      'You are Dr. DoctoMPT, an empathetic, highly experienced clinician specializing in virtual outpatient triage and primary care.',
    language: 'Doctor will understand',
    voiceProfile: 'Charon (Mature, Calm Male Doctor)',
    audioDevice: 'Default Microphone',
    clientIp: '103.21.244.15',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    status: 'completed',
    transcript: transcripts.map((t) => ({
      id: t.turn_index.toString(),
      role: t.role as 'doctor' | 'patient',
      text: t.text,
      timestamp: t.timestamp_label,
    })),
    prescription: {
      patientName: 'Khushi Kumari',
      patientAge: '21 years',
      date: '2026-11-17',
      chiefComplaint: 'Elevated body temperature / fever, Sore throat and respiratory irritation',
      assessmentNotes:
        'Patient presented with acute symptoms consistent with mild viral/upper respiratory syndrome or tension cephalea. Vital signs stable in virtual triage. Recommended supportive pharmacological therapy with hydration and rest.',
      advice: adviceList,
      followUp:
        'If fever exceeds 102°F (38.9°C), or if severe shortness of breath or persistent vomiting occurs, seek in-person medical evaluation immediately.',
      referenceCode: 'RX-MWL3FWAQ',
      doctorName: 'Dr. DoctoMPT',
      clinicName: 'DOCTOMPT MEDICAL CLINIC',
      medications: medications.map((m) => ({
        name: m.medicine_name,
        brandName: m.brand_name,
        genericName: m.generic_name,
        dosage: m.dosage_strength,
        frequency: m.frequency,
        timing: m.timing,
        duration: m.duration,
        reason: m.clinical_reason,
        instructions: m.instructions,
      })),
    },
  };

  fs.writeFileSync(dbFile, JSON.stringify([localRecord], null, 2), 'utf8');
  console.log('Local store synchronized cleanly with Khushi Kumari record.');
}

seedData()
  .then(() => {
    console.log('Seeding and cleanup completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
