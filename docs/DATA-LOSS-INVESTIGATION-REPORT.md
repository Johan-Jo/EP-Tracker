# Time Entries Data Loss Investigation Report

**Date:** 2025-01-26  
**Project:** EP-Tracker (ngmqqtryojmyeixicekt)  
**Investigation Status:** Complete

## Executive Summary

**Critical Finding:** 131 time entries (59% of created entries) are missing from the database.

- **Total entries created:** 222 (tracked in `activity_log`)
- **Current entries in database:** 91
- **Missing entries:** 131
- **Data loss percentage:** 59%

## Detailed Findings

### Time Entry Distribution

**Current data by month (start_at):**
- November 2025: 60 entries
- October 2025: 30 entries  
- September 2025: 1 entry

**Earliest entry:** September 11, 2025  
**Latest entry:** November 23, 2025

### Missing Entries by Project

The missing entries are distributed across multiple projects:

| Project Name | Missing Entries | Date Range |
|-------------|----------------|------------|
| Luderkvart på taket | 31 | Oct 22 - Oct 30, 2025 |
| Testa Liggaren | 25 | Nov 4 - Nov 20, 2025 |
| Fast och Löpande | 20 | Nov 11 - Nov 20, 2025 |
| Testa Lägga till projekt | 14 | Nov 5 - Nov 7, 2025 |
| Testa Alerterna | 11 | Oct 28 - Nov 5, 2025 |
| Bygga om vardagsrum | 9 | Oct 26 - Nov 20, 2025 |
| Fetlada i Olberga | 7 | Oct 19 - Nov 20, 2025 |
| Saluhallen | 4 | Oct 27 - Nov 4, 2025 |
| (No project) | 4 | Oct 27 - Nov 18, 2025 |
| Dagbokstesten | 3 | Oct 30 - Nov 20, 2025 |
| Others | 3 | Various dates |

**Total:** 131 missing entries

### Root Cause Analysis

**Key Finding:** The projects still exist in the database, which rules out cascading deletes from project deletion.

**Possible causes:**
1. **Manual deletion by users** - Users may have deleted entries through the UI
2. **Bulk deletion operation** - A script or migration may have deleted entries
3. **Application bug** - A bug in the deletion logic may have caused unintended deletions
4. **Data cleanup operation** - An intentional cleanup may have removed entries

**Foreign Key Constraints:**
- `org_id` → `organizations(id)` ON DELETE CASCADE
- `project_id` → `projects(id)` ON DELETE CASCADE  
- `user_id` → `profiles(id)` ON DELETE CASCADE

Since projects still exist, cascading deletes from project deletion are ruled out.

### Data Recovery Options

#### Option 1: Reconstruct from Activity Log (Partial Recovery)

The `activity_log` table contains metadata about the deleted entries:

```sql
-- Example query to see recoverable data
SELECT 
  al.id as log_id,
  al.org_id,
  al.user_id,
  al.project_id,
  al.created_at as entry_created_at,
  al.data->>'duration_min' as duration_min,
  al.data->>'task_label' as task_label
FROM activity_log al
LEFT JOIN time_entries te ON 
  te.org_id = al.org_id 
  AND te.user_id = al.user_id 
  AND te.project_id = al.project_id
  AND ABS(EXTRACT(EPOCH FROM (te.created_at - al.created_at))) < 5
WHERE al.type = 'time_entry' 
  AND al.action = 'created'
  AND te.id IS NULL;
```

**Limitations:**
- Only has `duration_min` and `task_label` from the `data` JSONB field
- Missing `start_at` and `stop_at` timestamps
- Missing `notes`, `status`, and other fields
- Cannot fully reconstruct entries without timestamps

#### Option 2: Supabase Point-in-Time Recovery

If Supabase backups are enabled, you may be able to restore from a point-in-time backup:

1. **Check Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/database/backups
   - Check if point-in-time recovery (PITR) is enabled
   - Look for backups from before the data loss occurred

2. **Contact Supabase Support:**
   - If PITR is enabled, Supabase support can help restore to a specific timestamp
   - You'll need to identify when the data loss occurred

#### Option 3: Manual Reconstruction

If users have records of their time entries, they can manually re-enter the data.

## Recommendations

### Immediate Actions

1. **Check Supabase Backups:**
   ```bash
   # Check if backups are available
   # Go to: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/database/backups
   ```

2. **Identify When Data Loss Occurred:**
   - Review the activity_log to find the last known good state
   - Check application logs for any bulk delete operations
   - Review recent migrations that might have affected time_entries

3. **Enable Point-in-Time Recovery (if not already enabled):**
   - This is critical for future data protection
   - Go to: Project Settings → Database → Backups

### Prevention Measures

1. **Implement Soft Deletes:**
   - Add `deleted_at` timestamp column to `time_entries`
   - Modify DELETE operations to set `deleted_at` instead of hard deleting
   - Filter out soft-deleted entries in queries

2. **Add Audit Logging:**
   - Log all DELETE operations with user, timestamp, and reason
   - Store in a separate audit table

3. **Add Deletion Restrictions:**
   - Require admin approval for bulk deletions
   - Add a "deletion reason" field for tracking
   - Implement a retention policy instead of hard deletes

4. **Regular Backups:**
   - Ensure daily backups are enabled
   - Test restore procedures regularly
   - Document backup and restore procedures

5. **Add Data Validation:**
   - Add checks to prevent accidental bulk deletions
   - Require confirmation for deletions affecting > 10 entries
   - Add rate limiting on DELETE endpoints

### Code Changes Needed

1. **Soft Delete Implementation:**
   ```sql
   -- Migration to add soft delete
   ALTER TABLE time_entries 
   ADD COLUMN deleted_at TIMESTAMPTZ;
   
   CREATE INDEX idx_time_entries_deleted_at 
   ON time_entries(deleted_at) 
   WHERE deleted_at IS NULL;
   ```

2. **Update DELETE endpoint:**
   ```typescript
   // Instead of: .delete()
   // Use: .update({ deleted_at: new Date().toISOString() })
   ```

3. **Update queries to exclude soft-deleted:**
   ```typescript
   .is('deleted_at', null)
   ```

## Next Steps

1. ✅ **Investigation Complete** - Data loss confirmed and quantified
2. ⏳ **Check Supabase Backups** - Determine if recovery is possible
3. ⏳ **Implement Soft Deletes** - Prevent future data loss
4. ⏳ **Add Audit Logging** - Track all deletions
5. ⏳ **Review Deletion Permissions** - Ensure proper access controls

## SQL Queries for Further Investigation

### Count missing entries by project
```sql
SELECT DISTINCT
  al.project_id,
  p.name as project_name,
  COUNT(*) as missing_entries_count
FROM activity_log al
LEFT JOIN time_entries te ON 
  te.org_id = al.org_id 
  AND te.user_id = al.user_id 
  AND te.project_id = al.project_id
  AND ABS(EXTRACT(EPOCH FROM (te.created_at - al.created_at))) < 5
LEFT JOIN projects p ON p.id = al.project_id
WHERE al.type = 'time_entry' 
  AND al.action = 'created'
  AND te.id IS NULL
GROUP BY al.project_id, p.name
ORDER BY missing_entries_count DESC;
```

### Get summary statistics
```sql
SELECT 
  'Total time entries created (from activity_log)' as metric,
  COUNT(*)::text as value
FROM activity_log
WHERE type = 'time_entry' AND action = 'created'
UNION ALL
SELECT 
  'Current time entries in database' as metric,
  COUNT(*)::text as value
FROM time_entries
UNION ALL
SELECT 
  'Missing time entries (deleted)' as metric,
  (COUNT(*) - (SELECT COUNT(*) FROM time_entries))::text as value
FROM activity_log
WHERE type = 'time_entry' AND action = 'created';
```

## Contact

For questions about this investigation, refer to:
- Supabase Project: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt
- Database: PostgreSQL 17.6
- Project ID: ngmqqtryojmyeixicekt

