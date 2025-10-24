# Membership RLS Fix Instructions

## 📋 Summary

We've fixed the circular dependency issue with the membership RLS policies. The welcome page now stays as a dedicated page (not moved to the dashboard as originally attempted).

## 🔍 The Problem

**Circular Dependency:**
- `user_orgs()` function queries the `memberships` table
- The RLS policy on `memberships` uses `user_orgs()` function  
- Result: `memberships → user_orgs() → memberships → user_orgs() → ...`

This caused queries to the memberships table to fail, breaking the welcome page and onboarding flow.

## ✅ The Solution

**New Migration: `20241024000002_fix_membership_rls_v2.sql`**

This migration:
1. **Drops ALL existing membership policies** (clean slate, no conflicts)
2. **Creates "read own" policy FIRST** - allows `user_id = auth.uid()` without `user_orgs()`
3. **Creates "read org" policy** - for reading OTHER users' memberships (admin features)
4. **Recreates admin policies** - for insert/update/delete operations

## 🚀 How to Apply

### Option 1: Supabase CLI (Recommended)

```bash
cd "c:\Users\johan\Cursor Portfolio\EP-Tracker"
npx supabase db push
```

### Option 2: Manual Application

1. Go to: https://supabase.com/dashboard/project/_/sql/new
2. Copy the SQL from: `supabase/migrations/20241024000002_fix_membership_rls_v2.sql`
3. Paste it into the SQL editor
4. Click "Run"

## 📝 What Was Changed

### Code Changes (Completed):
- ✅ Reverted `app/page.tsx` - now redirects to `/welcome` for new users
- ✅ Reverted `app/(auth)/welcome/page.tsx` - removed debug logging
- ✅ Reverted `app/dashboard/dashboard-client.tsx` - removed welcome modal

### Database Changes (Needs Application):
- ⏳ **Migration needs to be applied:** `20241024000002_fix_membership_rls_v2.sql`

## 🧪 How to Test

After applying the migration:

1. Sign up as a new user
2. Complete organization setup
3. You should be redirected to the welcome page (not get an RLS error)
4. The welcome page should show role-based content
5. Click "Gå till Dashboard" should work

## 📂 Files Created/Modified

**New Files:**
- `supabase/migrations/20241024000002_fix_membership_rls_v2.sql` - The fix migration
- `scripts/apply-membership-rls-fix.ps1` - Helper script to show SQL and instructions
- `MEMBERSHIP-RLS-FIX-INSTRUCTIONS.md` - This file

**Modified Files:**
- `app/page.tsx` - Reverted to redirect to `/welcome`
- `app/(auth)/welcome/page.tsx` - Cleaned up debug logging
- `app/dashboard/dashboard-client.tsx` - Reverted (no welcome modal)

**Kept (from previous attempt):**
- `supabase/migrations/20241024000001_fix_membership_rls.sql` - First attempt (incomplete)
- `scripts/fix-membership-rls.ps1` - First attempt helper script

## 🎯 Next Steps

1. **Apply the migration** using one of the methods above
2. **Test the flow** by creating a new user or logging in
3. **Verify** that the welcome page loads correctly
4. **Clean up** old migration files if the new one works:
   - Delete `20241024000001_fix_membership_rls.sql` 
   - Delete `scripts/fix-membership-rls.ps1`

## 💡 Why This Works

The key insight is that **policy order matters** in PostgreSQL RLS:

1. When a user queries their own membership, the first policy (`user_id = auth.uid()`) matches and grants access **without** calling `user_orgs()`
2. When querying other users' memberships (admin features), the second policy uses `user_orgs()`, which can now successfully query memberships because of policy #1
3. This breaks the circular dependency!

## ❓ Troubleshooting

If it still doesn't work after applying the migration:

1. **Check if policies were created:**
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'memberships';
   ```
   You should see exactly 5 policies.

2. **Check if old policy still exists:**
   If you see more than 5 policies, there might be duplicates. Run:
   ```sql
   DROP POLICY IF EXISTS "Users can read org memberships" ON memberships;
   ```
   Then re-apply the migration.

3. **Test the query directly:**
   ```sql
   SELECT role FROM memberships WHERE user_id = auth.uid() AND is_active = true;
   ```
   This should return your role without errors.




