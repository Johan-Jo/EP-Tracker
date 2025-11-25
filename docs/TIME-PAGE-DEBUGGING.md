# Time Page Debugging Guide

## Issue: Time entries not showing on /dashboard/time

### Changes Made

1. **Fixed query structure** - Moved `.order()` and `.limit()` to be applied AFTER all filters
2. **Fixed date filter** - Improved end date calculation to include entries from the end date
3. **Added error logging** - Better error messages to help debug issues
4. **Removed soft delete filter** - Temporarily removed until migration is applied

### How to Debug

1. **Check browser console** for any errors
2. **Check network tab** - Look at the `/api/time/entries` request:
   - What's the response status?
   - What's in the response body?
   - Are there any errors?

3. **Check server logs** - Look for:
   - `[TIME ENTRIES API] Found X entries...` log message
   - Any error messages with query details

4. **Test the API directly:**
   ```
   GET /api/time/entries
   ```

### Common Issues

1. **RLS Policies** - User might not have access to entries
2. **Date Filter** - Entries might be outside the 3-month default range
3. **Organization Mismatch** - User's org_id might not match entry org_id
4. **Role Filter** - Worker role only sees own entries

### Quick Test Query

Run this in Supabase SQL editor to test:

```sql
-- Replace with actual user_id and org_id
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE start_at >= CURRENT_DATE - INTERVAL '3 months') as in_range
FROM time_entries
WHERE org_id = 'YOUR_ORG_ID'
  AND (user_id = 'YOUR_USER_ID' OR EXISTS (
    SELECT 1 FROM memberships 
    WHERE org_id = time_entries.org_id 
    AND user_id = 'YOUR_USER_ID'
    AND role IN ('admin', 'foreman', 'finance')
  ));
```

### Next Steps

1. Check browser console for errors
2. Check network tab for API response
3. Check server logs for detailed error messages
4. Test API endpoint directly

