#!/usr/bin/env pwsh
# Script to apply Supabase invite setup via CLI

Write-Host "🔧 Applying Supabase Invite Setup via CLI" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Supabase CLI is not installed" -ForegroundColor Red
    Write-Host "Install it with: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Stop Supabase if running
Write-Host "🛑 Stopping Supabase (if running)..." -ForegroundColor Yellow
supabase stop

Write-Host ""
Write-Host "🚀 Starting Supabase with new configuration..." -ForegroundColor Yellow
supabase start

Write-Host ""
Write-Host "✅ Configuration Applied!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary of Changes:" -ForegroundColor Cyan
Write-Host "  ✓ Email template: supabase/templates/invite.html" -ForegroundColor White
Write-Host "    - Uses {{ .ConfirmationURL }} for password setup" -ForegroundColor Gray
Write-Host ""
Write-Host "  ✓ Redirect URLs added:" -ForegroundColor White
Write-Host "    - http://localhost:3000/api/auth/callback" -ForegroundColor Gray
Write-Host "    - http://localhost:3000/welcome" -ForegroundColor Gray
Write-Host "    - http://127.0.0.1:3000/api/auth/callback" -ForegroundColor Gray
Write-Host "    - http://127.0.0.1:3000/welcome" -ForegroundColor Gray
Write-Host ""
Write-Host "📧 Testing the Invite Flow:" -ForegroundColor Cyan
Write-Host "  1. Go to: http://localhost:3000/dashboard/settings/users" -ForegroundColor White
Write-Host "  2. Click 'Invite User'" -ForegroundColor White
Write-Host "  3. Fill in the form and submit" -ForegroundColor White
Write-Host "  4. Check InBucket at: http://localhost:54324" -ForegroundColor White
Write-Host "  5. Click the link in the email" -ForegroundColor White
Write-Host "  6. You should see Supabase's 'Set Password' page" -ForegroundColor White
Write-Host "  7. After setting password, you'll be redirected to /welcome" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Expected Flow:" -ForegroundColor Cyan
Write-Host "  Admin invites → Email sent → User clicks link" -ForegroundColor White
Write-Host "  → Supabase 'Set Password' page → User sets password" -ForegroundColor White
Write-Host "  → Redirect to /welcome → Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "✨ Done! Your invite flow is configured." -ForegroundColor Green

