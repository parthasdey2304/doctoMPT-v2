# Supabase EMR & Database Invariants

1. **Relational Table Structure**:
   - `consultations` (Parent table with UUID PK, patient name, age, primary condition, chief complaint, doctor notes, prompt, IP, device metadata).
   - `consultation_transcripts` (Child table with `consultation_id REFERENCES consultations(id) ON DELETE CASCADE`, turn index, role, message text).
   - `prescriptions` (Child table with `consultation_id REFERENCES consultations(id) ON DELETE CASCADE`, clinic name, diagnosis, advice, reference code, signature).
   - `prescription_medications` (Child table with `prescription_id REFERENCES prescriptions(id) ON DELETE CASCADE`, medicine brand, generic molecule, dosage strength, frequency, timing, duration).

2. **Client IP & Device Extraction**:
   - Parse client IP via leading token of `x-forwarded-for`, falling back to `x-real-ip`, `cf-connecting-ip`, or socket IP.
   - Capture audio input device label and consultation language from request payload.

3. **Atomic Persistence & Rollback**:
   - If parent consultation succeeds but child transcript or prescription insertion fails, trigger cleanup rollback to prevent orphaned rows.
