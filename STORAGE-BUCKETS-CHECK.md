# 🔍 Storage Buckets Status Check

## 📊 Required Storage Buckets

Based on codebase analysis, EP-Tracker requires these storage buckets:

| Bucket Name | Purpose | Used By | Status |
|------------|---------|---------|--------|
| **receipts** | Material receipts & expense photos | Materials, Expenses | ❓ Unknown |
| **diary-photos** | Dagbok (diary) entry photos | Diary entries | ❌ **MISSING** |
| **ata-photos** | ÄTA change order photos | ÄTA forms | ❓ Unknown |
| **voice-recordings** | Voice note recordings | Voice notes (EPIC-27) | ❓ Unknown |

---

## 🚨 Critical Issues Found

### Issue 1: `diary-photos` Bucket Missing
**Error:** "bucket not found" when saving Dagbok images
**Impact:** Users cannot upload photos to diary entries
**Priority:** 🔴 **HIGH** - Blocking feature

### Issue 2: Inconsistent Bucket Name in Code
**File:** `components/diary/diary-form-new.tsx` (lines 155, 161)
**Problem:** Uses bucket name `photos` instead of `diary-photos`
**Impact:** This form will fail if/when used
**Priority:** 🟡 **MEDIUM** - Code bug

```typescript
// ❌ WRONG (diary-form-new.tsx)
.from('photos')

// ✅ CORRECT (diary-form.tsx)  
.from('diary-photos')
```

---

## 📋 Where Each Bucket is Used

### 1. **receipts** Bucket
- `components/materials/receipt-upload.tsx` - Line 35, 45
- `components/materials/add-material-dialog.tsx` - Line 96, 102
- `components/materials/material-detail-modal.tsx` - Line 86
- `components/materials/material-form.tsx` - Line 157, 165
- `components/expenses/expense-form.tsx` - Line 138, 146

### 2. **diary-photos** Bucket
- `components/diary/diary-form.tsx` - Line 150, 160 ✅

### 3. **ata-photos** Bucket
- `components/ata/ata-form.tsx` - Line 126, 136

### 4. **voice-recordings** Bucket
- `app/api/voice/stream/route.ts` - Line 80, 103
- `lib/storage/voice-storage.ts` - Line 11

### 5. **photos** Bucket (INCORRECT)
- `components/diary/diary-form-new.tsx` - Line 155, 161 ❌ **BUG**

---

## ✅ Action Plan

### Step 1: Check Which Buckets Exist

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your **EP-Tracker** project
3. Click **Storage** in left sidebar
4. Check which of these buckets exist:
   - [ ] `receipts`
   - [ ] `diary-photos`
   - [ ] `ata-photos`
   - [ ] `voice-recordings`

### Step 2: Create Missing Buckets

For **each missing bucket**, follow the guide in:
- **`FIX-DIARY-PHOTOS-BUCKET.md`** (comprehensive setup guide)
- **`STORAGE-SETUP.md`** (all bucket configurations)

### Step 3: Fix Code Bug

Fix the incorrect bucket name in `diary-form-new.tsx`:

```typescript
// Change from 'photos' to 'diary-photos'
const { error: uploadError } = await supabase.storage
  .from('diary-photos')  // ← Fix this
  .upload(filePath, photo);

const { data: { publicUrl } } = supabase.storage
  .from('diary-photos')  // ← Fix this
  .getPublicUrl(filePath);
```

---

## 🎯 Immediate Fix for Current Issue

**Your current error** ("bucket not found" in Dagbok) is caused by:
- Missing `diary-photos` bucket

**Quick fix:**
1. Follow **`FIX-DIARY-PHOTOS-BUCKET.md`** (5 minutes)
2. Create the bucket in Supabase Dashboard
3. Add RLS policies
4. Test photo upload

---

## 🔧 Bucket Configuration Summary

All buckets should be configured as:
- **Public:** ✓ Yes (so photos are viewable via URLs)
- **File size limit:** 10 MB
- **Allowed MIME types:** 
  - image/jpeg
  - image/jpg
  - image/png
  - image/webp
  - image/heic
  - (application/pdf for receipts only)

**RLS Policies for each bucket:**
1. Allow authenticated users to INSERT (upload)
2. Allow authenticated users to UPDATE
3. Allow authenticated users to DELETE
4. Allow public to SELECT (view)

---

## 📞 Next Steps

1. **Go to Supabase Dashboard** and check which buckets exist
2. **Report back** which buckets are missing
3. **I'll create them for you** or guide you through the SQL

Would you like me to:
- ✅ Create SQL scripts to check bucket status?
- ✅ Fix the code bug in `diary-form-new.tsx`?
- ✅ Create a complete setup script for all buckets?

