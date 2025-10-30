# 🚨 FIX: "Bucket not found" Error in Dagbok (Diary)

**Error:** `bucket not found` when saving images in Dagbok
**Cause:** The `diary-photos` storage bucket doesn't exist in Supabase

---

## 🔧 Quick Fix (5 minutes)

### Step 1: Create the Bucket

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard
   - Select your project: **EP-Tracker**

2. **Navigate to Storage:**
   - Click **Storage** in the left sidebar
   - Click **"New bucket"** button

3. **Create `diary-photos` bucket:**
   - **Name:** `diary-photos`
   - **Public bucket:** ✓ **Enable** (check this box)
   - **File size limit:** `10 MB`
   - **Allowed MIME types:**
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `image/heic`
   - Click **"Create bucket"**

---

### Step 2: Configure RLS Policies

After creating the bucket, you need to add security policies.

#### Option A: Via Supabase Dashboard

1. Click on the **"diary-photos"** bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"** and add these 4 policies:

**Policy 1: Allow Upload (INSERT)**
```
Policy name: Allow authenticated uploads
Allowed operation: INSERT
Target roles: authenticated
WITH CHECK expression: bucket_id = 'diary-photos'
```

**Policy 2: Allow Update**
```
Policy name: Allow authenticated updates
Allowed operation: UPDATE
Target roles: authenticated
USING expression: bucket_id = 'diary-photos'
```

**Policy 3: Allow Delete**
```
Policy name: Allow authenticated deletes
Allowed operation: DELETE
Target roles: authenticated
USING expression: bucket_id = 'diary-photos'
```

**Policy 4: Allow Public Read**
```
Policy name: Allow public read
Allowed operation: SELECT
Target roles: public
USING expression: bucket_id = 'diary-photos'
```

#### Option B: Via SQL Editor (Faster)

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **"New query"**
3. Paste this SQL:

```sql
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
```

4. Click **"Run"**

---

## ✅ Verify the Fix

1. **Refresh your app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Go to Dagbok (Diary)**
3. **Create a new entry** with a photo
4. **Click "Spara"** (Save)
5. ✅ **Photo should upload successfully** without "bucket not found" error

---

## 🎯 What This Fixed

- ✅ Created `diary-photos` storage bucket
- ✅ Made bucket public (so photos are viewable)
- ✅ Allowed authenticated users to upload photos (INSERT)
- ✅ Allowed authenticated users to update photos (UPDATE)
- ✅ Allowed authenticated users to delete photos (DELETE)
- ✅ Allowed public to view photos (SELECT)

---

## 📋 Verify Bucket Status

After applying the fix, verify in Supabase Dashboard:

**Go to Storage → diary-photos:**
- [ ] Bucket **"diary-photos"** exists
- [ ] Bucket is **public** (checked)
- [ ] Policy: **Allow authenticated uploads** exists
- [ ] Policy: **Allow authenticated updates** exists
- [ ] Policy: **Allow authenticated deletes** exists
- [ ] Policy: **Allow public read** exists

---

## 🐛 Still Not Working?

### Check Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Try uploading a photo again
4. Look for error messages - they will show the exact issue

### Check Authentication
Open browser console and run:
```javascript
// Check if user is logged in
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
// Should show user object, not null
```

### Check Bucket Manually
1. Go to Supabase Dashboard → Storage → "diary-photos"
2. Try uploading a file manually via dashboard
3. If this fails, the bucket might not be properly configured

---

## 🔮 Future: Other Buckets

You'll also need to create these buckets eventually:
- `receipts` - For material receipts and expense photos
- `ata-photos` - For ÄTA (change order) photos

Use the same process above but change the bucket name.

---

## 📞 Need Help?

If this fix doesn't work:
1. Screenshot the error in browser console (F12)
2. Screenshot the Supabase Storage page
3. Check that you're using the correct Supabase project

