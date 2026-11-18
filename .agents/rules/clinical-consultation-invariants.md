# Clinical Consultation & Voice Invariants

1. **Immediate Doctor Greeting**:
   - The attending physician (Dr. DoctoMPT) must always speak first as soon as the voice consultation session connects.
   - The opening greeting must introduce the doctor and ask for the patient's name and age before proceeding to symptom triage.

2. **Mandatory Wrap-Up Protocol**:
   - Once initial symptoms and medications are covered, the doctor must explicitly ask: *"Do you have any other symptoms or health issues you'd like to discuss?"*
   - If no further symptoms are reported, the doctor must offer: *"Would you like me to prepare your medical prescription now?"*

3. **Physical Doctor Consultation & Prescription Ingestion**:
   - During early symptom triage, the doctor should determine whether the patient has already seen or consulted a physical doctor for their condition.
   - If a physical doctor was consulted, the doctor asks the patient to upload or provide the previous physical prescription (image or multi-page PDF).
   - Optical Character Recognition (OCR) specially tuned for Indian medical handwriting deciphers abbreviations, dosage notations (1-0-1, OD, BD, TDS, SOS), and medications to integrate them into the clinical discussion and care plan.

4. **Multilingual Adaptability**:
   - Support four consultation modes: `Doctor will understand` (multilingual auto-detection), `English`, `Hinglish` (conversational Hindi-English blend), and `Benglish` (conversational Bengali-English blend).
   - In Hinglish and Benglish modes, clinical explanations use the conversational blend, while all drug molecules, brand names, and dosages remain strictly in English.

5. **Automated Prescription & PDF Download**:
   - Patient affirmations to the doctor's prescription offer (e.g., "yes please", "sure", "haanji", "thik ache") automatically trigger prescription generation and immediate browser PDF download.
