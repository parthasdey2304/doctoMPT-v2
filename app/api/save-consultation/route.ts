import { NextRequest, NextResponse } from 'next/server';
import { SavedConsultation } from '@/types/consultation';
import * as fs from 'fs';
import * as path from 'path';

// Local disk-backed NoSQL document store for consultation reliability
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

export async function GET() {
  try {
    const consultations = ensureDbFile();
    // Return recent first
    consultations.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ consultations });
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
    const { patientName, patientAge, transcript, prescription } = body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: 'Consultation transcript is required' },
        { status: 400 }
      );
    }

    const newRecord: SavedConsultation = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      patientName: patientName || prescription?.patientName || 'Demo Patient',
      patientAge: patientAge || prescription?.patientAge || 'Not specified',
      transcript,
      prescription,
    };

    const existing = ensureDbFile();
    existing.unshift(newRecord);
    saveToDb(existing);

    return NextResponse.json({
      success: true,
      message: 'Consultation successfully saved to database',
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
