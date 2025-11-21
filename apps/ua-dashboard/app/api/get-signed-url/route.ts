import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const storagePath = searchParams.get('path');

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Generate a signed URL using the service role key (bypasses RLS)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('ip-assets')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      return NextResponse.json(
        { error: `Failed to generate signed URL: ${urlError.message}` },
        { status: 500 }
      );
    }

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'Signed URL not generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ signedUrl: signedUrlData.signedUrl });
  } catch (error) {
    console.error('Error in get-signed-url API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

