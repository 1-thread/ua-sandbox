import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateCharacterRefPrompt } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstPanelImageUrl, storyConfig } = body;

    if (!firstPanelImageUrl) {
      return NextResponse.json(
        { error: 'firstPanelImageUrl is required' },
        { status: 400 }
      );
    }

    if (!storyConfig) {
      return NextResponse.json(
        { error: 'storyConfig is required' },
        { status: 400 }
      );
    }

    console.log('Generating character reference prompt from first panel image...');
    console.log('First panel image URL:', firstPanelImageUrl);
    
    // Use GPT to generate a detailed prompt based on the first panel image
    const characterRefPrompt = await generateCharacterRefPrompt(firstPanelImageUrl, storyConfig);
    
    console.log('Generated character reference prompt:', characterRefPrompt);
    console.log('Generating character reference image with DALL·E...');
    
    const imageUrl = await generateImage(characterRefPrompt);
    console.log('Character reference image generated successfully:', imageUrl);

    return NextResponse.json({ 
      url: imageUrl,
      prompt: characterRefPrompt
    });
  } catch (error: any) {
    console.error('Character reference generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate character reference image' },
      { status: 500 }
    );
  }
}

