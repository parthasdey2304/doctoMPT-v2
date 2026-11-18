import { NextRequest, NextResponse } from 'next/server';
import { processLabReportWithOcr } from '@/lib/lab-report-ocr';
import { formatErrorMessage } from '@/lib/error-utils';

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/bmp',
  'image/tiff',
]);

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-gemini-api-key') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    let buffer: Buffer;
    let mimeType = 'application/pdf';
    let fileName = 'lab-report.pdf';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No lab report file provided. Please upload an image (JPG, PNG) or PDF document.' },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'File size exceeds maximum limit of 20MB. Please upload a smaller document.' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileName = file.name || fileName;
      mimeType = file.type || mimeType;

      if (mimeType === 'application/octet-stream' || !mimeType) {
        if (fileName.toLowerCase().endsWith('.pdf')) {
          mimeType = 'application/pdf';
        } else if (fileName.toLowerCase().match(/\.(jpe?g)$/)) {
          mimeType = 'image/jpeg';
        } else if (fileName.toLowerCase().endsWith('.png')) {
          mimeType = 'image/png';
        } else if (fileName.toLowerCase().endsWith('.webp')) {
          mimeType = 'image/webp';
        }
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      const { fileBase64, mimeType: declaredMime, fileName: declaredName } = body || {};

      if (!fileBase64) {
        return NextResponse.json(
          { error: 'fileBase64 data is required for JSON lab report payload.' },
          { status: 400 }
        );
      }

      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
      if (declaredMime) mimeType = declaredMime;
      if (declaredName) fileName = declaredName;
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type. Please send multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    const normalizedMime = mimeType.toLowerCase();
    if (!SUPPORTED_MIME_TYPES.has(normalizedMime)) {
      return NextResponse.json(
        {
          error: `Unsupported file format (${mimeType}). Please upload a PDF or image file (JPEG, PNG, WEBP).`,
        },
        { status: 400 }
      );
    }

    const labReport = await processLabReportWithOcr({
      buffer,
      mimeType,
      fileName,
      apiKey,
    });

    return NextResponse.json({
      success: true,
      labReport,
    });
  } catch (error: any) {
    console.error('Error in /api/ocr-lab-report:', error);
    return NextResponse.json(
      {
        error: formatErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
