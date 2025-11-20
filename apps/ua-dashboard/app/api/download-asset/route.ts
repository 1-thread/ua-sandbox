import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get credentials at request time (not at module evaluation)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const searchParams = request.nextUrl.searchParams;
    const storagePath = searchParams.get('path');

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Missing required parameter: path' },
        { status: 400 }
      );
    }

    // Generate a signed URL for download (bypasses RLS)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('ip-assets')
      .createSignedUrl(storagePath, 3600);

    if (urlError) {
      console.error('Error generating download URL:', urlError);
      return NextResponse.json(
        { error: `Failed to generate download URL: ${urlError.message}` },
        { status: 500 }
      );
    }

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl
    });
  } catch (error) {
    console.error('Error in download-asset API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

