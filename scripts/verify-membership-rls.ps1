# Verify the membership RLS policies are correctly set up

Write-Host "Checking Membership RLS Policies..." -ForegroundColor Cyan
Write-Host ""

Write-Host "To verify in Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "1. Go to: https://supabase.com/dashboard/project/_/database/policies" -ForegroundColor White
Write-Host "2. Find 'memberships' table" -ForegroundColor White
Write-Host "3. You should see these 5 policies:" -ForegroundColor White
Write-Host ""

Write-Host "Expected Policies:" -ForegroundColor Green
Write-Host "  1. 'Users can read own memberships' - SELECT" -ForegroundColor White
Write-Host "     USING: user_id = auth.uid()" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  2. 'Users can read org memberships' - SELECT" -ForegroundColor White
Write-Host "     USING: org_id IN (SELECT user_orgs()) AND user_id != auth.uid()" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  3. 'Admins can insert memberships' - INSERT" -ForegroundColor White
Write-Host "     WITH CHECK: is_org_admin(org_id)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  4. 'Admins can update memberships' - UPDATE" -ForegroundColor White
Write-Host "     USING: is_org_admin(org_id)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  5. 'Admins can delete memberships' - DELETE" -ForegroundColor White
Write-Host "     USING: is_org_admin(org_id)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Alternatively, run this SQL query:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host "SELECT policyname, cmd, qual" -ForegroundColor White
Write-Host "FROM pg_policies" -ForegroundColor White
Write-Host "WHERE tablename = 'memberships'" -ForegroundColor White
Write-Host "ORDER BY cmd, policyname;" -ForegroundColor White
Write-Host "========================================" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Key Fix:" -ForegroundColor Cyan
Write-Host "The 'Users can read own memberships' policy MUST come first and use ONLY" -ForegroundColor White
Write-Host "'user_id = auth.uid()' without calling user_orgs(). This breaks the circular" -ForegroundColor White
Write-Host "dependency and allows users to read their own membership data." -ForegroundColor White
Write-Host ""

Write-Host "Ready to test!" -ForegroundColor Green




