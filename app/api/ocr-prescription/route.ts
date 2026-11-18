import { NextRequest, NextResponse } from 'next/server';
import { processPrescriptionWithOcr } from '@/lib/prescription-ocr';
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
    let fileName = 'prescription.pdf';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No prescription file provided. Please upload an image (JPG, PNG) or PDF document.' },
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

      // Handle PDF or image detection by extension if type is missing or generic octet-stream
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
          { error: 'fileBase64 data is required for JSON prescription payload.' },
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

    // Validate mime type
    const normalizedMime = mimeType.toLowerCase();
    if (!SUPPORTED_MIME_TYPES.has(normalizedMime)) {
      return NextResponse.json(
        {
          error: `Unsupported file format (${mimeType}). Please upload a PDF or image file (JPEG, PNG, WEBP).`,
        },
        { status: 400 }
      );
    }

    const prescription = await processPrescriptionWithOcr({
      buffer,
      mimeType: normalizedMime,
      fileName,
      apiKey: apiKey || undefined,
    });

    return NextResponse.json({
      success: true,
      prescription,
    });
  } catch (error: any) {
    console.error('OCR API error:', error);
    const cleanMessage = formatErrorMessage(error);
    return NextResponse.json(
      {
        error: `Failed to process prescription OCR: ${cleanMessage}`,
      },
      { status: 500 }
    );
  }
}
