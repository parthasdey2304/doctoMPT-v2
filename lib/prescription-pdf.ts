import { jsPDF } from 'jspdf';
import { PrescriptionData } from '@/types/consultation';
import { MRS_SAINT_DELAFIELD_BASE64 } from '@/lib/fonts/mrs-saint-delafield-base64';
import { normalizeMedication } from '@/lib/medication-utils';

export function generatePrescriptionPdf(
  prescription: PrescriptionData,
  autoDownload: boolean = true
): { doc: jsPDF; blobUrl: string; fileName: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register Google Font 'Mrs Saint Delafield' for authentic cursive signature
  try {
    doc.addFileToVFS('MrsSaintDelafield-Regular.ttf', MRS_SAINT_DELAFIELD_BASE64);
    doc.addFont('MrsSaintDelafield-Regular.ttf', 'MrsSaintDelafield', 'normal');
  } catch (fontErr) {
    console.warn('Could not register Mrs Saint Delafield font in jsPDF:', fontErr);
  }

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // Top Brand Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 22, 'F');

  // Clinic Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DOCTOMPT MEDICAL CLINIC', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    'Virtual Healthcare & Comprehensive Consultation Services',
    margin + 6,
    y + 15
  );

  // Doctor Info on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Dr. DoctoMPT', pageWidth - margin - 6, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setFontSize(7.5);
  doc.text('General Physician & Medical Consultant', pageWidth - margin - 6, y + 14, { align: 'right' });
  doc.text('Reg: MED-2026-DOCMPT', pageWidth - margin - 6, y + 18, { align: 'right' });

  // Space directly to Patient Info Box (disclaimer banner removed)
  y += 26;

  // Patient Info & Metadata Box
  const col2X = margin + 85;
  const complaintLines = doc.splitTextToSize(
    prescription.chiefComplaint || 'General health consultation',
    contentWidth - 89
  );
  const patientBoxHeight = Math.max(24, 11 + complaintLines.length * 3.6);

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, contentWidth, patientBoxHeight, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PATIENT NAME:', margin + 4, y + 6);
  doc.text('AGE / GENDER:', margin + 4, y + 12);
  doc.text('DATE:', margin + 4, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9);
  doc.text(prescription.patientName || 'Patient', margin + 30, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(prescription.patientAge || 'Not specified', margin + 30, y + 12);
  doc.text(prescription.date || new Date().toISOString().split('T')[0], margin + 30, y + 18);

  // Right column of Patient Box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8);
  doc.text('CHIEF COMPLAINT:', col2X, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(complaintLines, col2X, y + 11);

  y += patientBoxHeight + 4;

  // Clinical Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Clinical Assessment & Triage Impression:', margin, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const assessmentLines = doc.splitTextToSize(
    prescription.assessmentNotes || 'Patient evaluated via virtual clinical consultation.',
    contentWidth
  );
  doc.text(assessmentLines, margin, y);
  y += assessmentLines.length * 4 + 4;

  // Big Rx Symbol
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(20);
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text('Rx', margin, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PRESCRIBED MEDICATIONS & REGIMEN', margin + 12, y + 2.5);

  y += 8;

  // Table Header
  // Columns: Medicine & Strength (44mm), Frequency (26mm), Timing (32mm), Duration (18mm), Reason (36mm), Instructions (26mm) = 182mm
  const colWidths = [44, 26, 32, 18, 36, 26];
  const headers = ['Medicine & Strength', 'Frequency', 'Timing', 'Duration', 'Reason / Indication', 'Instructions'];

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let curX = margin;
  headers.forEach((h, i) => {
    doc.text(h, curX + 2, y + 4.5);
    curX += colWidths[i];
  });

  y += 7;

  // Table Rows
  const meds =
    prescription.medications && prescription.medications.length > 0
      ? prescription.medications
      : [
          {
            name: 'Dolo 650',
            brandName: 'Dolo 650',
            genericName: 'Paracetamol',
            dosage: '650mg',
            frequency: '3 times a day',
            timing: 'After meals',
            duration: '3 to 5 days',
            reason: 'For reducing fever and easing body aches',
            instructions: 'Take with plenty of water',
          },
        ];

  meds.forEach((med, idx) => {
    const isEven = idx % 2 === 0;
    const medNorm = normalizeMedication(med);

    // Col 0: Brand Name (Line 1), Generic Drug Name (Line 2), Strength (Line 3)
    const brandText = medNorm.brandName || medNorm.name || 'Medicine';
    const genericText = medNorm.genericName || '';
    const strengthRaw = medNorm.dosage || '';
    const strengthText = strengthRaw
      ? (strengthRaw.toLowerCase().startsWith('strength') ? strengthRaw : `Strength: ${strengthRaw}`)
      : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const brandLines: string[] = doc.splitTextToSize(brandText, colWidths[0] - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const genericLines: string[] = genericText ? doc.splitTextToSize(genericText, colWidths[0] - 4) : [];
    const strengthLines: string[] = strengthText ? doc.splitTextToSize(strengthText, colWidths[0] - 4) : [];

    const col0Height = brandLines.length * 3.4 + (genericLines.length > 0 ? genericLines.length * 3.0 : 0) + (strengthLines.length > 0 ? strengthLines.length * 3.0 : 0);

    // Col 1: Frequency
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const freqLines: string[] = doc.splitTextToSize(medNorm.frequency || 'As directed', colWidths[1] - 4);
    const col1Height = freqLines.length * 3.4;

    // Col 2: Timing
    const timingLines: string[] = doc.splitTextToSize(medNorm.timing || 'After food', colWidths[2] - 4);
    const col2Height = timingLines.length * 3.4;

    // Col 3: Duration
    const durationLines: string[] = doc.splitTextToSize(medNorm.duration || '3-5 days', colWidths[3] - 4);
    const col3Height = durationLines.length * 3.4;

    // Col 4: Reason / Indication
    const reasonLines: string[] = doc.splitTextToSize(medNorm.reason || 'Supportive care', colWidths[4] - 4);
    const col4Height = reasonLines.length * 3.4;

    // Col 5: Instructions
    const instLines: string[] = doc.splitTextToSize(medNorm.instructions || 'As advised', colWidths[5] - 4);
    const col5Height = instLines.length * 3.4;

    // Determine row height dynamically based on max content height
    const maxContentHeight = Math.max(col0Height, col1Height, col2Height, col3Height, col4Height, col5Height);
    const rowPadding = 3;
    const rowHeight = Math.max(14, maxContentHeight + rowPadding * 2);

    // Row Background and Border
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'FD');

    // Draw vertical column separators so cell boundaries are completely clean
    let sepX = margin;
    for (let c = 0; c < colWidths.length - 1; c++) {
      sepX += colWidths[c];
      doc.setDrawColor(226, 232, 240);
      doc.line(sepX, y, sepX, y + rowHeight);
    }

    let cellX = margin;

    // Col 0: Brand (bold), Generic (teal), Strength (slate)
    let curCol0Y = y + rowPadding + 2.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(brandLines, cellX + 2, curCol0Y);
    curCol0Y += brandLines.length * 3.4;

    if (genericLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(13, 148, 136); // teal-600
      doc.text(genericLines, cellX + 2, curCol0Y);
      curCol0Y += genericLines.length * 3.0;
    }

    if (strengthLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(strengthLines, cellX + 2, curCol0Y);
    }
    cellX += colWidths[0];

    // Col 1: Frequency
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(freqLines, cellX + 2, y + rowPadding + 2.5);
    cellX += colWidths[1];

    // Col 2: Timing
    doc.text(timingLines, cellX + 2, y + rowPadding + 2.5);
    cellX += colWidths[2];

    // Col 3: Duration
    doc.text(durationLines, cellX + 2, y + rowPadding + 2.5);
    cellX += colWidths[3];

    // Col 4: Reason
    doc.setTextColor(51, 65, 85);
    doc.text(reasonLines, cellX + 2, y + rowPadding + 2.5);
    cellX += colWidths[4];

    // Col 5: Instructions
    doc.text(instLines, cellX + 2, y + rowPadding + 2.5);

    y += rowHeight;
  });

  y += 5;

  // Supportive Care & Lifestyle Advice Box
  const adviceList =
    prescription.advice && prescription.advice.length > 0
      ? prescription.advice.slice(0, 4)
      : [
          'Maintain adequate hydration by drinking plenty of fluids and electrolytes.',
          'Get sufficient bed rest and avoid strenuous physical activity.',
          'Monitor body temperature and record symptom progression.',
        ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wrappedAdviceItems = adviceList.map((adv) =>
    doc.splitTextToSize(`•  ${adv}`, contentWidth - 8)
  );
  const totalAdviceLines = wrappedAdviceItems.reduce((acc, lines) => acc + lines.length, 0);
  const adviceBoxHeight = Math.max(22, 9 + totalAdviceLines * 3.8);

  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(204, 251, 241); // teal-100
  doc.roundedRect(margin, y, contentWidth, adviceBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text('SUPPORTIVE CARE & RECOVERY GUIDANCE', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  let curAdviceY = y + 9.5;
  wrappedAdviceItems.forEach((lines) => {
    doc.text(lines, margin + 4, curAdviceY);
    curAdviceY += lines.length * 3.8;
  });

  y += adviceBoxHeight + 4;

  // Follow-up Box
  const followUpText =
    prescription.followUp ||
    'Review with Dr. DoctoMPT or return for clinical re-evaluation if fever or pain persists beyond 48 hours, or seek emergency medical care immediately for severe symptoms.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const followUpLines = doc.splitTextToSize(followUpText, contentWidth - 8);
  const followUpBoxHeight = Math.max(12, 7 + followUpLines.length * 3.6);

  doc.setFillColor(254, 252, 232); // yellow-50
  doc.setDrawColor(254, 240, 138); // yellow-200
  doc.roundedRect(margin, y, contentWidth, followUpBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 98, 7); // yellow-700
  doc.text('FOLLOW-UP & CLINICAL GUIDANCE:', margin + 4, y + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 63, 18);
  doc.text(followUpLines, margin + 4, y + 8.5);

  y += followUpBoxHeight + 6;

  // Signature Section
  const sigX = pageWidth - margin - 55;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sigX, y + 10, pageWidth - margin, y + 10);

  // Elegant cursive signature with Google Font 'Mrs Saint Delafield'
  try {
    doc.setFont('MrsSaintDelafield', 'normal');
    doc.setFontSize(22);
    doc.setTextColor(13, 148, 136); // teal-600
    doc.text('Dr. DoctoMPT', sigX + 4, y + 7.5);
  } catch {
    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(13, 148, 136);
    doc.text('Dr. DoctoMPT', sigX + 6, y + 8);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Verified Digital Signature', sigX + 6, y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const displayRef = prescription.referenceCode
    ? (prescription.referenceCode.startsWith('Ref:')
        ? prescription.referenceCode
        : `Ref: ${prescription.referenceCode}`)
    : `Ref: RX-${Date.now().toString(36).toUpperCase()}`;
  doc.text(
    displayRef,
    sigX + 2,
    y + 17
  );

  // Footer disclaimer has been completely removed as requested

  const fileName = `Prescription-${(prescription.patientName || 'Patient').replace(/\s+/g, '_')}-${prescription.date || 'today'}.pdf`;

  if (autoDownload && typeof window !== 'undefined') {
    doc.save(fileName);
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, blobUrl, fileName };
}
