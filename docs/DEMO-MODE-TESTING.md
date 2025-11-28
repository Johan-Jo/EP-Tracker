# Demo Mode Testing Guide

This guide explains how to test the demo mode feature in EP-Tracker.

## Prerequisites

1. **Database Migrations**: Run the new migrations to add slug field and create demo organization
2. **Environment Variable**: Set `ENABLE_DEMO=true` in your `.env.local`
3. **Seed Demo Data**: Run the seed script to populate demo organization with sample data

## Step 1: Run Migrations

First, apply the new database migrations:

```bash
# Option 1: Apply via Supabase Dashboard
# Go to Supabase Dashboard > SQL Editor and run:
# - supabase/migrations/20250205000001_add_slug_to_organizations.sql
# - supabase/migrations/20250205000002_create_demo_organization.sql

# Option 2: If using Supabase CLI
supabase db push
```

## Step 2: Enable Demo Mode

Add to your `.env.local`:

```bash
ENABLE_DEMO=true
```

## Step 3: Seed Demo Data

Run the seed script to populate the demo organization:

```bash
npx tsx scripts/seed-demo-data.ts
```

Expected output:
```
🌱 Seeding demo data...
📦 Step 1: Getting demo organization...
✅ Found existing demo organization
   Org ID: [uuid]
...
✅ Demo data seeding completed successfully!
```

To reset and reseed:
```bash
npx tsx scripts/seed-demo-data.ts --reset
```

## Step 4: Test Public Demo Mode

### Test 1: Access Public Demo Route

1. **Open browser in incognito/private mode** (to ensure no auth session)
2. Navigate to: `http://localhost:3000/demo`
3. **Expected**: 
   - Should load without requiring sign-in
   - Demo banner appears at top: "Du använder nu demo-läge. All data är exempeldata."
   - Dashboard shows demo data (projects, time entries, etc.)
   - All write actions (buttons) should be disabled with tooltips

### Test 2: Verify Demo Data is Visible

Check that demo data appears:
- **Dashboard**: Should show stats from demo org
- **Projects**: Should see 8+ projects including "Renovering BRF Solgården", "Målning Stadshuset", etc.
- **Time**: Should see time entries from demo users
- **Diary**: Should see diary entries
- **Materials**: Should see material entries
- **ÄTA**: Should see ÄTA entries

### Test 3: Verify Write Actions are Blocked

Try to perform write actions (should be blocked):

1. **Time Entry**: Try to create a new time entry
   - Button should be disabled
   - Tooltip: "Den här åtgärden är avstängd i demo..."

2. **Material**: Try to add material
   - Button should be disabled
   - Tooltip appears

3. **Project**: Try to create project
   - Button should be disabled

4. **API Level**: Check browser console/network tab
   - POST requests should return 403 with error message

### Test 4: Signup CTA

1. Click "Redo att prova med dina egna projekt? Skapa konto gratis." button
2. **Expected**: Should navigate to `/sign-up`

## Step 5: Test Example Mode (Logged-In Users)

### Test 1: Enable Example Mode

1. **Sign in** with a real user account
2. Click user avatar in top-right
3. Click "Visa exempelbolag" in dropdown
4. **Expected**:
   - Demo banner appears: "Du visar exempeldata – inte ditt riktiga konto"
   - All data now shows demo organization data
   - Toggle changes to "Tillbaka till mitt konto"

### Test 2: Verify Data Switches

1. **Before toggle**: View your real projects/data
2. **After toggle**: Should see demo organization's data
3. **Projects page**: Should show demo projects, not your real ones
4. **Time page**: Should show demo time entries

### Test 3: Verify Write Actions Still Blocked

1. Try to create/edit/delete in example mode
2. **Expected**: Same blocking as public demo mode
3. API should return 403 errors

### Test 4: Disable Example Mode

1. Click "Tillbaka till mitt konto" in banner or user menu
2. **Expected**:
   - Demo banner disappears
   - Data switches back to your real organization
   - Your real projects/data visible again

## Step 6: Test Edge Cases

### Test 1: Demo Mode Disabled

1. Set `ENABLE_DEMO=false` in `.env.local`
2. Restart dev server
3. Try to access `/demo`
4. **Expected**: Should redirect to home page

### Test 2: No Demo Org

1. Delete demo organization from database
2. Try to access `/demo`
3. **Expected**: Should redirect to home page (or show error)

### Test 3: Example Mode Persistence

1. Enable example mode
2. Refresh page
3. **Expected**: Example mode should persist (via cookie/localStorage)

## Step 7: Verify API Blocking

Test API routes directly:

```bash
# Test time entries POST (should fail in demo mode)
curl -X POST http://localhost:3000/api/time/entries \
  -H "Content-Type: application/json" \
  -d '{"project_id":"...","start_at":"..."}'

# Expected: 403 Forbidden with error message
```

## Troubleshooting

### Issue: Demo route redirects to home

**Check:**
- `ENABLE_DEMO=true` is set in `.env.local`
- Restart dev server after changing env vars
- Demo organization exists in database

### Issue: No demo data visible

**Check:**
- Seed script ran successfully
- Demo organization has data (check Supabase dashboard)
- Correct org_id is being used in queries

### Issue: Write actions not blocked

**Check:**
- `DemoActionBlocker` is wrapping buttons/components
- API routes have `checkDemoMode()` calls
- Demo mode context is properly initialized

### Issue: Example mode not working

**Check:**
- Cookie is being set (`exampleModeEnabled=true`)
- `getSession()` is reading the cookie
- Dashboard layout is using demo org ID when cookie is set

## Manual Database Checks

Verify demo data exists:

```sql
-- Check demo organization
SELECT * FROM organizations WHERE slug = 'demo';

-- Check demo customers
SELECT COUNT(*) FROM customers WHERE org_id = (SELECT id FROM organizations WHERE slug = 'demo');

-- Check demo projects
SELECT COUNT(*) FROM projects WHERE org_id = (SELECT id FROM organizations WHERE slug = 'demo');

-- Check demo time entries
SELECT COUNT(*) FROM time_entries WHERE org_id = (SELECT id FROM organizations WHERE slug = 'demo');
```

## Next Steps

After testing, you may want to:
1. Add `DemoActionBlocker` to remaining UI components
2. Add demo mode blocking to remaining API routes
3. Add analytics events (if analytics is configured)
4. Polish UI/UX based on feedback

