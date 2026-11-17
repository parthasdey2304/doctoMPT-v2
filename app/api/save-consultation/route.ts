import { NextRequest, NextResponse } from 'next/server';
import { SavedConsultation, PrescriptionData } from '@/types/consultation';
import { getSupabaseAdminClient } from '@/lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

// Local disk fallback store for resilience when offline or in isolated tests
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'consultations.json');

function ensureDbFile(): SavedConsultation[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Error accessing local database:', err);
    return [];
  }
}

function saveToDb(items: SavedConsultation[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to local database:', err);
  }
}

function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-client-ip') ||
    (req as any).ip ||
    '127.0.0.1'
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { data: records, error } = await supabase
        .from('consultations')
        .select(`
          id,
          patient_name,
          patient_age,
          primary_condition,
          chief_complaint,
          symptoms,
          clinical_impression,
          doctor_notes,
          clinical_prompt,
          language,
          voice_profile,
          audio_device,
          client_ip,
          user_agent,
          status,
          created_at,
          updated_at,
          consultation_transcripts (
            id,
            turn_index,
            role,
            text,
            timestamp_label,
            created_at
          ),
          prescriptions (
            id,
            patient_name,
            patient_age,
            date,
            chief_complaint,
            assessment_notes,
            advice,
            follow_up,
            reference_code,
            doctor_signature,
            clinic_name,
            created_at,
            prescription_medications (
              id,
              medicine_name,
              brand_name,
              generic_name,
              dosage_strength,
              frequency,
              timing,
              duration,
              clinical_reason,
              instructions,
              created_at
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(records)) {
        const consultations: SavedConsultation[] = records.map((c: any) => {
          const transcripts = (c.consultation_transcripts || [])
            .sort((a: any, b: any) => (a.turn_index ?? 0) - (b.turn_index ?? 0))
            .map((t: any) => ({
              id: t.id,
              role: t.role as 'doctor' | 'patient',
              text: t.text,
              timestamp: t.timestamp_label || '',
            }));

          let prescription: PrescriptionData | undefined = undefined;
          const rxList = Array.isArray(c.prescriptions)
            ? c.prescriptions.slice().sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            : (c.prescriptions ? [c.prescriptions] : []);
          const rx = rxList[0];

          if (rx) {
            const medList = (rx.prescription_medications || [])
              .slice()
              .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
              .map((m: any) => ({
                name: m.brand_name || m.medicine_name || 'Medication',
                brandName: m.brand_name || m.medicine_name || '',
                genericName: m.generic_name || '',
                dosage: m.dosage_strength || '',
                frequency: m.frequency || '',
                timing: m.timing || '',
                duration: m.duration || '',
                reason: m.clinical_reason || '',
                instructions: m.instructions || '',
              }));

            prescription = {
              patientName: rx.patient_name || c.patient_name || '',
              patientAge: rx.patient_age || c.patient_age || '',
              date: rx.date || '',
              chiefComplaint: rx.chief_complaint || c.chief_complaint || '',
              assessmentNotes: rx.assessment_notes || c.doctor_notes || '',
              advice: Array.isArray(rx.advice) ? rx.advice : (typeof rx.advice === 'string' ? [rx.advice] : []),
              followUp: rx.follow_up || '',
              doctorName: rx.doctor_signature || 'Dr. DoctoMPT',
              clinicName: rx.clinic_name || 'DoctoMPT Clinic',
              referenceCode: rx.reference_code || undefined,
              medications: medList,
            };
          }

          return {
            id: c.id,
            createdAt: c.created_at,
            patientName: c.patient_name || 'Demo Patient',
            patientAge: c.patient_age || 'Not specified',
            primaryCondition: c.primary_condition || c.chief_complaint || 'General Consultation',
            chiefComplaint: c.chief_complaint || c.primary_condition || 'General Consultation',
            symptoms: c.symptoms || [],
            clinicalImpression: c.clinical_impression,
            doctorNotes: c.doctor_notes,
            clinicalPrompt: c.clinical_prompt || undefined,
            language: c.language,
            voiceProfile: c.voice_profile,
            audioDevice: c.audio_device,
            clientIp: c.client_ip,
            userAgent: c.user_agent,
            status: c.status,
            transcript: transcripts,
            prescription,
          };
        });

        return NextResponse.json({ consultations, source: 'supabase' });
      } else if (error) {
        console.warn('Supabase query failed, falling back to local database:', error.message);
      }
    }

    // Local fallback
    const consultations = ensureDbFile();
    consultations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ consultations, source: 'local' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve consultations' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientName,
      patientAge,
      transcript,
      prescription,
      primaryCondition,
      chiefComplaint,
      symptoms,
      clinicalImpression,
      doctorNotes,
      clinicalPrompt,
      systemInstruction,
      language,
      voiceProfile,
      audioDevice,
    } = body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Consultation transcript is required' },
        { status: 400 }
      );
    }

    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const patName = patientName || prescription?.patientName || 'Demo Patient';
    const patAge = patientAge || prescription?.patientAge || 'Not specified';

    const resolvedPrimaryCondition =
      primaryCondition ||
      chiefComplaint ||
      prescription?.chiefComplaint ||
      (transcript.find((t: any) => t.role === 'patient')?.text?.substring(0, 120)) ||
      'General Consultation';

    const resolvedChiefComplaint =
      chiefComplaint ||
      primaryCondition ||
      prescription?.chiefComplaint ||
      resolvedPrimaryCondition;

    const resolvedSymptoms =
      Array.isArray(symptoms) && symptoms.length > 0
        ? symptoms
        : prescription?.chiefComplaint
        ? [prescription.chiefComplaint]
        : [];

    const resolvedClinicalImpression =
      clinicalImpression ||
      doctorNotes ||
      prescription?.assessmentNotes ||
      (transcript.filter((t: any) => t.role === 'doctor').slice(-1)[0]?.text) ||
      'Clinical consultation completed.';

    const resolvedDoctorNotes =
      doctorNotes ||
      clinicalImpression ||
      prescription?.assessmentNotes ||
      resolvedClinicalImpression;

    const resolvedClinicalPrompt = clinicalPrompt || systemInstruction || null;
    const resolvedLanguage = language || 'Doctor will understand';
    const resolvedVoice = voiceProfile || 'Charon';
    const resolvedAudioDevice = audioDevice || 'Default Microphone';

    let recordId = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let createdAt = new Date().toISOString();
    let savedToSupabase = false;

    // Supabase Relational Persistence
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        // 1. Insert into consultations table
        const { data: consultationRow, error: consultationErr } = await supabase
          .from('consultations')
          .insert({
            patient_name: patName,
            patient_age: patAge,
            primary_condition: resolvedPrimaryCondition,
            chief_complaint: resolvedChiefComplaint,
            symptoms: resolvedSymptoms,
            clinical_impression: resolvedClinicalImpression,
            doctor_notes: resolvedDoctorNotes,
            clinical_prompt: resolvedClinicalPrompt,
            language: resolvedLanguage,
            voice_profile: resolvedVoice,
            audio_device: resolvedAudioDevice,
            client_ip: clientIp,
            user_agent: userAgent,
            status: 'completed',
          })
          .select()
          .single();

        if (consultationErr) {
          console.error('Supabase error inserting consultation:', consultationErr);
        } else if (consultationRow) {
          recordId = consultationRow.id;
          createdAt = consultationRow.created_at;

          // 2. Insert into consultation_transcripts
          const transcriptRows = transcript.map((item: any, idx: number) => ({
            consultation_id: consultationRow.id,
            turn_index: idx,
            role: item.role === 'doctor' ? 'doctor' : 'patient',
            text: (typeof item.text === 'string' && item.text.trim()) ? item.text : '[No dialogue]',
            timestamp_label: item.timestamp || '',
          }));

          // Batch insert in chunks of 100 for safety
          const CHUNK_SIZE = 100;
          let transcriptFailed = false;
          for (let i = 0; i < transcriptRows.length; i += CHUNK_SIZE) {
            const chunk = transcriptRows.slice(i, i + CHUNK_SIZE);
            const { error: tErr } = await supabase.from('consultation_transcripts').insert(chunk);
            if (tErr) {
              console.error('Supabase error inserting transcript chunk:', tErr);
              transcriptFailed = true;
              break;
            }
          }

          if (transcriptFailed) {
            // Roll back the orphaned consultation
            await supabase.from('consultations').delete().eq('id', consultationRow.id);
            console.warn('Rolled back consultation row due to transcript insertion failure');
          } else {
            savedToSupabase = true;

            // 3. Insert into prescriptions (if prescription was generated)
            if (prescription) {
              const { data: rxRow, error: rxErr } = await supabase
                .from('prescriptions')
                .insert({
                  consultation_id: consultationRow.id,
                  patient_name: prescription.patientName || patName,
                  patient_age: prescription.patientAge || patAge,
                  date: prescription.date || new Date().toLocaleDateString(),
                  chief_complaint: prescription.chiefComplaint || resolvedChiefComplaint,
                  assessment_notes: prescription.assessmentNotes || resolvedDoctorNotes,
                  advice: Array.isArray(prescription.advice) ? prescription.advice : [],
                  follow_up: prescription.followUp || 'As needed',
                  reference_code: prescription.referenceCode || `RX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                  doctor_signature: prescription.doctorName || 'Dr. DoctoMPT',
                  clinic_name: prescription.clinicName || 'DoctoMPT Clinic',
                })
                .select()
                .single();

              if (rxErr) {
                console.error('Supabase error inserting prescription:', rxErr);
              } else if (rxRow && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
                // 4. Insert into prescription_medications
                const medRows = prescription.medications.map((m: any) => ({
                  prescription_id: rxRow.id,
                  medicine_name: m.name || m.brandName || 'Medication',
                  brand_name: m.brandName || m.name || null,
                  generic_name: m.genericName || null,
                  dosage_strength: m.dosage || '',
                  frequency: m.frequency || '',
                  timing: m.timing || '',
                  duration: m.duration || '',
                  clinical_reason: m.reason || '',
                  instructions: m.instructions || '',
                }));

                const { error: medErr } = await supabase
                  .from('prescription_medications')
                  .insert(medRows);

                if (medErr) {
                  console.error('Supabase error inserting medications:', medErr);
                }
              }
            }
          }
        }
      } catch (dbErr) {
        console.error('Exception during Supabase operations:', dbErr);
      }
    }

    const newRecord: SavedConsultation = {
      id: recordId,
      createdAt,
      patientName: patName,
      patientAge: patAge,
      primaryCondition: resolvedPrimaryCondition,
      chiefComplaint: resolvedChiefComplaint,
      symptoms: resolvedSymptoms,
      clinicalImpression: resolvedClinicalImpression,
      doctorNotes: resolvedDoctorNotes,
      clinicalPrompt: resolvedClinicalPrompt || undefined,
      language: resolvedLanguage,
      voiceProfile: resolvedVoice,
      audioDevice: resolvedAudioDevice,
      clientIp,
      userAgent,
      status: 'completed',
      transcript,
      prescription,
    };

    // Dual-store resilience: local disk store
    const existing = ensureDbFile();
    existing.unshift(newRecord);
    saveToDb(existing);

    return NextResponse.json({
      success: true,
      message: savedToSupabase
        ? 'Consultation successfully saved to Supabase SQL database'
        : 'Consultation saved to local backup store',
      source: savedToSupabase ? 'supabase' : 'local',
      consultation: newRecord,
    });
  } catch (error: any) {
    console.error('Error saving consultation:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save consultation' },
      { status: 500 }
    );
  }
}
