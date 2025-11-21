import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing image URL parameter' },
        { status: 400 }
      );
    }

    // Fetch the image from OpenAI URL (server-side to avoid CORS issues)
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image from OpenAI' },
        { status: imageResponse.status }
      );
    }

    // Get the image as a buffer
    const imageBuffer = await imageResponse.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageResponse.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error downloading workflow image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

