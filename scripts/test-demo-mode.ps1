# Quick Test Script for Demo Mode
# This script helps verify demo mode is set up correctly

Write-Host "🧪 Testing Demo Mode Setup" -ForegroundColor Cyan
Write-Host ""

# Check environment variable
Write-Host "1. Checking ENABLE_DEMO environment variable..." -ForegroundColor Yellow
$envDemo = $env:ENABLE_DEMO
if ($envDemo -eq "true") {
    Write-Host "   ✅ ENABLE_DEMO is set to 'true'" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  ENABLE_DEMO is not set to 'true' (current: $envDemo)" -ForegroundColor Yellow
    Write-Host "   💡 Add ENABLE_DEMO=true to your .env.local file" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "2. Checking Supabase environment variables..." -ForegroundColor Yellow
$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if ($supabaseUrl) {
    Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_URL is set" -ForegroundColor Green
} else {
    Write-Host "   ❌ NEXT_PUBLIC_SUPABASE_URL is missing" -ForegroundColor Red
}

if ($supabaseKey) {
    Write-Host "   ✅ SUPABASE_SERVICE_ROLE_KEY is set" -ForegroundColor Green
} else {
    Write-Host "   ❌ SUPABASE_SERVICE_ROLE_KEY is missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Next steps:" -ForegroundColor Yellow
Write-Host "   a) Run migrations:" -ForegroundColor Cyan
Write-Host "      - supabase/migrations/20250205000001_add_slug_to_organizations.sql" -ForegroundColor Gray
Write-Host "      - supabase/migrations/20250205000002_create_demo_organization.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "   b) Seed demo data:" -ForegroundColor Cyan
Write-Host "      npx tsx scripts/seed-demo-data.ts" -ForegroundColor Gray
Write-Host ""
Write-Host "   c) Start dev server:" -ForegroundColor Cyan
Write-Host "      npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   d) Test demo route:" -ForegroundColor Cyan
Write-Host "      Open http://localhost:3000/demo in browser" -ForegroundColor Gray
Write-Host ""

