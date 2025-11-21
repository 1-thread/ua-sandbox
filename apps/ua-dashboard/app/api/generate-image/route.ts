import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { contextPrompt, userPrompt, workflowId, deliverableId, contributorId } = await request.json();

    if (!contextPrompt || !userPrompt || !workflowId) {
      return NextResponse.json(
        { error: 'Missing required fields: contextPrompt, userPrompt, workflowId' },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Combine prompts
    const fullPrompt = `${contextPrompt}\n\nUser Request: ${userPrompt}`;

    // Define the actual model being used
    const modelName = 'dall-e-3';
    const modelDisplayName = 'DALL-E 3';

    // Create workflow result record with "processing" status (optional - don't fail if table doesn't exist)
    let resultId: string | null = null;
    if (deliverableId && contributorId) {
      try {
        const { data: resultData, error: resultError } = await supabase
          .from('workflow_results')
          .insert({
            workflow_id: workflowId,
            deliverable_id: deliverableId,
            contributor_id: contributorId,
            context_prompt: contextPrompt,
            user_prompt: userPrompt,
            model_used: modelDisplayName,
            status: 'processing'
          })
          .select('id')
          .single();

        if (!resultError && resultData) {
          resultId = resultData.id;
        } else if (resultError) {
          console.warn('Could not create workflow result (table may not exist):', resultError.message);
          // Continue without workflow result tracking
        }
      } catch (err) {
        console.warn('Error creating workflow result (table may not exist):', err);
        // Continue without workflow result tracking
      }
    }

    // Call OpenAI DALL-E API
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        console.error('OpenAI DALL-E API error:', errorData);
        
        // Update result status to failed (if workflow_results table exists)
        if (resultId) {
          try {
            await supabase
              .from('workflow_results')
              .update({ status: 'failed' })
              .eq('id', resultId);
          } catch (err) {
            console.warn('Could not update workflow result status:', err);
          }
        }

        // Return more detailed error message
        const errorMessage = errorData.error?.message || errorData.error || 'Failed to generate image';
        return NextResponse.json(
          { error: errorMessage, details: errorData },
          { status: openaiResponse.status }
        );
      }

    const data = await openaiResponse.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      // Update result status to failed (if workflow_results table exists)
      if (resultId) {
        try {
          await supabase
            .from('workflow_results')
            .update({ status: 'failed' })
            .eq('id', resultId);
        } catch (err) {
          console.warn('Could not update workflow result status:', err);
        }
      }

      return NextResponse.json(
        { error: 'No image URL returned from OpenAI' },
        { status: 500 }
      );
    }

    // Update workflow result with image URL (if workflow_results table exists)
    if (resultId) {
      try {
        await supabase
          .from('workflow_results')
          .update({
            output_image_url: imageUrl,
            status: 'completed'
          })
          .eq('id', resultId);
      } catch (err) {
        console.warn('Could not update workflow result with image URL:', err);
        // Continue even if update fails
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      resultId: resultId
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

