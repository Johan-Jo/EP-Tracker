# Data Loss Recovery & Prevention Action Plan

**Date:** 2025-01-26  
**Project:** EP-Tracker (ngmqqtryojmyeixicekt)  
**Status:** Investigation Complete, Recovery Plan Ready

## Executive Summary

✅ **Investigation Complete**  
✅ **Soft Delete Migration Created**  
✅ **Recovery Options Identified**  
⏳ **Backup Status Check Required**  
⏳ **Code Updates Required**

---

## 1. Data Loss Timeline Analysis

### When Did Data Loss Occur?

**Earliest Missing Entry:** October 19, 2025, 00:51:27 UTC  
**Latest Missing Entry:** November 20, 2025, 18:53:50 UTC  
**Total Missing:** 131 entries (59% of created entries)

### Deletion Pattern

The data loss occurred **gradually over time**, not in a single event:

| Date | Missing Entries | Affected Projects |
|------|----------------|-------------------|
| Nov 20, 2025 | 15 | 7 projects |
| Nov 11, 2025 | 12 | 3 projects |
| Nov 5, 2025 | 15 | 3 projects |
| Oct 25, 2025 | 20 | 1 project (Luderkvart på taket) |
| Oct 22, 2025 | 9 | 1 project (Luderkvart på taket) |
| Oct 19, 2025 | 6 | 1 project (Fetlada i Olberga) |

**Key Finding:** The deletions appear to be **user-initiated** rather than a system bug, as they occurred gradually across different dates and projects.

---

## 2. Supabase Backup Status

### How to Check Backups

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/database/backups
   ```

2. **Check Available Backups:**
   - **Daily Backups:** Available for last 7 days (Pro Plan)
   - **Point-in-Time Recovery (PITR):** If enabled, can restore to any point in time

3. **Backup Types:**
   - **Logical Backups:** Can be downloaded (if database < 15GB)
   - **Physical Backups:** Cannot be downloaded but can be restored via dashboard

### Recovery Options

#### Option A: Daily Backup Restoration
- **Available if:** Daily backups exist from before data loss
- **RPO:** Up to 24 hours of data loss
- **Process:** 
  1. Go to Dashboard → Database → Backups → Scheduled
  2. Select backup from before October 19, 2025
  3. Click "Restore"
  4. ⚠️ **Warning:** This will restore entire database to that point

#### Option B: Point-in-Time Recovery (PITR)
- **Available if:** PITR add-on is enabled
- **RPO:** Up to 2 minutes of data loss
- **Process:**
  1. Go to Dashboard → Database → Backups → Point in Time
  2. Select date/time before first deletion (Oct 19, 2025)
  3. Click "Start a restore"
  4. ⚠️ **Warning:** This will restore entire database to that point

#### Option C: Partial Recovery from Activity Log
- **Available:** Immediately (no backup needed)
- **Limitations:** Only has metadata (duration, task_label), not full timestamps
- **Process:** See SQL queries in section 4

### ⚠️ Important Notes

1. **Full Database Restore:** Both backup options restore the **entire database**, not just time entries
2. **Downtime Required:** Database will be inaccessible during restoration
3. **Data After Restore Point:** All data created after the restore point will be lost
4. **Contact Support:** If PITR is not enabled, contact Supabase support to check if recovery is possible

---

## 3. Soft Delete Implementation

### Migration Created

✅ **File:** `supabase/migrations/20250126000001_add_soft_delete_to_time_entries.sql`

**What it does:**
- Adds `deleted_at` column to `time_entries` table
- Creates indexes for efficient queries
- Adds helper functions: `soft_delete_time_entry()` and `restore_time_entry()`
- Creates view: `time_entries_active` for easy querying

### Apply Migration

```bash
# Option 1: Using Supabase CLI
cd supabase
supabase db push

# Option 2: Manual via Dashboard
# Go to: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/sql/new
# Copy/paste entire content of: supabase/migrations/20250126000001_add_soft_delete_to_time_entries.sql
# Click "Run"
```

### Code Updates Required

#### ✅ Completed
- [x] DELETE endpoint updated to use soft delete

#### ⏳ Still Needed
- [ ] Update all queries to exclude soft-deleted entries
- [ ] Update frontend components to filter deleted entries
- [ ] Add restore functionality for admins
- [ ] Add audit logging for deletions

### Query Updates Needed

**Before (hard delete):**
```typescript
const { data } = await supabase
  .from('time_entries')
  .select('*')
  .eq('org_id', orgId);
```

**After (soft delete):**
```typescript
const { data } = await supabase
  .from('time_entries')
  .select('*')
  .eq('org_id', orgId)
  .is('deleted_at', null); // Exclude soft-deleted entries

// OR use the view:
const { data } = await supabase
  .from('time_entries_active')
  .select('*')
  .eq('org_id', orgId);
```

---

## 4. Partial Recovery from Activity Log

### What Data Can Be Recovered?

The `activity_log` table contains metadata about deleted entries:
- ✅ `duration_min` (work duration)
- ✅ `task_label` (task description)
- ✅ `project_id` (which project)
- ✅ `user_id` (who created it)
- ✅ `created_at` (when it was created)
- ❌ `start_at` / `stop_at` (timestamps - NOT available)
- ❌ `notes` (NOT available)

### Recovery SQL Query

```sql
-- Get all recoverable metadata for missing time entries
SELECT 
  al.org_id,
  al.user_id,
  al.project_id,
  al.created_at as entry_created_at,
  al.data->>'duration_min' as duration_min,
  al.data->>'task_label' as task_label,
  p.name as project_name,
  pr.full_name as user_name
FROM activity_log al
LEFT JOIN time_entries te ON 
  te.org_id = al.org_id 
  AND te.user_id = al.user_id 
  AND te.project_id = al.project_id
  AND ABS(EXTRACT(EPOCH FROM (te.created_at - al.created_at))) < 5
LEFT JOIN projects p ON p.id = al.project_id
LEFT JOIN profiles pr ON pr.id = al.user_id
WHERE al.type = 'time_entry' 
  AND al.action = 'created'
  AND te.id IS NULL
ORDER BY al.created_at DESC;
```

### Limitations

⚠️ **Cannot fully reconstruct entries** because:
- Missing `start_at` and `stop_at` timestamps
- Missing `notes` field
- Missing `status` (draft/submitted/approved)
- Missing `phase_id`, `work_order_id`, etc.

**Use Case:** This data can help identify what was lost and assist users in manually re-entering critical entries.

---

## 5. Prevention Measures

### Immediate Actions

1. ✅ **Soft Delete Migration** - Created and ready to apply
2. ⏳ **Apply Migration** - Run the migration to enable soft deletes
3. ⏳ **Update Code** - Update all queries to exclude soft-deleted entries
4. ⏳ **Check Backups** - Verify backup status in Supabase dashboard

### Long-term Improvements

1. **Audit Logging**
   - Log all DELETE operations with user, timestamp, and reason
   - Store in separate audit table

2. **Deletion Restrictions**
   - Require admin approval for bulk deletions
   - Add "deletion reason" field
   - Implement retention policy instead of hard deletes

3. **Backup Strategy**
   - Enable PITR if not already enabled
   - Test restore procedures regularly
   - Document backup and restore procedures

4. **Data Validation**
   - Add checks to prevent accidental bulk deletions
   - Require confirmation for deletions affecting > 10 entries
   - Add rate limiting on DELETE endpoints

---

## 6. Action Items Checklist

### Immediate (Today)
- [ ] Check Supabase backup status
  - [ ] Go to: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/database/backups
  - [ ] Check if daily backups exist from before Oct 19, 2025
  - [ ] Check if PITR is enabled
- [ ] Apply soft delete migration
  - [ ] Run: `supabase db push` or apply via dashboard
- [ ] Test soft delete functionality
  - [ ] Delete a test entry
  - [ ] Verify it's soft-deleted (deleted_at is set)
  - [ ] Verify it doesn't appear in normal queries

### Short-term (This Week)
- [ ] Update all time entry queries to exclude soft-deleted entries
  - [ ] Search codebase for `from('time_entries')`
  - [ ] Add `.is('deleted_at', null)` to all queries
- [ ] Add restore functionality for admins
  - [ ] Create admin endpoint to restore soft-deleted entries
  - [ ] Add UI for admins to view/restore deleted entries
- [ ] Add audit logging for deletions
  - [ ] Log user, timestamp, reason for each deletion

### Long-term (This Month)
- [ ] Enable PITR if not already enabled
- [ ] Document backup and restore procedures
- [ ] Add deletion confirmation dialogs
- [ ] Implement retention policy
- [ ] Add monitoring/alerts for unusual deletion patterns

---

## 7. Recovery Decision Tree

```
Is PITR enabled?
├─ YES → Can restore to any point before Oct 19, 2025
│         ⚠️ Will lose all data after restore point
│         ✅ Best option if data after Oct 19 is not critical
│
└─ NO → Check daily backups
        ├─ Backup exists from before Oct 19?
        │  ├─ YES → Can restore to that backup
        │  │         ⚠️ Will lose all data after backup date
        │  │         ✅ Good option if backup is recent
        │  │
        │  └─ NO → Partial recovery from activity_log only
        │           ⚠️ Cannot fully reconstruct entries
        │           ✅ Can help identify what was lost
        │           ✅ Users can manually re-enter critical entries
        │
        └─ Contact Supabase Support
           → They may have additional recovery options
```

---

## 8. SQL Queries for Investigation

### Check Backup Availability
```sql
-- This query cannot directly check backups, but you can:
-- 1. Go to Dashboard → Database → Backups
-- 2. Check available backups and their dates
```

### Count Missing Entries by Project
```sql
SELECT DISTINCT
  al.project_id,
  p.name as project_name,
  COUNT(*) as missing_entries_count,
  MIN(al.created_at) as earliest_missing,
  MAX(al.created_at) as latest_missing
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

### Get Recoverable Metadata
```sql
SELECT 
  al.org_id,
  al.user_id,
  al.project_id,
  al.created_at as entry_created_at,
  al.data->>'duration_min' as duration_min,
  al.data->>'task_label' as task_label,
  p.name as project_name,
  pr.full_name as user_name
FROM activity_log al
LEFT JOIN time_entries te ON 
  te.org_id = al.org_id 
  AND te.user_id = al.user_id 
  AND te.project_id = al.project_id
  AND ABS(EXTRACT(EPOCH FROM (te.created_at - al.created_at))) < 5
LEFT JOIN projects p ON p.id = al.project_id
LEFT JOIN profiles pr ON pr.id = al.user_id
WHERE al.type = 'time_entry' 
  AND al.action = 'created'
  AND te.id IS NULL
ORDER BY al.created_at DESC;
```

---

## 9. Contact & Support

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt
- **Backup Settings:** https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/database/backups
- **Support:** https://supabase.com/dashboard/support/new

---

## 10. Files Created/Modified

### Created
- ✅ `docs/DATA-LOSS-INVESTIGATION-REPORT.md` - Full investigation report
- ✅ `docs/DATA-LOSS-RECOVERY-ACTION-PLAN.md` - This file
- ✅ `supabase/migrations/20250126000001_add_soft_delete_to_time_entries.sql` - Soft delete migration

### Modified
- ✅ `app/api/time/entries/[id]/route.ts` - Updated DELETE endpoint to use soft delete

### Still Needed
- ⏳ Update all queries in codebase to exclude soft-deleted entries
- ⏳ Add restore functionality
- ⏳ Add audit logging

---

**Next Step:** Check Supabase backup status and decide on recovery approach.

