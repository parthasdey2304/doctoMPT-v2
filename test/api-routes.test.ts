import { test, expect, describe } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as saveConsultationPost, GET as saveConsultationGet } from '../app/api/save-consultation/route';
import { POST as liveTokenPost } from '../app/api/live-token/route';
import { POST as generatePrescriptionPost } from '../app/api/generate-prescription/route';

describe('API Route Handlers', () => {
  test('save-consultation saves a new consultation and returns success', async () => {
    const fakeTranscript = [
      { id: '1', role: 'patient' as const, text: 'Hello doctor, I have a headache.', timestamp: '10:00' },
      { id: '2', role: 'doctor' as const, text: 'Hello! How long have you had this headache?', timestamp: '10:01' },
    ];

    const req = new NextRequest('http://localhost:3000/api/save-consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Alice Smith',
        patientAge: '30 years',
        transcript: fakeTranscript,
      }),
    });

    const res = await saveConsultationPost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.consultation.patientName).toBe('Alice Smith');
    expect(data.consultation.transcript.length).toBe(2);

    // Verify GET returns the saved consultation
    const getRes = await saveConsultationGet();
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(Array.isArray(getData.consultations)).toBe(true);
    expect(getData.consultations.some((c: any) => c.patientName === 'Alice Smith')).toBe(true);
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
