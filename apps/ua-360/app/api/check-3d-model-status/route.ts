import { NextRequest, NextResponse } from 'next/server';
import { getTaskStatus, waitFor3DModel } from '@/lib/meshy';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Check API key first
    if (!process.env.MESHY_API_KEY) {
      console.error('MESHY_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'MESHY_API_KEY environment variable is not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    const baseUrl = searchParams.get('baseUrl');
    const waitForCompletion = searchParams.get('wait') === 'true';

    if (!taskId || !baseUrl) {
      return NextResponse.json(
        { error: 'taskId and baseUrl are required' },
        { status: 400 }
      );
    }

    if (waitForCompletion) {
      // Wait for completion and return the final model URL
      console.log('Waiting for 3D model completion...');
      const modelUrl = await waitFor3DModel(taskId, baseUrl);
      
      // Determine format from URL
      let format = 'glb';
      if (modelUrl.includes('.obj')) format = 'obj';
      else if (modelUrl.includes('.fbx')) format = 'fbx';
      else if (modelUrl.includes('.usdz')) format = 'usdz';
      
      return NextResponse.json({ 
        status: 'SUCCEEDED',
        progress: 100,
        url: modelUrl,
        format
      });
    } else {
      // Just return current status
      const status = await getTaskStatus(taskId, baseUrl);
      
      let modelUrl: string | undefined;
      let format: string | undefined;
      
      if (status.status === 'SUCCEEDED') {
        // Extract model URL from various possible formats
        if (status.model_urls) {
          modelUrl = status.model_urls.glb || status.model_urls.obj || status.model_urls.fbx || status.model_urls.usdz;
          format = status.model_urls.glb ? 'glb' : status.model_urls.obj ? 'obj' : status.model_urls.fbx ? 'fbx' : 'usdz';
        } else if (status.model_url) {
          if (typeof status.model_url === 'string') {
            modelUrl = status.model_url;
            format = modelUrl.includes('.glb') ? 'glb' : modelUrl.includes('.obj') ? 'obj' : modelUrl.includes('.fbx') ? 'fbx' : 'usdz';
          } else if (typeof status.model_url === 'object' && status.model_url !== null) {
            const urlObj = status.model_url as any;
            modelUrl = urlObj.glb || urlObj.obj || urlObj.fbx || urlObj.usdz || urlObj.url;
            format = urlObj.glb ? 'glb' : urlObj.obj ? 'obj' : urlObj.fbx ? 'fbx' : 'usdz';
          }
        }
      }
      
      return NextResponse.json({
        status: status.status,
        progress: status.progress || 0,
        url: modelUrl,
        format: format
      });
    }
  } catch (error: any) {
    console.error('3D model status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check 3D model status' },
      { status: 500 }
    );
  }
}

