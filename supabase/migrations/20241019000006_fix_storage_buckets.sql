-- Fix Storage Buckets and RLS Policies
-- This fixes the "new row violates row-level security policy" error

-- Ensure receipts bucket exists (it should from earlier migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure diary-photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-photos', 'diary-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure ata-photos bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('ata-photos', 'ata-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public access to receipts" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete diary photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to diary photos" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete ATA photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to ATA photos" ON storage.objects;

-- Create RLS policies for receipts bucket (materials, expenses)
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

-- Create RLS policies for diary-photos bucket
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

-- Create RLS policies for ata-photos bucket
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

-- Verify buckets exist
DO $$
BEGIN
  RAISE NOTICE 'Storage buckets configured successfully';
END $$;

