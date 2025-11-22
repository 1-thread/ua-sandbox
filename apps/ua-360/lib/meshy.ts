// Meshy.ai API client for image-to-3D conversion

if (!process.env.MESHY_API_KEY) {
  throw new Error('MESHY_API_KEY is not set');
}

const MESHY_API_BASE = 'https://api.meshy.ai/v2';

interface MeshyTaskResponse {
  result: string;
  task_id: string;
}

interface MeshyTaskStatus {
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  model_urls?: {
    glb?: string;
    obj?: string;
  };
  error?: string;
}

export async function createImageTo3DTask(imageUrl: string): Promise<string> {
  const response = await fetch(`${MESHY_API_BASE}/image-to-3d`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      art_style: 'stylized',
      resolution: '1024',
      texture_richness: 'medium',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${error}`);
  }

  const data: MeshyTaskResponse = await response.json();
  return data.task_id;
}

export async function getTaskStatus(taskId: string): Promise<MeshyTaskStatus> {
  const response = await fetch(`${MESHY_API_BASE}/image-to-3d/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${error}`);
  }

  return response.json();
}

export async function waitFor3DModel(taskId: string, maxWaitTime: number = 300000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getTaskStatus(taskId);

    if (status.status === 'SUCCEEDED') {
      const glbUrl = status.model_urls?.glb;
      const objUrl = status.model_urls?.obj;
      
      if (glbUrl) {
        return glbUrl;
      } else if (objUrl) {
        return objUrl;
      } else {
        throw new Error('No model URL in successful response');
      }
    }

    if (status.status === 'FAILED') {
      throw new Error(`Meshy task failed: ${status.error || 'Unknown error'}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Timeout waiting for 3D model generation');
}

export async function generate3DModelFromImage(imageUrl: string): Promise<{ url: string; format: 'glb' | 'obj' }> {
  const taskId = await createImageTo3DTask(imageUrl);
  const modelUrl = await waitFor3DModel(taskId);
  
  const format = modelUrl.includes('.glb') ? 'glb' : 'obj';
  return { url: modelUrl, format };
}

