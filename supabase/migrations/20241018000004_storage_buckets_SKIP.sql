-- EP Time Tracker - Storage Buckets Setup
-- 
-- ⚠️ IMPORTANT: Storage buckets MUST be created via Supabase Dashboard, not SQL
-- 
-- SKIP THIS FILE - Create buckets manually instead:
-- 
-- Go to: Storage → New Bucket
-- 
-- Bucket 1: receipts
--   - Name: receipts
--   - Public: No (Private)
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/heic, application/pdf
-- 
-- Bucket 2: diary-photos
--   - Name: diary-photos
--   - Public: No (Private)
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/heic
-- 
-- Bucket 3: ata-photos
--   - Name: ata-photos
--   - Public: No (Private)
--   - File size limit: 10MB
--   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/heic
-- 
-- After creating buckets, RLS policies can be added via SQL Editor:

-- Receipts bucket policies
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'receipts' AND (
        (storage.foldername(name))[1] = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'foreman')
            AND is_active = TRUE
        )
    )
);

CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Diary photos bucket policies
CREATE POLICY "Foremen and admins can upload diary photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'diary-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'foreman')
        AND is_active = TRUE
    )
);

CREATE POLICY "Users can read diary photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'diary-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
);

CREATE POLICY "Foremen and admins can delete diary photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'diary-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'foreman')
        AND is_active = TRUE
    )
);

-- ÄTA photos bucket policies
CREATE POLICY "Foremen and admins can upload ata photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ata-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'foreman')
        AND is_active = TRUE
    )
);

CREATE POLICY "Users can read ata photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'ata-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
);

CREATE POLICY "Foremen and admins can delete ata photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ata-photos' AND
    EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'foreman')
        AND is_active = TRUE
    )
);

