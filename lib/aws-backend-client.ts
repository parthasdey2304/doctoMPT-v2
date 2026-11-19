/**
 * Client for DoctoMPT AWS EC2 Backend
 * Connects Next.js frontend with LangGraph + Gemini + Neo4j Vector RAG + 1mg & PharmEasy tools
 * + High-concurrency SQLite (WAL Mode) with zero-downtime backups
 */

const AWS_BACKEND_URL =
  process.env.NEXT_PUBLIC_AWS_BACKEND_URL || 'http://3.26.55.253';

const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || 'doctompt_secure_bridge_2026';

function getHeaders(customHeaders: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...customHeaders,
  };
}

export interface ChatMessageResponse {
  response: string;
  session_id: string;
  tools_called: Array<{
    tool: string;
    args: Record<string, any>;
  }>;
  prescription?: Record<string, any>;
}

export interface ClinicalRecord {
  id?: string;
  session_id?: string;
  patient_name?: string;
  age?: number;
  gender?: string;
  chief_complaint?: string;
  diagnosis?: string;
  transcript?: any;
  prescription?: any;
  created_at?: string;
}

export async function sendChatMessage(
  message: string,
  sessionId?: string,
  patientInfo?: Record<string, any>
): Promise<ChatMessageResponse> {
  const res = await fetch(`${AWS_BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      session_id: sessionId,
      patient_info: patientInfo,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`AWS Backend Error (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function generatePrescription(
  sessionId: string,
  conversationSummary: string,
  patientInfo?: Record<string, any>
) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/prescription/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      conversation_summary: conversationSummary,
      patient_info: patientInfo,
    }),
  });

  if (!res.ok) {
    throw new Error(`Prescription generation failed: ${res.statusText}`);
  }
  return res.json();
}

export async function search1mg(query: string) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/medicines/1mg?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('1mg search failed');
  return res.json();
}

export async function searchPharmEasy(query: string) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/medicines/pharmeasy?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('PharmEasy search failed');
  return res.json();
}

export async function searchKaggleNeo4j(query: string) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/medicines/neo4j?q=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Neo4j search failed');
  return res.json();
}

/* SQLite Clinical Records API */
export async function fetchClinicalRecords(limit = 50, offset = 0) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records?limit=${limit}&offset=${offset}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch clinical records from AWS SQLite');
  return res.json();
}

export async function fetchClinicalRecordById(id: string) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Record not found');
  return res.json();
}

export async function saveClinicalRecord(record: ClinicalRecord) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error('Failed to save record to AWS SQLite');
  return res.json();
}

export async function deleteClinicalRecord(id: string) {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete record from AWS SQLite');
  return res.json();
}

export async function triggerDatabaseBackup() {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records/backup`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to trigger database backup');
  return res.json();
}

export async function listDatabaseBackups() {
  const res = await fetch(`${AWS_BACKEND_URL}/api/records/backups`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to list backups');
  return res.json();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${AWS_BACKEND_URL}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: (err as Error).message };
  }
}
