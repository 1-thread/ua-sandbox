import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

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
    const modelUsed = formData.get('modelUsed') as string | null;

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

    // Check if the filename is already versioned (contains timestamp pattern)
    // If it's already versioned (from archive function), use it as-is
    const isAlreadyVersioned = filename.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    
    // Extract directory from baseFilePath (needed for both versioned and non-versioned paths)
    const pathParts = baseFilePath.split('/');
    const directory = pathParts.slice(0, -1).join('/');
    
    let versionedFileName: string;
    let versionedFilePath: string;
    
    if (isAlreadyVersioned) {
      // Filename is already versioned, use it as-is
      versionedFileName = filename;
      versionedFilePath = directory ? `${directory}/${versionedFileName}` : versionedFileName;
    } else {
      // Create versioned file path with timestamp and contributor
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const contributorSlug = contributorName 
        ? contributorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : 'unknown';
      const fileExt = filename.split('.').pop() || '';
      const baseName = filename.replace(`.${fileExt}`, '');
      versionedFileName = `${baseName}_${timestamp}_${contributorSlug}.${fileExt}`;
      versionedFilePath = directory ? `${directory}/${versionedFileName}` : versionedFileName;
    }

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

    // Generate thumbnail if file is an image
    let thumbnailPath: string | null = null;
    // Check both file.type and filename extension (file.type might be empty for Blobs)
    const isImage = (file.type && file.type.startsWith('image/')) || 
                    ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                      filename.toLowerCase().endsWith(`.${ext}`)
                    );

    if (isImage) {
      try {
        console.log(`🖼️  Generating thumbnail for image: ${filename}`);
        // Create thumbnail using sharp
        const thumbnailBuffer = await sharp(fileBuffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Create thumbnail path
        const nameWithoutExt = versionedFileName.replace(/\.[^/.]+$/, '');
        const thumbnailFilename = `${nameWithoutExt}_thumb.jpg`;
        const thumbnailStoragePath = directory ? `${directory}/${thumbnailFilename}` : thumbnailFilename;

        console.log(`📤 Uploading thumbnail to: ${thumbnailStoragePath}`);

        // Upload thumbnail
        const { error: thumbnailError } = await supabase.storage
          .from('ip-assets')
          .upload(thumbnailStoragePath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!thumbnailError) {
          thumbnailPath = thumbnailStoragePath;
          console.log('✅ Thumbnail generated and uploaded:', thumbnailStoragePath);
        } else {
          console.error('❌ Error uploading thumbnail:', thumbnailError);
          // Don't fail the upload if thumbnail fails
        }
      } catch (thumbnailErr) {
        console.error('❌ Error generating thumbnail:', thumbnailErr);
        // Don't fail the upload if thumbnail generation fails
      }
    } else {
      console.log(`⏭️  Skipping thumbnail generation (not an image): ${filename}, type: ${file.type}`);
    }

    // Save to asset history
    const historyData: any = {
      deliverable_id: deliverableId,
      contributor_id: contributorId || null,
      filename: filename,
      storage_path: versionedFilePath,
      uploaded_at: new Date().toISOString(),
      thumbnail_path: thumbnailPath || null
    };

    console.log(`💾 Saving asset history with thumbnail_path: ${thumbnailPath || 'null'}`);

    // Only include model_used if provided
    if (modelUsed) {
      historyData.model_used = modelUsed;
    }

    const { error: historyError } = await supabase
      .from('asset_history')
      .insert(historyData);

    if (historyError) {
      console.error('Error saving asset history:', historyError);
      // Try again without model_used in case the column doesn't exist
      if (modelUsed && historyError.message.includes('model_used')) {
        const { error: retryError } = await supabase
          .from('asset_history')
          .insert({
            deliverable_id: deliverableId,
            contributor_id: contributorId || null,
            filename: filename,
            storage_path: versionedFilePath,
            uploaded_at: new Date().toISOString()
          });
        
        if (retryError) {
          console.error('Error saving asset history (retry without model_used):', retryError);
        } else {
          console.log('✅ Asset history saved (without model_used column)');
        }
      }
      // Don't fail the upload if history save fails, but log it
    } else {
      console.log('✅ Asset history saved successfully');
    }

    // Update deliverable in database to point to latest version
    // Only update storage_path, not filename (filename should remain the original deliverable filename)
    const { error: updateError } = await supabase
      .from('deliverables')
      .update({ 
        storage_path: versionedFilePath,
        // Don't update filename - keep the original deliverable filename
        // filename: filename, 
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

