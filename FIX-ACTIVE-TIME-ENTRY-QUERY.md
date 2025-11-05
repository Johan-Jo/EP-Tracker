# Fix Active Time Entry Query Performance

## Problem
The dashboard was experiencing timeout errors when fetching the active time entry:

```
[DASHBOARD] Error fetching active time entry: {}
Connect Timeout Error (attempted addresses: 104.18.38.10:443, 172.64.149.246:443)
```

## Root Cause
The query `getActiveTimeEntry()` filters by:
- `user_id = X`
- `stop_at IS NULL` 
- Order by `start_at DESC`
- Limit 1

The existing database indexes don't support this query pattern efficiently:
- `idx_time_entries_user_start` - Only has (user_id, start_at) without filtering for active entries
- `idx_time_entries_org_null_stop` - Has org_id prefix but query doesn't use org_id

Without a proper index, the database must:
1. Scan all time entries for the user
2. Filter for stop_at IS NULL
3. Sort by start_at
4. Return first result

This becomes slow as the time_entries table grows.

## Solution

### 1. Database Index Migration
Created migration: `supabase/migrations/20250129000001_fix_active_time_entry_index.sql`

**Key changes:**
- Removed ineffective `idx_time_entries_user_start` index
- Added partial index `idx_time_entries_user_active` on `(user_id, start_at DESC)` WHERE `stop_at IS NULL`
- Added covering index `idx_time_entries_user_active_cover` to eliminate table lookups

### 2. Improved Error Logging
Updated `lib/db/dashboard.ts` to log more detailed error information:
- Error code, message, details, and hints
- Proper exception handling

## To Apply the Fix

### If using local Supabase:
```bash
supabase db push
```

### If using hosted Supabase:
Run the migration via Supabase Dashboard or CLI:
```bash
supabase db push --linked
```

Or apply manually in Supabase SQL Editor:
```sql
-- From supabase/migrations/20250129000001_fix_active_time_entry_index.sql
DROP INDEX IF EXISTS idx_time_entries_user_start;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_active 
  ON time_entries(user_id, start_at DESC)
  WHERE stop_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_active_cover
  ON time_entries(user_id, start_at DESC, project_id, id, task_label, notes)
  WHERE stop_at IS NULL;
```

## Expected Results

After applying the migration:
- Active time entry query should be <50ms (down from 2000ms+ timeout)
- Dashboard should load without timeout errors
- Better error diagnostics in logs if issues persist

## Testing

1. Restart your development server
2. Navigate to /dashboard
3. Should load without timeout errors
4. Check browser console for detailed error logs if issues occur

## Related Issues

This fix is part of EPIC-26 database optimization efforts to ensure all dashboard queries are fast and properly indexed.



