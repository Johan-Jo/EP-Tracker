# Fix circular RLS dependency for memberships

Write-Host "🔧 Fixing membership RLS policy..." -ForegroundColor Cyan

# Read the migration file
$sqlFile = Join-Path $PSScriptRoot ".." "supabase" "migrations" "20241024000001_fix_membership_rls.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Migration file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

$sql = Get-Content $sqlFile -Raw

# Check if .env.local exists
$envFile = Join-Path $PSScriptRoot ".." ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

# Load environment variables
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $value, [System.EnvironmentVariableTarget]::Process)
    }
}

$supabaseUrl = [System.Environment]::GetEnvironmentVariable('NEXT_PUBLIC_SUPABASE_URL')
$supabaseKey = [System.Environment]::GetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY')

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Missing Supabase environment variables" -ForegroundColor Red
    exit 1
}

# Extract database URL from Supabase URL
# Format: https://xxx.supabase.co -> postgres://postgres:[password]@db.xxx.supabase.co:5432/postgres
Write-Host "⚠️  You need to run this SQL manually in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://supabase.com/dashboard/project/_/sql" -ForegroundColor Cyan
Write-Host "2. Paste this SQL:" -ForegroundColor Cyan
Write-Host ""
Write-Host $sql -ForegroundColor White
Write-Host ""
Write-Host "3. Click 'Run'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or use Supabase CLI:" -ForegroundColor Yellow
Write-Host "  npx supabase db push" -ForegroundColor White








