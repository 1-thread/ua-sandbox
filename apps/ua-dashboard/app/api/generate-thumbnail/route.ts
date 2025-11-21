import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const storagePath = formData.get('storagePath') as string;

    if (!file || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required fields: file, storagePath' },
        { status: 400 }
      );
    }

    // Check if file is an image
    const fileType = file.type.toLowerCase();
    const isImage = fileType.startsWith('image/') || 
                    ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                      storagePath.toLowerCase().endsWith(`.${ext}`)
                    );

    if (!isImage) {
      return NextResponse.json(
        { error: 'File is not an image' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Generate thumbnail (200x200, maintaining aspect ratio, center cropped)
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create thumbnail path
    const pathParts = storagePath.split('/');
    const filename = pathParts[pathParts.length - 1];
    const directory = pathParts.slice(0, -1).join('/');
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const thumbnailFilename = `${nameWithoutExt}_thumb.jpg`;
    const thumbnailPath = directory ? `${directory}/${thumbnailFilename}` : thumbnailFilename;

    // Upload thumbnail to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('ip-assets')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload thumbnail: ${uploadError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      thumbnailPath: thumbnailPath
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

