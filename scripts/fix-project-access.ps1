# Fix project access for workers
# This script guides you through diagnosing and fixing project visibility

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Fix Worker Project Access" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PROBLEM: Worker sees ALL projects instead of only assigned projects" -ForegroundColor Yellow
Write-Host ""

Write-Host "This can happen for two reasons:" -ForegroundColor White
Write-Host "  1. The project_members table doesn't exist (migration not run)" -ForegroundColor Gray
Write-Host "  2. The worker hasn't been added to specific projects" -ForegroundColor Gray
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SOLUTION A: Use the UI (RECOMMENDED)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Log in as ADMIN or FOREMAN" -ForegroundColor Green
Write-Host "2. Go to 'Projekt' page" -ForegroundColor White
Write-Host "3. Click 'Öppna' on a project" -ForegroundColor White
Write-Host "4. Go to 'Team' tab" -ForegroundColor White
Write-Host "5. Click 'Hantera team'" -ForegroundColor White
Write-Host "6. Select worker from dropdown" -ForegroundColor White
Write-Host "7. Click '+ Lägg till'" -ForegroundColor White
Write-Host ""

Write-Host "Repeat for each project the worker should access." -ForegroundColor Yellow
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SOLUTION B: Use SQL (If UI doesn't work)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "If the UI doesn't show the Team tab or Hantera team button:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. The migration might not have been run" -ForegroundColor White
Write-Host "2. Go to Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "3. Run the diagnostic script to check" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Do you want to (A) copy diagnostic SQL or (B) exit? [A/B]"

if ($choice -eq "A" -or $choice -eq "a") {
    Write-Host ""
    Write-Host "Copying diagnostic SQL to clipboard..." -ForegroundColor Green
    Get-Content "scripts\diagnose-project-access.sql" | Set-Clipboard
    Write-Host "✓ SQL copied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now:" -ForegroundColor Yellow
    Write-Host "  1. Go to Supabase Dashboard → SQL Editor" -ForegroundColor White
    Write-Host "  2. Paste and run the SQL" -ForegroundColor White
    Write-Host "  3. Follow the instructions in the output" -ForegroundColor White
    Write-Host ""
    
    $openBrowser = Read-Host "Open Supabase dashboard? [Y/N]"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://supabase.com/dashboard"
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  After Fixing" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Have the worker:" -ForegroundColor Yellow
Write-Host "  1. Log out" -ForegroundColor White
Write-Host "  2. Log back in" -ForegroundColor White
Write-Host "  3. Go to 'Projekt' page" -ForegroundColor White
Write-Host "  4. Should ONLY see projects they're assigned to" -ForegroundColor White
Write-Host ""

Write-Host "Done! Press any key to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

