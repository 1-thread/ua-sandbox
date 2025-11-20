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
    const file = formData.get('file') as File;
    const baseFilePath = formData.get('filePath') as string;
    const deliverableId = formData.get('deliverableId') as string;
    const filename = formData.get('filename') as string;
    const filetype = formData.get('filetype') as string;
    const contributorId = formData.get('contributorId') as string | null;

    if (!file || !baseFilePath || !deliverableId || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields (file, filePath, deliverableId, filename)' },
        { status: 400 }
      );
    }

    // Get contributor name if contributorId is provided
    let contributorName: string | null = null;
    if (contributorId) {
      const { data: contributor } = await supabase
        .from('contributors')
        .select('name')
        .eq('id', contributorId)
        .single();
      contributorName = contributor?.name || null;
    }

    // Create versioned file path with timestamp and contributor
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const contributorSlug = contributorName 
      ? contributorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : 'unknown';
    const fileExt = filename.split('.').pop() || '';
    const baseName = filename.replace(`.${fileExt}`, '');
    const versionedFileName = `${baseName}_${timestamp}_${contributorSlug}.${fileExt}`;
    
    // Extract directory from baseFilePath and create versioned path
    const pathParts = baseFilePath.split('/');
    const directory = pathParts.slice(0, -1).join('/');
    const versionedFilePath = directory ? `${directory}/${versionedFileName}` : versionedFileName;

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage with versioned path
    const { error: uploadError } = await supabase.storage
      .from('ip-assets')
      .upload(versionedFilePath, fileBuffer, {
        contentType: file.type,
        upsert: false // Don't overwrite, create new version
      });

    if (uploadError) {
      console.error('Error uploading asset:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload asset: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Save to asset history
    const { error: historyError } = await supabase
      .from('asset_history')
      .insert({
        deliverable_id: deliverableId,
        contributor_id: contributorId || null,
        filename: filename,
        storage_path: versionedFilePath,
        uploaded_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Error saving asset history:', historyError);
      // Don't fail the upload if history save fails, but log it
    }

    // Update deliverable in database to point to latest version
    const { error: updateError } = await supabase
      .from('deliverables')
      .update({ 
        storage_path: versionedFilePath, 
        filename: filename, 
        filetype: filetype || null 
      })
      .eq('id', deliverableId);

    if (updateError) {
      console.error('Error updating deliverable:', updateError);
      return NextResponse.json(
        { error: `Failed to update deliverable: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Asset uploaded successfully',
      filePath: versionedFilePath
    });
  } catch (error) {
    console.error('Error in upload-asset API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

