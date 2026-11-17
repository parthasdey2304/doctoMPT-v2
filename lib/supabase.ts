import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbConsultation {
  id?: string;
  patient_name?: string | null;
  patient_age?: string | null;
  primary_condition?: string | null;
  chief_complaint?: string | null;
  symptoms?: string[] | null;
  clinical_impression?: string | null;
  doctor_notes?: string | null;
  clinical_prompt?: string | null;
  language?: string | null;
  voice_profile?: string | null;
  audio_device?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbConsultationTranscript {
  id?: string;
  consultation_id: string;
  turn_index: number;
  role: 'doctor' | 'patient';
  text: string;
  timestamp_label?: string | null;
  created_at?: string;
}

export interface DbPrescription {
  id?: string;
  consultation_id: string;
  patient_name?: string | null;
  patient_age?: string | null;
  date?: string | null;
  chief_complaint?: string | null;
  assessment_notes?: string | null;
  advice?: string[] | null;
  follow_up?: string | null;
  reference_code?: string | null;
  doctor_signature?: string | null;
  clinic_name?: string | null;
  created_at?: string;
}

export interface DbPrescriptionMedication {
  id?: string;
  prescription_id: string;
  medicine_name: string;
  brand_name?: string | null;
  generic_name?: string | null;
  dosage_strength?: string | null;
  frequency?: string | null;
  timing?: string | null;
  duration?: string | null;
  clinical_reason?: string | null;
  instructions?: string | null;
  created_at?: string;
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Server-side Supabase client using Service Role / Secret Key for administrative read/write operations.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() || getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedAdminClient;
}

/**
 * Browser-side Supabase client using Anon / Publishable key.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(url, key);
  }

  return cachedBrowserClient;
}
