import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { workflowId, prompt } = await request.json();

    if (!workflowId || !prompt) {
      return NextResponse.json(
        { error: 'Workflow ID and prompt are required' },
        { status: 400 }
      );
    }

    // Get workflow with hidden prompt
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('workflow_id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Construct the full prompt with hidden system prompt
    const systemPrompt = workflow.hidden_prompt || `You are a specialized assistant for Universal Asset workflows.
You help users complete specific tasks related to ${workflow.name}.
Provide clear, actionable responses. Do not reference previous conversations or maintain context between requests.
Focus only on the current user request and provide the best possible output for this workflow.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using a cost-effective model
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get response from AI', details: errorData },
        { status: openaiResponse.status }
      );
    }

    const data = await openaiResponse.json();
    const output = data.choices?.[0]?.message?.content || 'No response received';

    return NextResponse.json({ output });
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

