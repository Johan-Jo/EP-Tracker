# 🚨 FIX: Photo Upload Bug - RLS Policy Error

**Error:** `Failed to upload photo: new row violates row-level security policy`

**Cause:** Storage bucket RLS policies are not configured

---

## 🔧 Quick Fix (5 minutes)

### Option 1: Via Supabase Dashboard (RECOMMENDED)

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Storage:**
   - Click **Storage** in left sidebar
   - Click on **"receipts"** bucket
   - If bucket doesn't exist, click **"New bucket"**:
     - Name: `receipts`
     - Public: ✓ Enable
     - Click **"Create bucket"**

3. **Configure RLS Policies:**
   - Click on **"receipts"** bucket
   - Go to **"Policies"** tab
   - Click **"New Policy"**
   
4. **Add These 4 Policies:**

#### Policy 1: Allow Upload (INSERT)
```
Policy name: Allow authenticated uploads
Allowed operation: INSERT
Target roles: authenticated
USING expression: (leave empty)
WITH CHECK expression: bucket_id = 'receipts'
```
**OR use SQL:**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');
```

#### Policy 2: Allow Update
```
Policy name: Allow authenticated updates
Allowed operation: UPDATE
Target roles: authenticated
USING expression: bucket_id = 'receipts'
```
**OR use SQL:**
```sql
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');
```

#### Policy 3: Allow Delete
```
Policy name: Allow authenticated deletes
Allowed operation: DELETE
Target roles: authenticated
USING expression: bucket_id = 'receipts'
```
**OR use SQL:**
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

#### Policy 4: Allow Public Read (SELECT)
```
Policy name: Allow public read
Allowed operation: SELECT
Target roles: public
USING expression: bucket_id = 'receipts'
```
**OR use SQL:**
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

5. **Verify:**
   - Click **"Review"** → **"Save policy"** for each
   - You should see 4 policies listed

---

### Option 2: Via SQL Editor (FASTER)

1. **Go to Supabase Dashboard → SQL Editor**

2. **Run this SQL:**

```sql
-- Create receipts bucket (if doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies (if any)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Create new policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');
```

3. **Click "Run"**

4. **Expected result:** "Success. No rows returned"

---

## ✅ Test the Fix

1. **Refresh the application** (F5)

2. **Try uploading a photo again:**
   - Navigate to: http://localhost:3001/dashboard/materials
   - Fill in the material form
   - Click **"📷 Ta foto/välj"**
   - Select an image
   - Click **"Spara material"**

3. **Expected result:**
   - ✅ Photo uploads successfully
   - ✅ No error message
   - ✅ Material appears in list with photo

---

## 🔍 Why This Happened

**Root Cause:**
- The `receipts` bucket was created in the database schema migration
- BUT Storage bucket RLS policies are separate from table RLS policies
- Storage policies must be explicitly configured for each bucket
- Without policies, ALL operations are denied by default

**What We Fixed:**
1. ✅ Ensured bucket exists
2. ✅ Made bucket public (so photos are viewable)
3. ✅ Allowed authenticated users to upload (INSERT)
4. ✅ Allowed authenticated users to update files
5. ✅ Allowed authenticated users to delete files
6. ✅ Allowed public to view files (SELECT)

---

## 🎯 Prevention

**For future buckets (diary-photos, ata-photos):**
- Run the same SQL but change `'receipts'` to the new bucket name
- OR manually create policies via dashboard

**Example for diary-photos:**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-photos', 'diary-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated uploads diary"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diary-photos');

-- (repeat for UPDATE, DELETE, SELECT)
```

---

## 📊 Verification Checklist

After applying the fix:

- [ ] Bucket **"receipts"** exists
- [ ] Bucket is **public** (checked)
- [ ] Policy: **Allow authenticated uploads** exists
- [ ] Policy: **Allow authenticated updates** exists  
- [ ] Policy: **Allow authenticated deletes** exists
- [ ] Policy: **Allow public read** exists
- [ ] Photo upload works in app
- [ ] Photo displays in list
- [ ] No console errors

---

## 🐛 Still Not Working?

### Check Authentication:
```javascript
// In browser console (F12)
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
// Should show user object, not null
```

### Check Bucket:
1. Go to Supabase → Storage → "receipts"
2. Try uploading a file manually via dashboard
3. If fails, check bucket settings:
   - ✓ Public must be enabled
   - ✓ File size limit: reasonable (e.g., 50MB)

### Check Browser Console:
```
F12 → Console tab
Look for errors like:
- "User not authenticated"
- "Bucket not found"
- "Policy violation"
```

### Manual Test Upload:
```javascript
// In browser console
const supabase = createClient();
const file = new File(['test'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('receipts')
  .upload('test/test.txt', file);
console.log('Upload result:', { data, error });
// Should show data, not error
```

---

## 📝 Summary

**What:** Storage RLS policies missing  
**Why:** Buckets need explicit permission policies  
**Fix:** Add 4 RLS policies via SQL or dashboard  
**Time:** 5 minutes  
**Impact:** Critical - blocks all photo uploads

**Status after fix:** ✅ Photo uploads working

---

**Last Updated:** October 19, 2025  
**Bug Priority:** 🔴 CRITICAL - BLOCKING  
**Fix Status:** ⏳ MANUAL ACTION REQUIRED

