# Testing the Welcome Flow

## ✅ Changes Applied

1. **RLS Migration** - Applied `20241024000002_fix_membership_rls_v2.sql`
2. **Welcome Page** - Stays as dedicated page at `/welcome`
3. **Build Error** - Fixed duplicate config file issue
4. **Dev Server** - Running on http://localhost:3000

## 🧪 Test Plan

### Test 1: New User Signup Flow

**Steps:**
1. Open http://localhost:3000 in an **incognito/private window**
2. Click "Sign Up" or go to http://localhost:3000/sign-up
3. Create a new account with a test email
4. Verify your email (check Supabase Auth dashboard if needed)
5. Complete the organization setup form
6. **Expected:** You should be redirected to `/welcome` (not an error)
7. **Expected:** The welcome page should show role-based content
8. Click "Gå till Dashboard"
9. **Expected:** You should see the dashboard

**What to Look For:**
- ✅ No RLS policy errors
- ✅ Welcome page loads successfully
- ✅ Role-based content displays (admin, foreman, worker, or finance)
- ✅ Dashboard loads after clicking the button

### Test 2: Existing User Login Flow

**Steps:**
1. Open http://localhost:3000 in an **incognito/private window**
2. Click "Sign In" or go to http://localhost:3000/sign-in
3. Log in with an existing account
4. **Expected:** You should go directly to `/dashboard` (not `/welcome`)
5. **Expected:** No welcome message should appear

**What to Look For:**
- ✅ No RLS policy errors
- ✅ Direct redirect to dashboard
- ✅ No welcome page shown for returning users

### Test 3: Browser Console Check

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Sign up or log in
4. **Expected:** No red errors related to RLS or policies
5. **Expected:** No "user_orgs" circular dependency errors

**What to Look For:**
- ✅ No errors in console
- ✅ Clean navigation flow
- ✅ No infinite loops or hanging requests

### Test 4: Network Tab Check

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Sign up or log in
4. Look for requests to `/api/` or Supabase
5. **Expected:** All requests return 200 or expected status codes
6. **Expected:** No 403 Forbidden or RLS policy errors

**What to Look For:**
- ✅ Successful API requests
- ✅ No 403 errors
- ✅ Membership data loads correctly

## 🐛 Troubleshooting

### If you see "RLS policy error" or "403 Forbidden":

1. **Check policies are created:**
   - Go to Supabase Dashboard → Database → Policies
   - Find `memberships` table
   - Should have exactly 5 policies (see verification script)

2. **Check policy order:**
   - Run this SQL in Supabase:
     ```sql
     SELECT policyname, cmd 
     FROM pg_policies 
     WHERE tablename = 'memberships'
     ORDER BY policyname;
     ```
   - "Users can read own memberships" should exist

3. **Re-apply migration if needed:**
   - Go to Supabase SQL Editor
   - Copy from `supabase/migrations/20241024000002_fix_membership_rls_v2.sql`
   - Run it again

### If welcome page doesn't show:

1. **Check the timing logic:**
   - In `app/page.tsx`, we check if membership was created < 5 minutes ago
   - If your test account is older, you won't see the welcome page
   - Create a brand new account to test

2. **Check redirects:**
   - Look in browser DevTools → Network tab
   - Should see: `/` → `/welcome` → `/dashboard`
   - Not: `/` → `/complete-setup` (unless no membership)

### If build fails:

1. **Clear cache:**
   ```bash
   Remove-Item -Path .next -Recurse -Force
   npm run dev
   ```

2. **Check for duplicate configs:**
   - Should only have `next.config.mjs`
   - No `next.config.ts` or `next.config.js`

## 📊 Success Criteria

All tests should pass with:
- ✅ No RLS policy errors
- ✅ Welcome page shows for new users
- ✅ Dashboard shows for existing users
- ✅ Role-based content displays correctly
- ✅ No console errors
- ✅ Clean navigation flow

## 🎉 When Everything Works

You should see:
1. **New user flow:** Sign up → Complete setup → Welcome page → Dashboard
2. **Existing user flow:** Sign in → Dashboard
3. **Welcome page:** Beautiful page with role-based content and next steps
4. **No errors:** Clean console and network logs

## 📝 Next Steps After Testing

If everything works:
1. Commit the changes:
   ```bash
   git add .
   git commit -m "fix: resolve membership RLS circular dependency and welcome flow"
   ```

2. Clean up old migration files (optional):
   - `supabase/migrations/20241024000001_fix_membership_rls.sql`
   - `scripts/fix-membership-rls.ps1`

3. Update documentation if needed

4. Deploy to production when ready!




