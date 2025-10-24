# Fix: Workers See All Projects Instead of Assigned Projects

## Problem
Workers can see **all** projects in the organization, not just the ones they're assigned to.

## Root Cause
The migration `20241024000003_add_project_members.sql` has **not been applied** to your production database.

This migration:
- Creates the `project_members` table
- Updates RLS policies to enforce project-level access
- Ensures workers only see projects they're assigned to

## Solution

### Step 1: Verify the Issue

Run this in Supabase SQL Editor:

```sql
-- Check if project_members table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'project_members';

-- Check active RLS policy
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'projects' 
AND policyname LIKE '%read%';
```

**Expected Results:**
- `project_members` table should exist
- Policy should be named "Users can read accessible projects"

**If you see:**
- No `project_members` table → Migration not applied
- Policy named "Users can read org projects" → Old policy still active

---

### Step 2: Apply the Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the migration file: `supabase/migrations/20241024000003_add_project_members.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

**This will:**
- ✅ Create `project_members` table
- ✅ Create `can_access_project()` function
- ✅ Create `is_project_member()` function  
- ✅ Update all RLS policies
- ✅ **Automatically assign all existing workers to all projects** (backward compatibility)

---

### Step 3: Assign Workers to Projects

After the migration, **all existing workers will initially have access to all projects** (for backward compatibility).

You need to:

#### Option A: Use the UI (Recommended)

1. **Log in as Admin or Foreman**
2. Go to **Projekt** page
3. Click **Öppna** on a project
4. Go to **Team** tab
5. Click **Hantera team** button
6. You'll see all current members
7. **Remove workers** who shouldn't have access (click X button)
8. **Add workers** who should have access (select from dropdown, click + Lägg till)

Repeat for each project.

#### Option B: Use SQL

```sql
-- Remove a worker from a project
DELETE FROM project_members
WHERE project_id = 'PROJECT_ID_HERE'
AND user_id = 'USER_ID_HERE';

-- Add a worker to a project
INSERT INTO project_members (project_id, user_id, assigned_by)
VALUES (
    'PROJECT_ID_HERE',
    'USER_ID_HERE',
    (SELECT user_id FROM memberships WHERE role = 'admin' LIMIT 1)
);
```

---

### Step 4: Verify the Fix

1. Have the worker **log out** and **log back in**
2. Go to **Projekt** page
3. They should **only** see projects they're assigned to

---

## Understanding the Access Model

### Before Migration (OLD - INSECURE):
- ❌ All users see all projects in their organization
- ❌ No project-level access control
- ❌ Workers can see sensitive project data

### After Migration (NEW - SECURE):
- ✅ **Workers** only see projects they're assigned to
- ✅ **Foremen** see all projects (managers need full visibility)
- ✅ **Admins** see all projects
- ✅ Project-level access control enforced by RLS

---

## RLS Policy Explanation

The new policy uses this function:

```sql
CREATE OR REPLACE FUNCTION can_access_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_org_id UUID;
BEGIN
    -- Get project's organization
    SELECT org_id INTO project_org_id
    FROM projects
    WHERE id = project_uuid;
    
    -- Admin and foreman can access all projects in their org
    IF is_foreman_or_admin(project_org_id) THEN
        RETURN TRUE;
    END IF;
    
    -- Workers can only access projects they're assigned to
    RETURN is_project_member(project_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

This ensures:
- Queries like `SELECT * FROM projects WHERE org_id = 'X'` are automatically filtered
- Workers only get projects from `project_members` table
- Foremen/Admins get all projects (bypass `project_members` check)

---

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution:** Some parts already applied. Run individual sections manually.

### Issue: Workers still see all projects after migration
**Solution:** 
1. Check if worker role is correct: `SELECT role FROM memberships WHERE user_id = 'USER_ID'`
2. Clear browser cache and log out/in
3. Verify migration ran: `SELECT * FROM project_members LIMIT 5`

### Issue: UI doesn't show "Hantera team" button
**Solution:** You must be logged in as **admin** or **foreman** to see this button. Workers cannot manage team members.

---

## Scripts Available

- `scripts/diagnose-project-access.sql` - Diagnostic queries
- `scripts/add-worker-to-project.sql` - Add worker to specific project
- `scripts/fix-project-access.ps1` - PowerShell guide script

---

## Security Note

This is a **critical security fix**. Without project-level access control:
- Workers can see confidential project data
- No data isolation between projects
- Cannot use the system for multiple clients/projects safely

**Always apply this migration** before going to production with multiple projects.

