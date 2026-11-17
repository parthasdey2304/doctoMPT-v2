-- ==============================================================================
-- Supabase Schema: Clinical Consultation & Electronic Health Records (EMR)
-- Tables: consultations, consultation_transcripts, prescriptions, prescription_medications
-- ==============================================================================

-- 1. Consultations Table
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT,
    patient_age TEXT,
    primary_condition TEXT,
    chief_complaint TEXT,
    symptoms TEXT[] DEFAULT '{}',
    clinical_impression TEXT,
    doctor_notes TEXT,
    clinical_prompt TEXT,
    language TEXT,
    voice_profile TEXT,
    audio_device TEXT,
    client_ip TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Consultation Transcripts Table (Child of consultations)
CREATE TABLE IF NOT EXISTS consultation_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    turn_index INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
    text TEXT NOT NULL,
    timestamp_label TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Prescriptions Table (Child of consultations)
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    patient_name TEXT,
    patient_age TEXT,
    date TEXT,
    chief_complaint TEXT,
    assessment_notes TEXT,
    advice TEXT[] DEFAULT '{}',
    follow_up TEXT,
    reference_code TEXT,
    doctor_signature TEXT DEFAULT 'Dr. DoctoMPT',
    clinic_name TEXT DEFAULT 'DoctoMPT Clinic',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Prescription Medications Table (Child of prescriptions)
CREATE TABLE IF NOT EXISTS prescription_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name TEXT,
    brand_name TEXT,
    generic_name TEXT,
    dosage_strength TEXT,
    frequency TEXT,
    timing TEXT,
    duration TEXT,
    clinical_reason TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for high-performance relational queries & foreign key lookups
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_consultation_id ON consultation_transcripts(consultation_id, turn_index ASC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON prescription_medications(prescription_id);

-- Enable RLS and create permissive policies for anon / authenticated / service_role
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_medications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access consultations" ON consultations;
    CREATE POLICY "Public access consultations" ON consultations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access consultation_transcripts" ON consultation_transcripts;
    CREATE POLICY "Public access consultation_transcripts" ON consultation_transcripts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access prescriptions" ON prescriptions;
    CREATE POLICY "Public access prescriptions" ON prescriptions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access prescription_medications" ON prescription_medications;
    CREATE POLICY "Public access prescription_medications" ON prescription_medications FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Grant permissions to standard Supabase roles
GRANT ALL ON consultations TO anon, authenticated, service_role;
GRANT ALL ON consultation_transcripts TO anon, authenticated, service_role;
GRANT ALL ON prescriptions TO anon, authenticated, service_role;
GRANT ALL ON prescription_medications TO anon, authenticated, service_role;
