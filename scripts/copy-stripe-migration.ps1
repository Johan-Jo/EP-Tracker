# PowerShell script to copy Stripe migration to clipboard
# Run this, then paste into Supabase SQL Editor

$migrationPath = "supabase\migrations\20241021000003_add_stripe_columns.sql"
$content = Get-Content $migrationPath -Raw

Set-Clipboard -Value $content

Write-Host "✅ Stripe migration copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open Supabase SQL Editor" -ForegroundColor Yellow
Write-Host "2. Paste (Ctrl+V) the migration" -ForegroundColor Yellow
Write-Host "3. Run the migration" -ForegroundColor Yellow
Write-Host ""
Write-Host "The migration will add:" -ForegroundColor White
Write-Host "  - stripe_customer_id to organizations" -ForegroundColor Gray
Write-Host "  - stripe_subscription_id, stripe_price_id to subscriptions" -ForegroundColor Gray
Write-Host "  - stripe_payment_intent_id to payment_transactions" -ForegroundColor Gray
Write-Host "  - stripe_price_id to pricing_plans" -ForegroundColor Gray
Write-Host "  - stripe_webhook_events table (for event logging)" -ForegroundColor Gray

