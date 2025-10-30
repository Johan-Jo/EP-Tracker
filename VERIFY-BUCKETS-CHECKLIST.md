# ✅ Storage Buckets Verification Checklist

## Step 1: Run Verification SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `scripts/verify-storage-buckets.sql` 
3. Click **"Run"**
4. Check the results

---

## Step 2: Expected Results

### ✅ Buckets Created (Should see 4 buckets)
- ✅ `receipts` - Public
- ✅ `diary-photos` - Public
- ✅ `ata-photos` - Public
- ✅ `voice-recordings` - Private

### ✅ RLS Policies Created (Should see 16 total policies)
Each bucket should have **4 policies**:
- 4 policies for `receipts` (INSERT, UPDATE, DELETE, SELECT)
- 4 policies for `diary-photos` (INSERT, UPDATE, DELETE, SELECT)
- 4 policies for `ata-photos` (INSERT, UPDATE, DELETE, SELECT)
- 4 policies for `voice-recordings` (INSERT, UPDATE, DELETE, SELECT)

---

## Step 3: Manual Verification (Alternative)

If you prefer to check manually:

### Check Buckets in Dashboard
1. Go to **Supabase Dashboard**
2. Click **Storage** in left sidebar
3. You should see these buckets:
   - [ ] `receipts`
   - [ ] `diary-photos`
   - [ ] `ata-photos`
   - [ ] `voice-recordings`

### Check Policies
For each bucket:
1. Click on the bucket name
2. Go to **"Policies"** tab
3. You should see 4 policies:
   - [ ] Allow authenticated uploads (INSERT)
   - [ ] Allow authenticated updates (UPDATE)
   - [ ] Allow authenticated deletes (DELETE)
   - [ ] Allow public read (SELECT) OR Allow users read (for voice-recordings)

---

## Step 4: Test the Fix

### Test Dagbok Photo Upload
1. **Open your app**
2. **Go to Dagbok (Diary)**
3. **Create a new entry**
4. **Add a photo**
5. **Click "Spara" (Save)**
6. **Expected:** ✅ Photo uploads successfully, no "bucket not found" error

### Test Other Features (Optional)
- [ ] **Materials** - Upload receipt photo
- [ ] **Expenses** - Upload receipt photo
- [ ] **ÄTA** - Upload photo

---

## 🐛 Troubleshooting

### If Buckets Are Missing

Some Supabase instances require buckets to be created via Dashboard:

1. **Go to:** Storage → New Bucket
2. **Create each missing bucket:**
   
   **For receipts, diary-photos, ata-photos:**
   - Name: `[bucket-name]`
   - Public: ✓ **Enable**
   - File size limit: 10 MB
   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/heic
   
   **For voice-recordings:**
   - Name: `voice-recordings`
   - Public: ✗ **Disable** (Private)
   - File size limit: 10 MB
   - Allowed MIME types: audio/webm, audio/wav, audio/mpeg

3. **Then re-run** `scripts/fix-all-storage-buckets.sql` to add policies

---

## ✅ Success Indicators

You'll know everything is working when:
- ✅ Verification query shows all 4 buckets
- ✅ Verification query shows 16 policies
- ✅ Dagbok photo upload works without errors
- ✅ No console errors in browser (F12)

---

## 📊 What to Report Back

Please share:
1. **Results from verification SQL** (copy/paste the output)
2. **Screenshot of Storage page** (showing all buckets)
3. **Test result** - Did Dagbok photo upload work? ✅/❌

This will help me confirm everything is set up correctly!

