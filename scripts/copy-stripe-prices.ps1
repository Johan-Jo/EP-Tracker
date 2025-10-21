# Copy Stripe Price IDs SQL to clipboard
Get-Content "scripts\update-stripe-prices.sql" -Raw | Set-Clipboard
Write-Host "✅ SQL copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open Supabase SQL Editor"
Write-Host "2. Paste the SQL (Ctrl+V)"
Write-Host "3. Run the query"
Write-Host "4. Verify all 4 plans have stripe_price_id set"
Write-Host ""

