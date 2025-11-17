-- Update IP image paths to use file paths instead of full URLs
-- This allows us to generate signed URLs dynamically for private storage
-- Store just the filename (not the full path or URL)

-- Update Doh World to use file paths
UPDATE ips 
SET 
  representative_image_url = 'doh-world-hero.png',
  icon_url = 'doh-world-icon.png'
WHERE slug = 'doh-world';

-- Note: The code will automatically use these filenames with the 'ip-assets' bucket
-- when generating signed URLs via supabase.storage.from('ip-assets').createSignedUrl()
-- 
-- Format in database: 'doh-world-hero.png'
-- Used in code: supabase.storage.from('ip-assets').createSignedUrl('doh-world-hero.png', 3600)
-- Result: Temporary signed URL that expires in 1 hour

