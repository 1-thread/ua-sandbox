import { NextRequest, NextResponse } from 'next/server';
import { createImageTo3DTask } from '@/lib/meshy';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check API key first
    if (!process.env.MESHY_API_KEY) {
      console.error('MESHY_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'MESHY_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { characterRefImageUrl } = body;

    if (!characterRefImageUrl) {
      return NextResponse.json(
        { error: 'characterRefImageUrl is required' },
        { status: 400 }
      );
    }

    console.log('Creating 3D model task from character reference image...');
    console.log('Character reference image URL:', characterRefImageUrl);
    
    // Create the task and return taskId immediately for polling
    const { taskId, baseUrl } = await createImageTo3DTask(characterRefImageUrl);
    console.log('Task created:', taskId, 'baseUrl:', baseUrl);

    return NextResponse.json({ 
      taskId,
      baseUrl
    });
  } catch (error: any) {
    console.error('3D model task creation error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to create 3D model task' },
      { status: 500 }
    );
  }
}

