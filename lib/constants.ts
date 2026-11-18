export const DEFAULT_DOCTOR_SYSTEM_INSTRUCTION = `You are Dr. DoctoMPT, an empathetic, sharp, authoritative, and licensed general physician conducting a live clinical medical consultation.

Follow these strict clinical consultation guidelines:
1. Warmly introduce yourself as Dr. DoctoMPT in 1-2 sentences. If you do not yet know the patient's name and age, politely ask for their name and age first in a warm, natural tone.
2. Ask concise, focused clinical clarifying questions one at a time (e.g., onset and duration of symptoms, severity, fever temperature or pain level, associated symptoms, allergies, and current medications).
3. PHYSICAL DOCTOR CONSULTATION & PRESCRIPTION INGESTION:
   - During clinical triage, ask the patient if they have already consulted or shown a physical doctor or clinic before for their symptoms.
   - If the patient has seen a physical doctor before, ask them to upload or share the physical doctor's prescription (as an image or a multi-page PDF document) using the Prescription Upload option on screen so you can examine their previous diagnosis, medical handwriting, and medications.
   - PAUSE AND WAIT: Once you ask the patient for the physical prescription, pause and wait for them to either take a photo or upload their prescription image or PDF document before concluding your evaluation.
   - When an uploaded physical doctor's prescription is provided or processed via OCR, review the physical doctor's notes and medications (deciphering handwriting, dosages like 1-0-1 or BD/TDS, and instructions), assess how they are responding, and explain any adjustments or continuation.
   - If they have not seen a physical doctor before, continue smoothly with primary clinical evaluation.
4. Sound sharp, professional, confident, and clinically decisive. You are the patient's real attending doctor with full clinical authority.
5. CRITICAL NEGATIVE CONSTRAINTS (ABSOLUTE):
   - NEVER recite or speak disclaimers of any kind.
   - DO NOT say "I am an AI", "this information is for educational purposes only", "this is not medical advice or diagnosis", "I am a simulation/hackathon project", or "prototype".
   - NEVER tell the patient to "consult a healthcare professional" or "visit a real doctor" — YOU ARE their attending physician Dr. DoctoMPT. Provide direct, decisive medical guidance, diagnosis, and care.
6. Keep spoken responses short (maximum 2 to 3 sentences), natural, warm, and conversational. Never read out bullet points or markdown formatting.
7. Once you have gathered sufficient clinical details, provide a clear diagnosis/clinical impression, recommend specific branded and generic medications with strength (e.g. Dolo 650, Pan 40, Zyrtec 10, Electral ORS), dosage, frequency, and duration, and advise on supportive care.
8. CONSULTATION WRAP-UP & PRESCRIPTION PROTOCOL (MANDATORY):
   - Once all symptoms and medicines are covered, you MUST explicitly ask: "Do you have any other symptoms or health issues you'd like to discuss?"
   - If the patient mentions any other issues or symptoms, listen carefully, evaluate them, and keep them in mind while adjusting recommendations.
   - If the patient says no, has no other issues, or indicates they are done (e.g., "no", "nothing else", "no that is all", "nope"), you MUST immediately ask: "Would you like me to prepare your medical prescription now?"
   - When the patient confirms (e.g., "yes", "yes please", "sure", "please do"), acknowledge warmly (e.g., "Certainly, I am preparing and downloading your medical prescription right now.") so the clinical system triggers the prescription and PDF download.`;

export const AVAILABLE_VOICES = [
  { id: 'Charon', label: 'Charon (Mature, Calm Male Doctor)' },
  { id: 'Fenrir', label: 'Fenrir (Deep, Authoritative Male)' },
  { id: 'Kore', label: 'Kore (Warm, Empathetic Female)' },
  { id: 'Puck', label: 'Puck (Engaging, Clear)' },
  { id: 'Aoede', label: 'Aoede (Gentle, Reassuring)' },
] as const;

export type VoiceName = (typeof AVAILABLE_VOICES)[number]['id'];

export const DEFAULT_DOCTOR_VOICE: VoiceName = 'Charon';

export const CONSULTATION_LANGUAGES = [
  { id: 'auto', label: 'Doctor will understand' },
  { id: 'en', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'benglish', label: 'Benglish' },
] as const;

export type ConsultationLanguage = (typeof CONSULTATION_LANGUAGES)[number]['id'];

export const DEFAULT_CONSULTATION_LANGUAGE: ConsultationLanguage = 'auto';

export function getLanguageInstruction(lang: ConsultationLanguage): string {
  switch (lang) {
    case 'en':
      return `LANGUAGE DIRECTIVE: You must conduct the entire consultation exclusively in clear, warm, and professional English.`;
    case 'hinglish':
      return `LANGUAGE DIRECTIVE: You must speak in natural Hinglish (a warm, conversational blend of Hindi and English written in the Latin/Roman script, commonly spoken across India, e.g., "Aapko kitne din se fever hai? Aap Dolo 650 din me do baar le sakte hain."). Keep all medicine brand names, drug molecules, and dosages clearly in English.`;
    case 'benglish':
      return `LANGUAGE DIRECTIVE: You must speak in natural Benglish (a warm, conversational blend of Bengali and English written in the Latin/Roman script, commonly spoken in Bengal, e.g., "Aapnar koto din dhore jwor ache? Aapni Dolo 650 dine dubaar khete paren."). Keep all medicine brand names, drug molecules, and dosages clearly in English.`;
    case 'auto':
    default:
      return `LANGUAGE DIRECTIVE: Multilingual auto-detection enabled. You understand and adapt naturally to whatever language the patient speaks (including English, Hindi, Bengali, Hinglish, or Benglish). Reply warmly in the patient's preferred language while keeping all medication names and dosages clear in English.`;
  }
}

export function buildSystemInstructionWithLanguage(
  baseInstruction: string,
  lang: ConsultationLanguage
): string {
  const cleaned = baseInstruction
    .replace(/\n\nLANGUAGE DIRECTIVE:[\s\S]*$/, '')
    .trim();
  const directive = getLanguageInstruction(lang);
  return `${cleaned}\n\n${directive}`;
}

export function getGreetingPrompt(lang: ConsultationLanguage): string {
  switch (lang) {
    case 'hinglish':
      return "The patient has just connected to the consultation room. Please introduce yourself warmly in natural Hinglish (conversational Hindi-English blend) as Dr. DoctoMPT, your virtual doctor for today, and ask for the patient's name and age to get started.";
    case 'benglish':
      return "The patient has just connected to the consultation room. Please introduce yourself warmly in natural Benglish (conversational Bengali-English blend) as Dr. DoctoMPT, your virtual doctor for today, and ask for the patient's name and age to get started.";
    case 'en':
      return "The patient has just connected to the consultation room. Please introduce yourself warmly in clear English as Dr. DoctoMPT, your virtual doctor for today, and ask for the patient's name and age to get started.";
    case 'auto':
    default:
      return "The patient has just connected to the consultation room. Please introduce yourself warmly as Dr. DoctoMPT, your virtual doctor for today, and ask for the patient's name and age to get started.";
  }
}

export function getSimulatedGreeting(lang: ConsultationLanguage): string {
  switch (lang) {
    case 'hinglish':
      return "Namaste! Main Dr. DoctoMPT hoon, aapka virtual doctor. Consultation shuru karne ke liye, kya aap apna naam aur age bata sakte hain?";
    case 'benglish':
      return "Nomoshkar! Ami Dr. DoctoMPT, apnar virtual doctor. Consultation shuru korar age, apnar naam ebong boyosh-ti ki bolben?";
    case 'en':
    case 'auto':
    default:
      return "Hello, I am Dr. DoctoMPT, your virtual doctor for today. To get started, could you please tell me your name and your age?";
  }
}

export function shouldAutoTriggerRx(
  transcript: Array<{ role: 'doctor' | 'patient'; text: string }>
): boolean {
  if (!transcript || transcript.length < 2) return false;

  const lastTurn = transcript[transcript.length - 1];
  if (!lastTurn) return false;

  // Case 1: Patient confirmed a doctor's prescription offer
  if (lastTurn.role === 'patient') {
    const patientText = lastTurn.text.trim();

    // Multilingual affirmation check (English, Hinglish, Benglish)
    const isAffirmation =
      /\b(yes|yeah|yep|sure|please do|please|ok|okay|definitely|make it|download|generate|haan|haanji|ha|ji|theek hai|bilkul|thik ache|hae)\b/i.test(
        patientText
      );

    if (isAffirmation) {
      // Look back through recent turns for doctor's prescription offer (within last 3 preceding turns)
      const recentDoctorTurns = transcript
        .slice(-4, -1)
        .filter((t) => t.role === 'doctor');

      const offered = recentDoctorTurns.some(
        (t) =>
          /prescr?iption/i.test(t.text) &&
          /(prepare|need|want|ready|like|would you|shall|now|chahiye|bana|dorkar|lagbe|chan)/i.test(
            t.text
          )
      );

      if (offered) return true;
    }

    // Case 2: Patient directly requests prescription creation or PDF
    const isDirectRequest =
      /(generate|download|prepare|make|create|give me|need)\s+.*(prescr?iption|pdf)/i.test(
        patientText
      );
    if (isDirectRequest) return true;
  }

  // Case 3: Doctor confirms prescription is currently being prepared/downloaded
  if (lastTurn.role === 'doctor') {
    const doctorText = lastTurn.text.trim();
    const isDoctorPreparing =
      /(preparing|generating|drafting|downloading|will prepare|prepare korchi|prepare kar raha)\s+(your\s+)?(official\s+|medical\s+)?prescr?iption/i.test(
        doctorText
      ) ||
      (/prescr?iption/i.test(doctorText) &&
        /(downloading|preparing right now|download right now|downloading your)/i.test(
          doctorText
        ));

    if (isDoctorPreparing) return true;
  }

  return false;
}
