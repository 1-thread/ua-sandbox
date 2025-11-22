// Meshy.ai API client for image-to-3D conversion

if (!process.env.MESHY_API_KEY) {
  throw new Error('MESHY_API_KEY is not set');
}

const MESHY_API_BASE = 'https://api.meshy.ai/v2';

interface MeshyCreateTaskResponse {
  result: string; // task_id
}

interface MeshyTaskStatus {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress?: number;
  model_url?: {
    glb?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  };
  task_error?: {
    message: string;
  };
  finished_at?: number;
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
      // Optional parameters with sensible defaults for toy-style models
      ai_model: 'latest', // Use latest model
      topology: 'triangle', // Generate triangle mesh (good for toys)
      should_texture: true, // Enable texturing
      should_remesh: true, // Enable remesh phase
      moderation: false, // Disable moderation for faster processing (can enable if needed)
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${error}`);
  }

  const data: MeshyCreateTaskResponse = await response.json();
  return data.result; // task_id
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
      const modelUrl = status.model_url;
      if (!modelUrl) {
        throw new Error('No model_url in successful response');
      }

      // Prefer GLB, fall back to OBJ, then FBX, then USDZ
      const glbUrl = modelUrl.glb;
      const objUrl = modelUrl.obj;
      const fbxUrl = modelUrl.fbx;
      const usdzUrl = modelUrl.usdz;
      
      if (glbUrl) {
        return glbUrl;
      } else if (objUrl) {
        return objUrl;
      } else if (fbxUrl) {
        return fbxUrl;
      } else if (usdzUrl) {
        return usdzUrl;
      } else {
        throw new Error('No model URL found in model_url object');
      }
    }

    if (status.status === 'FAILED' || status.status === 'CANCELED') {
      const errorMessage = status.task_error?.message || 'Unknown error';
      throw new Error(`Meshy task ${status.status.toLowerCase()}: ${errorMessage}`);
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

