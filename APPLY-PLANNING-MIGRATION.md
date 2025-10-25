# 🚀 Apply Planning Optimization Migration

## What This Does

This migration creates a database function that consolidates 4 separate queries into 1 optimized database-side query for the planning page.

**Expected Result:** API response time: 3.5s → <1s! ⚡

---

## Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **EP-Tracker**
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

---

## Step 2: Copy Migration SQL

Copy the entire contents of this file:
```
supabase/migrations/20250125000003_planning_optimization.sql
```

Paste it into the SQL Editor.

---

## Step 3: Run Migration

Click **Run** button (or press Cmd/Ctrl + Enter)

**Expected output:**
```
Success. No rows returned.
```

---

## Step 4: Verify Function Exists

Run this query to verify:

```sql
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_planning_data';
```

**Expected result:** Should show the function with its arguments.

---

## Step 5: Test Function

Test the function with your user data:

```sql
-- First, get your org_id
SELECT org_id FROM memberships WHERE user_id = auth.uid() LIMIT 1;

-- Then test the function (replace YOUR_ORG_ID)
SELECT get_planning_data(
    'YOUR_ORG_ID'::uuid,
    '2025-10-20 00:00:00+00'::timestamptz,
    '2025-10-26 23:59:59+00'::timestamptz,
    NULL,
    NULL
);
```

**Expected:** JSON object with resources, projects, assignments, absences

---

## Step 6: Verify Indexes

Check that all indexes were created:

```sql
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('assignments', 'absences', 'memberships')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected:** Should show 6 new indexes:
- `idx_assignments_org_start_status`
- `idx_assignments_project_user`
- `idx_absences_org_dates`
- `idx_absences_user`
- `idx_memberships_org_active`

---

## Step 7: Test Locally

1. Make sure code changes are pulled
2. Go to `http://localhost:3002/dashboard/planning`
3. Open browser DevTools → Network tab
4. Check `/api/planning` request time

**Expected:** <1000ms (instead of 3500ms!)

---

## Verification Checklist

- [ ] Migration ran successfully
- [ ] Function `get_planning_data` exists
- [ ] All 6 indexes created
- [ ] Test query returns data
- [ ] Local planning page loads fast
- [ ] API response < 1 second

---

## Rollback Plan (If Needed)

If something goes wrong:

```sql
-- Drop function
DROP FUNCTION IF EXISTS get_planning_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID, UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_assignments_org_start_status;
DROP INDEX IF EXISTS idx_assignments_project_user;
DROP INDEX IF EXISTS idx_absences_org_dates;
DROP INDEX IF EXISTS idx_absences_user;
DROP INDEX IF EXISTS idx_memberships_org_active;
```

Then revert code changes:
```bash
git revert HEAD
```

---

## Expected Performance

### Before
- **API Response:** 3.5 seconds
- **Queries:** 4 sequential queries
- **Total DB time:** ~3 seconds

### After
- **API Response:** <1 second ⚡
- **Queries:** 1 database function
- **Total DB time:** ~500ms

### Improvement
**70% faster API response!** (3.5s → 1s)

---

**Ready to apply?** Follow steps 1-7 above!

