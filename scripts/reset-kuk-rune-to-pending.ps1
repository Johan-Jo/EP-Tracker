#!/usr/bin/env pwsh
# Reset Kuk-Rune to pending status for testing resend invitation

Write-Host "🔄 Resetting Kuk-Rune to pending status..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if Supabase is running
$status = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Supabase is not running" -ForegroundColor Red
    Write-Host "Start it with: supabase start" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase is running" -ForegroundColor Green
Write-Host ""

# Run the SQL script
Write-Host "📝 Executing SQL script to reset user..." -ForegroundColor Yellow

$sqlScript = @"
-- Reset Kuk-Rune's confirmation status
DO `$`$
DECLARE
    target_email TEXT := 'j@johan.com.br';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found', target_email;
    ELSE
        RAISE NOTICE 'Found user: % with ID: %', target_email, target_user_id;
        
        UPDATE auth.users
        SET 
            email_confirmed_at = NULL,
            confirmed_at = NULL,
            updated_at = now()
        WHERE id = target_user_id;
        
        RAISE NOTICE '✅ User reset to pending status';
    END IF;
END `$`$;
"@

# Save to temp file and execute
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlScript | Out-File -FilePath $tempFile -Encoding UTF8

try {
    supabase db execute --file $tempFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SUCCESS!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 What happened:" -ForegroundColor Cyan
        Write-Host "  • Kuk-Rune (j@johan.com.br) is now PENDING" -ForegroundColor White
        Write-Host "  • Email confirmation timestamps cleared" -ForegroundColor White
        Write-Host ""
        Write-Host "🧪 Test the feature:" -ForegroundColor Cyan
        Write-Host "  1. Refresh the users page: http://localhost:3000/dashboard/settings/users" -ForegroundColor White
        Write-Host "  2. Kuk-Rune should now show yellow badge: '⏰ Väntar på registrering'" -ForegroundColor White
        Write-Host "  3. Click 'Skicka ny inbjudan' button next to Kuk-Rune" -ForegroundColor White
        Write-Host "  4. Check email at: http://localhost:54324" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Tip: To reset back to active, have Kuk-Rune click the invite link and set a password" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "❌ Failed to execute SQL" -ForegroundColor Red
    }
} finally {
    Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
}

