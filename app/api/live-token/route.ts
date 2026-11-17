import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { formatErrorMessage } from '@/lib/error-utils';

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-gemini-api-key') ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in .env.local or supply it in the app settings.',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    // Valid for 30 minutes, must initiate session within 2 minutes
    const now = Date.now();
    const expireTime = new Date(now + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString();

    const authToken = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
      },
    });

    if (!authToken || !authToken.name) {
      throw new Error('Failed to obtain ephemeral token from Gemini API');
    }

    return NextResponse.json({ token: authToken.name });
  } catch (error: any) {
    console.error('Error generating ephemeral token:', error);
    const cleanMessage = formatErrorMessage(error);
    return NextResponse.json(
      {
        error: cleanMessage,
      },
      { status: 500 }
    );
  }
}
