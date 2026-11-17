import { test, expect, describe, afterAll } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as saveConsultationPost, GET as saveConsultationGet } from '../app/api/save-consultation/route';
import { POST as liveTokenPost } from '../app/api/live-token/route';
import { POST as generatePrescriptionPost } from '../app/api/generate-prescription/route';
import { getSupabaseAdminClient } from '../lib/supabase';
import * as fs from 'fs';
import * as path from 'path';

describe('API Route Handlers', () => {
  const createdTestIds: string[] = [];

  afterAll(async () => {
    // Clean up all temporary test records so the clinical database remains pure
    const supabase = getSupabaseAdminClient();
    if (supabase && createdTestIds.length > 0) {
      for (const id of createdTestIds) {
        await supabase.from('consultations').delete().eq('id', id);
      }
    }

    const dataDir = path.join(process.cwd(), '.data');
    const dbFile = path.join(dataDir, 'consultations.json');
    if (fs.existsSync(dbFile) && createdTestIds.length > 0) {
      try {
        const items = JSON.parse(fs.readFileSync(dbFile, 'utf8') || '[]');
        const filtered = items.filter((item: any) => !createdTestIds.includes(item.id));
        fs.writeFileSync(dbFile, JSON.stringify(filtered, null, 2), 'utf8');
      } catch (err) {
        console.warn('Failed to clean up test records from local dbFile:', err);
      }
    }
  });

  test('save-consultation saves a new consultation and returns success', async () => {
    const fakeTranscript = [
      { id: '1', role: 'patient' as const, text: 'Hello doctor, I have a headache.', timestamp: '10:00' },
      { id: '2', role: 'doctor' as const, text: 'Hello! How long have you had this headache?', timestamp: '10:01' },
    ];

    const req = new NextRequest('http://localhost:3000/api/save-consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.195, 10.0.0.1',
        'user-agent': 'DoctoMPT-Test-Agent/1.0',
      },
      body: JSON.stringify({
        patientName: 'Alice Smith',
        patientAge: '30 years',
        transcript: fakeTranscript,
        language: 'English',
        voiceProfile: 'Charon (Mature, Calm Male Doctor)',
        audioDevice: 'Default - Microphone Array (Intel Smart Sound)',
      }),
    });

    const res = await saveConsultationPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    if (data.consultation?.id) createdTestIds.push(data.consultation.id);
    expect(data.consultation.patientName).toBe('Alice Smith');
    expect(data.consultation.transcript.length).toBe(2);
    expect(data.consultation.clientIp).toBe('203.0.113.195');
    expect(data.consultation.userAgent).toBe('DoctoMPT-Test-Agent/1.0');
    expect(data.consultation.language).toBe('English');

    // Verify GET returns the saved consultation
    const getRes = await saveConsultationGet();
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(Array.isArray(getData.consultations)).toBe(true);
    expect(getData.consultations.some((c: any) => c.patientName === 'Alice Smith')).toBe(true);
  });

  test('save-consultation saves full relational prescription and medications to Supabase', async () => {
    const fakeTranscript = [
      { id: 't1', role: 'patient' as const, text: 'I have severe sinus congestion and a productive cough for 4 days.', timestamp: '11:15' },
      { id: 't2', role: 'doctor' as const, text: 'Let me examine your symptoms and prescribe appropriate medication.', timestamp: '11:16' },
    ];

    const fakePrescription = {
      patientName: 'Robert Martinez',
      patientAge: '42 years',
      date: '18/11/2026',
      chiefComplaint: 'Acute Sinusitis with Productive Cough',
      assessmentNotes: 'Patient exhibits nasal congestion and mucopurulent rhinorrhea. Started on antibiotic and antihistamine regimen.',
      advice: ['Steam inhalation twice daily', 'Hydrate with warm fluids', 'Rest adequately'],
      followUp: '7 days if fever persists',
      doctorName: 'Dr. DoctoMPT',
      clinicName: 'DoctoMPT Clinical Center',
      medications: [
        {
          name: 'Augmentin 625 Duo',
          brandName: 'Augmentin 625 Duo',
          genericName: 'Amoxicillin + Clavulanic Acid (500mg + 125mg)',
          dosage: '625 mg',
          frequency: 'Twice daily (BD)',
          timing: 'After meals',
          duration: '5 days',
          reason: 'Bacterial rhinosinusitis coverage',
          instructions: 'Complete full course even if symptoms subside',
        },
        {
          name: 'Allegra 120mg',
          brandName: 'Allegra 120mg',
          genericName: 'Fexofenadine HCl (120mg)',
          dosage: '120 mg',
          frequency: 'Once daily (OD)',
          timing: 'At bedtime',
          duration: '5 days',
          reason: 'Antihistamine for congestion relief',
          instructions: 'Take with water before sleeping',
        },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/save-consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': '198.51.100.42',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DoctoMPT-Clinical-Suite',
      },
      body: JSON.stringify({
        patientName: 'Robert Martinez',
        patientAge: '42 years',
        transcript: fakeTranscript,
        prescription: fakePrescription,
        primaryCondition: 'Acute Sinusitis',
        chiefComplaint: 'Acute Sinusitis with Productive Cough',
        symptoms: ['Sinus congestion', 'Productive cough', 'Facial pressure'],
        doctorNotes: 'Bacterial sinusitis likely. Prescribed Augmentin and Allegra.',
        clinicalPrompt: 'You are Dr. DoctoMPT specializing in acute ENT triage.',
        language: 'Doctor will understand',
        voiceProfile: 'Charon',
        audioDevice: 'High Definition Audio Device (Microphone)',
      }),
    });

    const res = await saveConsultationPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    if (data.consultation?.id) createdTestIds.push(data.consultation.id);
    expect(data.consultation.patientName).toBe('Robert Martinez');
    expect(data.consultation.clientIp).toBe('198.51.100.42');
    expect(data.consultation.primaryCondition).toBe('Acute Sinusitis');
    expect(data.consultation.chiefComplaint).toBe('Acute Sinusitis with Productive Cough');
    expect(data.consultation.clinicalPrompt).toBe('You are Dr. DoctoMPT specializing in acute ENT triage.');
    expect(data.consultation.prescription).toBeDefined();
    expect(data.consultation.prescription.medications.length).toBe(2);

    // Verify GET returns the relational records
    const getRes = await saveConsultationGet();
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    const robert = getData.consultations.find((c: any) => c.patientName === 'Robert Martinez');
    expect(robert).toBeDefined();
    expect(robert.transcript.length).toBe(2);
    expect(robert.primaryCondition).toBe('Acute Sinusitis');
    expect(robert.chiefComplaint).toBe('Acute Sinusitis with Productive Cough');
    expect(robert.clinicalPrompt).toBe('You are Dr. DoctoMPT specializing in acute ENT triage.');
    expect(robert.prescription).toBeDefined();
    expect(robert.prescription.clinicName).toBe('DoctoMPT Clinical Center');
    expect(robert.prescription.referenceCode).toBeDefined();
    expect(robert.prescription.medications.length).toBe(2);
    expect(robert.prescription.medications[0].genericName).toContain('Amoxicillin');
  });

  test('save-consultation handles multi-hop x-forwarded-for headers and large transcripts', async () => {
    const longTranscript = Array.from({ length: 25 }, (_, i) => ({
      id: `t_${i}`,
      role: i % 2 === 0 ? ('patient' as const) : ('doctor' as const),
      text: i % 2 === 0 ? `Patient report turn ${i}: fever and chills` : `Doctor response turn ${i}: note taken`,
      timestamp: `10:${String(i).padStart(2, '0')}`,
    }));

    const req = new NextRequest('http://localhost:3000/api/save-consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '103.21.244.2, 192.168.1.1, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 DoctoMPT-Benchmark/2.0',
      },
      body: JSON.stringify({
        patientName: 'Benchmark Patient',
        patientAge: '55 years',
        transcript: longTranscript,
        primaryCondition: 'Recurrent Febrile Illness',
        chiefComplaint: 'High grade fever with rigors',
        symptoms: ['Fever', 'Rigors', 'Body ache'],
        clinicalPrompt: 'Standard Internal Medicine Prompt',
      }),
    });

    const res = await saveConsultationPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    if (data.consultation?.id) createdTestIds.push(data.consultation.id);
    expect(data.consultation.clientIp).toBe('103.21.244.2');
    expect(data.consultation.transcript.length).toBe(25);
    expect(data.consultation.primaryCondition).toBe('Recurrent Febrile Illness');
    expect(data.consultation.chiefComplaint).toBe('High grade fever with rigors');
    expect(data.consultation.clinicalPrompt).toBe('Standard Internal Medicine Prompt');
  });

  test('save-consultation returns 400 when transcript is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/save-consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: 'No Transcript',
      }),
    });

    const res = await saveConsultationPost(req);
    expect(res.status).toBe(400);
  });

  test('live-token returns 400 when GEMINI_API_KEY is not configured', async () => {
    // When no header is passed and env var is empty
    const prevKey = process.env.GEMINI_API_KEY;
    const prevGoogleKey = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const req = new NextRequest('http://localhost:3000/api/live-token', {
      method: 'POST',
    });

    const res = await liveTokenPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('GEMINI_API_KEY');

    // Restore
    if (prevKey) process.env.GEMINI_API_KEY = prevKey;
    if (prevGoogleKey) process.env.GOOGLE_API_KEY = prevGoogleKey;
  });

  test('generate-prescription returns 400 when transcript is missing or empty', async () => {
    const req = new NextRequest('http://localhost:3000/api/generate-prescription', {
      method: 'POST',
      headers: { 'x-gemini-api-key': 'test-key-placeholder' },
      body: JSON.stringify({
        transcript: [],
      }),
    });

    const res = await generatePrescriptionPost(req);
    expect(res.status).toBe(400);
  });
});
