# Diary Date Fix - Complete Checklist

## Problem
Dates were showing as previous day (e.g., 2025-10-27 displayed as "26 oktober") due to timezone conversion issues when JavaScript interprets `YYYY-MM-DD` strings as UTC.

## Solution
1. DB stores as `DATE` type (no time/timezone)
2. API sends plain `YYYY-MM-DD` strings
3. UI uses `formatPlainDate()` utility that adds `T00:00:00` to force local time interpretation

---

## A) Database Verification

### Run in Supabase SQL Editor:
```sql
-- 1) Verify column type is 'date' (not timestamp/timestamptz)
SELECT 
    table_name,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'diary_entries' 
AND column_name = 'date';

-- Expected: data_type = 'date'

-- 2) Check recent entries
SELECT 
    id, 
    project_id,
    date::text as date_text,
    created_at
FROM diary_entries
ORDER BY created_at DESC
LIMIT 10;

-- Expected: date_text shows YYYY-MM-DD (e.g., '2025-10-27')

-- 3) Verify RPC function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'insert_diary_entry';

-- Expected: insert_diary_entry exists
```

### If column is wrong type, fix with:
```sql
ALTER TABLE diary_entries
    ALTER COLUMN date TYPE date
    USING date::date;
```

---

## B) API Verification

### File: `app/api/diary/route.ts`

✅ **Already Fixed:**
- Validates date format: `/^\d{4}-\d{2}-\d{2}$/`
- Sends as string to RPC: `p_date: body.date`
- RPC casts to DATE server-side: `p_date::date`

---

## C) UI Components Fixed

### Fixed Files:
1. ✅ `components/diary/diary-page-new.tsx` - Uses `formatPlainDate()` and `formatSwedishFull()`
2. ✅ `components/diary/diary-detail-new.tsx` - Uses `formatPlainDate()` and `formatSwedishFull()`
3. ✅ `components/diary/diary-detail-client.tsx` - Uses `formatPlainDate()` and `formatSwedishFull()`
4. ✅ `components/diary/diary-list.tsx` - Uses `formatPlainDate()` and `formatSwedishFull()`
5. ✅ `components/mileage/mileage-list.tsx` - Shows raw date string
6. ✅ `components/approvals/materials-review-table.tsx` - Shows raw date strings

### Utility: `lib/utils/formatPlainDate.ts`
- ✅ `formatPlainDate(dateStr, locale, style)` - Safe date formatting
- ✅ `formatSwedishFull(dateStr)` - "söndag 27 oktober 2025"
- ✅ `parseYMD(dateStr)` - Parse to {y, m, d} numbers
- ✅ `getWeekdayName(dateStr, locale)` - Get weekday only

---

## D) Migration Applied

### File: `supabase/migrations/20250127000007_fix_diary_date_timezone.sql`

✅ Creates `insert_diary_entry()` RPC function that:
- Accepts `p_date text` parameter
- Casts to `DATE` type: `p_date::date`
- Returns JSON of inserted entry
- Has `SECURITY DEFINER` to bypass RLS

---

## E) Testing Checklist

### 1. Database Tests
- [ ] Run `scripts/verify-diary-schema.sql` in Supabase SQL Editor
- [ ] Verify `diary_entries.date` is type `date`
- [ ] Verify `insert_diary_entry` RPC exists
- [ ] Check recent entries show correct dates

### 2. Create New Diary Entry
- [ ] Navigate to `/dashboard/diary/new`
- [ ] Select today's date (e.g., 2025-10-27)
- [ ] Fill in required fields
- [ ] Submit form
- [ ] Verify entry is created in DB with correct date
- [ ] Check activity log if needed

### 3. View Diary List
- [ ] Navigate to `/dashboard/diary`
- [ ] Find today's entry
- [ ] **Verify date badge shows correct date** (e.g., "27 okt 2025")
- [ ] **Verify title shows correct full date** (e.g., "Dagbok - söndag 27 oktober 2025")

### 4. View Diary Detail
- [ ] Click on today's diary entry
- [ ] **Verify header shows correct full date** (e.g., "Dagbok - söndag 27 oktober 2025")
- [ ] **Verify date badge shows correct date** (e.g., "27 okt 2025")
- [ ] Verify signature timestamp (if signed) is correct

### 5. Edge Cases
- [ ] Test with date in different months
- [ ] Test with date at end of month
- [ ] Test with date at beginning of year
- [ ] Test viewing entries across multiple dates

### 6. Cross-Browser Testing
- [ ] Chrome (Windows)
- [ ] Edge (Windows)
- [ ] Firefox (Windows)
- [ ] Safari (if available)

---

## F) Verification Commands

### Check for remaining problematic date conversions:
```bash
# Find any remaining new Date(entry.date) or new Date(diary.date)
grep -r "new Date(.*\.date)" components/diary/

# Find parseISO usage
grep -r "parseISO" components/diary/

# Expected: No results or only in comments
```

---

## G) Rollback Plan (If Needed)

If issues occur:

1. **Revert migration:**
```sql
DROP FUNCTION IF EXISTS insert_diary_entry;
```

2. **Revert API changes:**
- Remove date format validation
- Use direct INSERT instead of RPC

3. **Revert UI changes:**
```bash
git checkout main -- components/diary/
git checkout main -- lib/utils/formatPlainDate.ts
```

---

## H) Success Criteria

✅ All diary entry dates display correctly as the calendar date they represent  
✅ No timezone conversion artifacts (-1 day bug)  
✅ Date formatting is consistent across all diary views  
✅ Signature timestamps still show correct time (separate from date)  
✅ No errors in browser console  
✅ No errors in Supabase logs  

---

## Notes

- **Signature timestamp** uses `timestamptz` (keeps time component) - this is CORRECT
- **Entry date** uses `date` (no time, no timezone) - this is CORRECT
- Always use `formatPlainDate()` or raw string for DATE columns
- Only use `new Date()` for TIMESTAMP columns (like `signature_timestamp`)

---

## Related Files

- Migration: `supabase/migrations/20250127000007_fix_diary_date_timezone.sql`
- API: `app/api/diary/route.ts`
- Utility: `lib/utils/formatPlainDate.ts`
- Components: `components/diary/*.tsx`
- Verification: `scripts/verify-diary-schema.sql`

