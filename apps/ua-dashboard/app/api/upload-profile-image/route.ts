import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
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
    const formData = await request.formData();
    const firstName = formData.get('firstName') as string;
    const originalFile = formData.get('original') as File;
    const smallFile = formData.get('small') as File;
    const mediumFile = formData.get('medium') as File;

    if (!firstName || !originalFile || !smallFile || !mediumFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert files to buffers
    const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
    const smallBuffer = Buffer.from(await smallFile.arrayBuffer());
    const mediumBuffer = Buffer.from(await mediumFile.arrayBuffer());

    // Upload original version
    const originalFilename = `${firstName}.png`;
    const { error: originalError } = await supabase.storage
      .from('profile-pics')
      .upload(originalFilename, originalBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (originalError) {
      console.error('Error uploading original:', originalError);
      return NextResponse.json(
        { error: `Failed to upload original image: ${originalError.message}` },
        { status: 500 }
      );
    }

    // Upload small version
    const smallFilename = `${firstName}-small.png`;
    const { error: smallError } = await supabase.storage
      .from('profile-pics')
      .upload(smallFilename, smallBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (smallError) {
      console.error('Error uploading small:', smallError);
      return NextResponse.json(
        { error: `Failed to upload small image: ${smallError.message}` },
        { status: 500 }
      );
    }

    // Upload medium version
    const mediumFilename = `${firstName}-medium.png`;
    const { error: mediumError } = await supabase.storage
      .from('profile-pics')
      .upload(mediumFilename, mediumBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (mediumError) {
      console.error('Error uploading medium:', mediumError);
      return NextResponse.json(
        { error: `Failed to upload medium image: ${mediumError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile images uploaded successfully',
      files: {
        original: originalFilename,
        small: smallFilename,
        medium: mediumFilename
      }
    });
  } catch (error) {
    console.error('Error in upload-profile-image API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

