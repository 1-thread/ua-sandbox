// Meshy.ai API client for image-to-3D conversion
// Based on official documentation: https://docs.meshy.ai/en/api/quick-start

interface MeshyCreateTaskResponse {
  result: string; // task_id
}

interface MeshyTaskStatus {
  id?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress?: number;
  // According to docs, response uses "model_urls" (plural) with format keys
  model_urls?: {
    glb?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  };
  // Legacy format for backward compatibility
  model_url?: {
    glb?: string;
    obj?: string;
    fbx?: string;
    usdz?: string;
  } | string;
  task_error?: {
    message: string;
  };
  finished_at?: number;
}

/**
 * Creates an image-to-3D task using Meshy API
 * Returns task ID and base URL for subsequent status checks
 */
export async function createImageTo3DTask(imageUrl: string): Promise<{ taskId: string; baseUrl: string }> {
  if (!process.env.MESHY_API_KEY) {
    throw new Error('MESHY_API_KEY environment variable is not set');
  }

  // Try both v2 and v1 endpoints for image-to-3d
  // Based on logs, v1 endpoint works: https://api.meshy.ai/openapi/v1/image-to-3d
  const possibleEndpoints = [
    { url: 'https://api.meshy.ai/openapi/v2/image-to-3d', baseUrl: 'https://api.meshy.ai/openapi/v2' },
    { url: 'https://api.meshy.ai/openapi/v1/image-to-3d', baseUrl: 'https://api.meshy.ai/openapi/v1' },
  ];
  
  let lastError: Error | null = null;
  
  for (const endpoint of possibleEndpoints) {
    const { url, baseUrl } = endpoint;
  
    const requestBody = {
      image_url: imageUrl,
      ai_model: 'meshy-5',
      topology: 'triangle',
      should_texture: 0,
      should_remesh: true,
      moderation: false,
    };

    console.log(`Creating Meshy image-to-3d task: ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      
      if (response.ok) {
        const data: MeshyCreateTaskResponse = JSON.parse(responseText);
        if (!data.result) {
          throw new Error(`Invalid response: missing 'result' field`);
        }
        console.log(`✓ Task created: ${data.result} (using ${baseUrl})`);
        return { taskId: data.result, baseUrl };
      }

      // If 404, try next endpoint
      if (response.status === 404) {
        console.log(`  → Endpoint ${url} returned 404, trying next...`);
        lastError = new Error(`Endpoint not found: ${url}`);
        continue;
      }
      
      // For other errors, throw immediately
      let errorMessage = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.message || errorJson.error || responseText;
      } catch {
        // Keep raw response if not JSON
      }
      throw new Error(`Meshy API error (${response.status}): ${errorMessage}`);
    } catch (fetchError: any) {
      if (fetchError.message.includes('404') || fetchError.message.includes('NoMatchingRoute')) {
        lastError = fetchError;
        continue;
      }
      throw fetchError;
    }
  }
  
  throw new Error(`All endpoints failed. Last error: ${lastError?.message}`);
}

/**
 * Gets the status of a Meshy task
 * Uses the same base URL that was used to create the task
 */
export async function getTaskStatus(taskId: string, baseUrl: string): Promise<MeshyTaskStatus> {
  if (!process.env.MESHY_API_KEY) {
    throw new Error('MESHY_API_KEY environment variable is not set');
  }

  const statusUrl = `${baseUrl}/image-to-3d/${taskId}`;
  
  try {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.MESHY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Meshy API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data;
  } catch (fetchError: any) {
    throw new Error(`Failed to get task status: ${fetchError.message}`);
  }
}

/**
 * Polls a Meshy task until it completes
 * Returns the GLB model URL (or OBJ/FBX/USDZ as fallback)
 */
export async function waitFor3DModel(taskId: string, baseUrl: string, maxWaitTime: number = 300000): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds

  console.log(`Polling task ${taskId} (max ${maxWaitTime / 1000}s)...`);

  while (Date.now() - startTime < maxWaitTime) {
    const status = await getTaskStatus(taskId, baseUrl);
    
    console.log(`  Status: ${status.status}${status.progress ? ` (${status.progress}%)` : ''}`);

    if (status.status === 'SUCCEEDED') {
      // According to Meshy docs, response uses "model_urls" (plural)
      let modelUrls = status.model_urls;
      
      // Fallback to singular model_url for backward compatibility
      if (!modelUrls) {
        const modelUrl = status.model_url;
        if (typeof modelUrl === 'string') {
          console.log(`✓ Model URL (string): ${modelUrl}`);
          return modelUrl;
        }
        if (typeof modelUrl === 'object' && modelUrl !== null) {
          modelUrls = modelUrl;
        }
      }
      
      if (!modelUrls) {
        console.error('Full status response:', JSON.stringify(status, null, 2));
        throw new Error('No model_urls or model_url in successful response');
      }

      // Prefer GLB, fall back to OBJ, then FBX, then USDZ
      const glbUrl = modelUrls.glb;
      const objUrl = modelUrls.obj;
      const fbxUrl = modelUrls.fbx;
      const usdzUrl = modelUrls.usdz;
      
      if (glbUrl) {
        console.log(`✓ Model URL (GLB): ${glbUrl}`);
        return glbUrl;
      } else if (objUrl) {
        console.log(`✓ Model URL (OBJ): ${objUrl}`);
        return objUrl;
      } else if (fbxUrl) {
        console.log(`✓ Model URL (FBX): ${fbxUrl}`);
        return fbxUrl;
      } else if (usdzUrl) {
        console.log(`✓ Model URL (USDZ): ${usdzUrl}`);
        return usdzUrl;
      } else {
        // Check if any value in the object is a URL string
        const urlValues = Object.values(modelUrls).filter(
          v => typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))
        );
        if (urlValues.length > 0) {
          console.log(`✓ Model URL (found in values): ${urlValues[0]}`);
          return urlValues[0] as string;
        }
        
        console.error('Full status response:', JSON.stringify(status, null, 2));
        throw new Error(
          `No model URL found. Available keys: ${Object.keys(modelUrls).join(', ')}. ` +
          `Full model_urls: ${JSON.stringify(modelUrls)}`
        );
      }
    }

    if (status.status === 'FAILED' || status.status === 'CANCELED') {
      const errorMessage = status.task_error?.message || 'Unknown error';
      throw new Error(`Meshy task ${status.status.toLowerCase()}: ${errorMessage}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for 3D model generation (${maxWaitTime / 1000}s)`);
}

/**
 * Complete workflow: Create task, wait for completion, return model URL
 */
export async function generate3DModelFromImage(imageUrl: string): Promise<{ url: string; format: 'glb' | 'obj' }> {
  console.log('Starting 3D model generation from image...');
  
  const { taskId, baseUrl } = await createImageTo3DTask(imageUrl);
  console.log(`Task created: ${taskId}, using base URL: ${baseUrl}`);
  
  const modelUrl = await waitFor3DModel(taskId, baseUrl);
  console.log(`✓ 3D model generation complete: ${modelUrl}`);
  
  const format = modelUrl.includes('.glb') ? 'glb' : 'obj';
  return { url: modelUrl, format };
}
