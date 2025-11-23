import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Proxy route to fetch 3D models from external URLs (e.g., Meshy CDN)
 * This bypasses CORS restrictions by fetching server-side
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  // Validate that the URL is from a trusted source (Meshy CDN)
  if (!url.startsWith('https://assets.meshy.ai/')) {
    return NextResponse.json(
      { error: 'Invalid URL source' },
      { status: 400 }
    );
  }

  try {
    console.log('Proxying 3D model from:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch model: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Determine content type based on URL extension
    // GLB files should use 'model/gltf-binary' but browsers might need 'application/octet-stream'
    let contentType = response.headers.get('content-type');
    if (!contentType || contentType === 'application/octet-stream') {
      if (url.includes('.glb')) {
        contentType = 'model/gltf-binary';
      } else if (url.includes('.gltf')) {
        contentType = 'model/gltf+json';
      } else if (url.includes('.obj')) {
        contentType = 'model/obj';
      } else if (url.includes('.fbx')) {
        contentType = 'application/octet-stream';
      } else {
        contentType = 'application/octet-stream';
      }
    }

    console.log('Proxying model:', {
      url: url.substring(0, 100) + '...',
      contentType,
      size: arrayBuffer.byteLength,
      originalContentType: response.headers.get('content-type')
    });

    // Return the file with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error proxying 3D model:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to proxy model' },
      { status: 500 }
    );
  }
}

