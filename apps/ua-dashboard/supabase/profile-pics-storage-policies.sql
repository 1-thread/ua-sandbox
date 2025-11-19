-- Storage Policies for Profile Pics Bucket
-- Run this in Supabase SQL Editor to allow programmatic access
-- 
-- Note: This allows authenticated users to upload. For public uploads,
-- you may need to adjust these policies or use the service role key.

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to profile-pics"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pics');

-- Allow authenticated users to update files
CREATE POLICY "Allow authenticated updates to profile-pics"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pics')
WITH CHECK (bucket_id = 'profile-pics');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes to profile-pics"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pics');

-- Allow public read access (for signed URLs)
-- Note: Since bucket is private, signed URLs will still work
-- This policy allows the app to generate signed URLs
CREATE POLICY "Allow public read access to profile-pics"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pics');

