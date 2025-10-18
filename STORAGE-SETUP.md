# Storage Buckets Setup Guide

Storage buckets must be created via the Supabase Dashboard (cannot be created via SQL).

## Create 3 Storage Buckets:

### 1. Go to Storage in Supabase Dashboard

Navigate to: **Storage** → **Create a new bucket**

---

### 2. Create Bucket: `receipts`

- **Name:** `receipts`
- **Public bucket:** `OFF` (Private)
- **File size limit:** `10 MB`
- **Allowed MIME types:** 
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - image/heic
  - application/pdf

Click **Create bucket**

---

### 3. Create Bucket: `diary-photos`

- **Name:** `diary-photos`
- **Public bucket:** `OFF` (Private)
- **File size limit:** `10 MB`
- **Allowed MIME types:**
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - image/heic

Click **Create bucket**

---

### 4. Create Bucket: `ata-photos`

- **Name:** `ata-photos`
- **Public bucket:** `OFF` (Private)
- **File size limit:** `10 MB`
- **Allowed MIME types:**
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - image/heic

Click **Create bucket**

---

## Optional: Add Storage Policies

After creating the buckets, you can add RLS policies by running this in SQL Editor:

```sql
-- Receipts: Users can manage their own
CREATE POLICY "Users upload own receipts" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read receipts" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'receipts');

-- Diary: Foremen/admins manage
CREATE POLICY "Foremen upload diary photos" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'diary-photos');

CREATE POLICY "Users read diary photos" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'diary-photos');

-- ÄTA: Foremen/admins manage
CREATE POLICY "Foremen upload ata photos" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'ata-photos');

CREATE POLICY "Users read ata photos" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'ata-photos');
```

---

## ✅ You're Done!

Once buckets are created, run: `node verify-setup.mjs` to confirm everything is working.

