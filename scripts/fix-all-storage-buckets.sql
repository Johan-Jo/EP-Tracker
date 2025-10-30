-- ============================================
-- Fix All Storage Buckets
-- ============================================
-- This script creates missing storage buckets and RLS policies
-- Run this in Supabase SQL Editor

-- Note: Buckets might need to be created via Dashboard first
-- See STORAGE-BUCKETS-CHECK.md for details

-- ============================================
-- 1. CREATE BUCKETS (if they don't exist)
-- ============================================

-- Receipts bucket (for materials and expenses)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Diary photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-photos', 'diary-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ATA photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ata-photos', 'ata-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Voice recordings bucket (for EPIC-27)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ============================================
-- 2. DROP OLD POLICIES (clean slate)
-- ============================================

-- Receipts
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public access to receipts" ON storage.objects;

-- Diary photos
DROP POLICY IF EXISTS "Authenticated users can upload diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to diary photos" ON storage.objects;

-- ATA photos
DROP POLICY IF EXISTS "Authenticated users can upload ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to ATA photos" ON storage.objects;

-- Voice recordings
DROP POLICY IF EXISTS "Authenticated users can upload voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read own voice recordings" ON storage.objects;

-- ============================================
-- 3. CREATE RLS POLICIES FOR RECEIPTS
-- ============================================

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can update receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Public access to receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- ============================================
-- 4. CREATE RLS POLICIES FOR DIARY PHOTOS
-- ============================================

CREATE POLICY "Authenticated users can upload diary photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diary-photos');

CREATE POLICY "Authenticated users can update diary photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'diary-photos');

CREATE POLICY "Authenticated users can delete diary photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diary-photos');

CREATE POLICY "Public access to diary photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diary-photos');

-- ============================================
-- 5. CREATE RLS POLICIES FOR ATA PHOTOS
-- ============================================

CREATE POLICY "Authenticated users can upload ATA photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ata-photos');

CREATE POLICY "Authenticated users can update ATA photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ata-photos');

CREATE POLICY "Authenticated users can delete ATA photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ata-photos');

CREATE POLICY "Public access to ATA photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ata-photos');

-- ============================================
-- 6. CREATE RLS POLICIES FOR VOICE RECORDINGS
-- ============================================

CREATE POLICY "Authenticated users can upload voice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'voice-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update voice recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'voice-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete voice recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'voice-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can read own voice recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'voice-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check which buckets now exist
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
WHERE id IN ('receipts', 'diary-photos', 'ata-photos', 'voice-recordings')
ORDER BY name;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%receipts%'
   OR policyname LIKE '%diary%'
   OR policyname LIKE '%ata%'
   OR policyname LIKE '%voice%'
ORDER BY policyname;

