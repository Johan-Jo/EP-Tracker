-- EP Time Tracker - Storage Buckets Setup
-- Phase 1 MVP: Configure storage buckets for photos and receipts
-- Author: EP Tracker Team
-- Date: 2025-10-18

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create receipts bucket for materials and expenses photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
);

-- Create diary-photos bucket for daily diary photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'diary-photos',
    'diary-photos',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
);

-- Create ata-photos bucket for ÄTA photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ata-photos',
    'ata-photos',
    FALSE,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Receipts bucket policies
-- Users can upload their own receipts
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own receipts and admins/foremen can read org receipts
CREATE POLICY "Users can read receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'receipts' AND (
        (storage.foldername(name))[1] = auth.uid()::text OR
        -- Allow if user is foreman/admin in any org (checked via memberships)
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'foreman')
            AND is_active = TRUE
        )
    )
);

-- Users can delete their own draft receipts
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Diary photos bucket policies
-- Foremen and admins can upload diary photos
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

-- Users can read diary photos in their org
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

-- Foremen and admins can delete diary photos
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
-- Foremen and admins can upload ÄTA photos
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

-- Users can read ÄTA photos in their org
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

-- Foremen and admins can delete ÄTA photos
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA storage IS 'Storage schema for file uploads (receipts, photos)';

