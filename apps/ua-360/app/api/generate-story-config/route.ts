import { NextRequest, NextResponse } from 'next/server';
import { generateStoryConfig } from '@/lib/openai';
import { StoryConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea } = body;

    if (!idea) {
      return NextResponse.json(
        { error: 'idea is required' },
        { status: 400 }
      );
    }

    console.log('Generating story config with idea:', idea);
    const storyConfig: StoryConfig = await generateStoryConfig(idea);
    console.log('Story config generated successfully');

    return NextResponse.json({ storyConfig });
  } catch (error: any) {
    console.error('Story config generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate story config' },
      { status: 500 }
    );
  }
}

