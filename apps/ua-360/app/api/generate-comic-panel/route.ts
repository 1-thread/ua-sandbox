import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imagePrompt } = body;

    if (!imagePrompt) {
      return NextResponse.json(
        { error: 'imagePrompt is required' },
        { status: 400 }
      );
    }

    console.log('Generating comic panel image with prompt:', imagePrompt);
    const imageUrl = await generateImage(imagePrompt);
    console.log('Comic panel image generated successfully:', imageUrl);

    return NextResponse.json({ url: imageUrl });
  } catch (error: any) {
    console.error('Comic panel generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate comic panel image' },
      { status: 500 }
    );
  }
}

