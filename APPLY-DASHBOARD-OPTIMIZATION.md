# Apply Dashboard Optimization (Story 26.4)

## ⚠️ IMPORTANT: This is a DATABASE MIGRATION

**Status:** 🔧 LOCAL TESTING ONLY - DO NOT RUN IN PRODUCTION YET

---

## What This Does

This migration creates two PostgreSQL functions and adds indexes to optimize dashboard loading:

1. **`get_dashboard_stats()`** - Combines 4 count queries into 1
2. **`get_recent_activities()`** - Combines 6 activity queries into 1 unified query
3. **Performance indexes** - Ensures all queries are fast

**Expected Impact:** Dashboard queries reduced from 12 to 3-4 (60-70% improvement)

---

## How to Apply

### ⚠️ TESTING FIRST (Local Supabase)

If you have a local Supabase instance:

```bash
# Navigate to project
cd "C:\Users\johan\Cursor Portfolio\EP-Tracker"

# Apply migration using Supabase CLI
supabase db push

# Or manually run the migration
psql -h localhost -U postgres -d postgres -f supabase/migrations/20250125000001_dashboard_optimization.sql
```

### 🔒 PRODUCTION (AFTER THOROUGH TESTING)

**DO NOT RUN IN PRODUCTION WITHOUT:**
- [ ] Local testing complete
- [ ] Migration tested on development/staging database
- [ ] Application code updated to use new functions
- [ ] Backup of production database taken
- [ ] Team approval obtained

**To apply to production:**

1. **Via Supabase Dashboard:**
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/20250125000001_dashboard_optimization.sql`
   - Run in production (with backup!)

2. **Via Supabase CLI:**
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

---

## Verify Migration

After applying, test the functions:

```sql
-- Test 1: Get dashboard stats
SELECT get_dashboard_stats(
  '53660a15-bd3d-46b1-8766-e1ad474e8d74'::uuid,  -- Your user ID
  'b1a9ff56-5e74-44f5-84da-29ada1c04f57'::uuid,  -- Your org ID
  NOW() - INTERVAL '7 days'
);

-- Expected output: JSON with projectsCount, timeEntriesCount, materialsCount

-- Test 2: Get recent activities
SELECT * FROM get_recent_activities(
  'b1a9ff56-5e74-44f5-84da-29ada1c04f57'::uuid,  -- Your org ID
  10
);

-- Expected output: 10 most recent activities across all types

-- Test 3: Verify indexes were created
SELECT 
  tablename, 
  indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
  AND tablename IN ('time_entries', 'projects', 'materials', 'expenses', 'ata', 'diary_entries')
ORDER BY tablename, indexname;

-- Expected: Should see all new indexes listed
```

---

## Application Code Changes Needed

After migration is applied, update the dashboard page to use the new functions:

**File:** `app/dashboard/page.tsx`

**BEFORE:** 12 separate queries
**AFTER:** 3-4 queries using database functions

See implementation in Story 26.4 of `PERFORMANCE-IMPROVEMENT-EPIC.md`

---

## Rollback Plan

If something goes wrong:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS get_recent_activities(uuid, int);

-- Drop indexes (optional - they don't hurt to keep)
DROP INDEX IF EXISTS idx_time_entries_user_start;
DROP INDEX IF EXISTS idx_time_entries_org_created;
DROP INDEX IF EXISTS idx_time_entries_org_null_stop;
DROP INDEX IF EXISTS idx_projects_org_status;
DROP INDEX IF EXISTS idx_projects_org_created;
DROP INDEX IF EXISTS idx_materials_user_created;
DROP INDEX IF EXISTS idx_materials_org_created;
DROP INDEX IF EXISTS idx_expenses_user_created;
DROP INDEX IF EXISTS idx_expenses_org_created;
DROP INDEX IF EXISTS idx_ata_org_created;
DROP INDEX IF EXISTS idx_diary_entries_org_created;
```

---

## Performance Comparison

### Before (Current Implementation)
```
Dashboard Load:
- Query 1: Count projects (50ms)
- Query 2: Count time entries (80ms)
- Query 3: Count materials (60ms)
- Query 4: Count expenses (60ms)
- Query 5: Get active time entry (40ms)
- Query 6: Get recent project (40ms)
- Query 7: Get all projects (100ms)
- Query 8: Get recent time entries (150ms)
- Query 9: Get recent materials (120ms)
- Query 10: Get recent expenses (120ms)
- Query 11: Get recent ATA (100ms)
- Query 12: Get recent diary (100ms)

Total: ~1020ms + network overhead = 1.5-2 seconds
```

### After (With Optimization)
```
Dashboard Load:
- Query 1: get_dashboard_stats() (80ms - all stats in one query)
- Query 2: Get active time entry (40ms)
- Query 3: Get all projects (100ms)
- Query 4: get_recent_activities() (200ms - all activities in one query)

Total: ~420ms + network overhead = 600-800ms
```

**Improvement: ~60% faster database queries** ⚡

---

## Monitoring

After deploying, monitor:

1. **Query Performance:**
   - Watch execution times in Supabase Dashboard
   - Check for slow query logs

2. **Database Load:**
   - Monitor CPU usage
   - Check connection pool usage

3. **Application Performance:**
   - Dashboard load times should improve by 60%
   - Fewer network requests

---

## Next Steps

1. **Apply migration** (local/staging first!)
2. **Test functions** (run verification queries)
3. **Update application code** (use new functions)
4. **Test dashboard** (verify it works)
5. **Measure performance** (compare before/after)
6. **Deploy to production** (after approval)

---

**Status:** 🔧 MIGRATION READY - TEST BEFORE PRODUCTION  
**Risk Level:** 🟡 MEDIUM (database changes, but safe with rollback)  
**Estimated Time:** 10 minutes to apply + test

**Remember:** Always backup production database before running migrations! 🛡️

