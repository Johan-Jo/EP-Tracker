#!/usr/bin/env pwsh
# =====================================================
# Fortnox Integration Verification Script
# =====================================================
# This script verifies that Fortnox integration files
# and database migrations are in place.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fortnox Integration - Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project root. Run from EP-Tracker directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project root confirmed" -ForegroundColor Green
Write-Host ""

# 1. Check migration files
Write-Host "1. Checking migration files..." -ForegroundColor Yellow
$migrations = @(
    "supabase\migrations\20251117000001_fortnox_connections.sql",
    "supabase\migrations\20251117000002_fortnox_invoice_links.sql"
)

foreach ($migration in $migrations) {
    if (Test-Path $migration) {
        Write-Host "   ✅ $migration exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $migration NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
}

# 2. Check library files
Write-Host ""
Write-Host "2. Checking library files..." -ForegroundColor Yellow
$libraryFiles = @(
    "lib\integrations\fortnox\client.ts",
    "lib\integrations\fortnox\export-invoice.ts"
)

foreach ($file in $libraryFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file exists" -ForegroundColor Green
        
        # Check for key functions
        $content = Get-Content $file -Raw
        if ($file -like "*client.ts") {
            if ($content -match "getFortnoxConnectionForOrg") {
                Write-Host "      ✅ getFortnoxConnectionForOrg function found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  getFortnoxConnectionForOrg function not found" -ForegroundColor Yellow
            }
            if ($content -match "refreshAccessTokenIfNeeded") {
                Write-Host "      ✅ refreshAccessTokenIfNeeded function found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  refreshAccessTokenIfNeeded function not found" -ForegroundColor Yellow
            }
            if ($content -match "createFortnoxInvoice") {
                Write-Host "      ✅ createFortnoxInvoice function found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  createFortnoxInvoice function not found" -ForegroundColor Yellow
            }
        }
        if ($file -like "*export-invoice.ts") {
            if ($content -match "buildFortnoxInvoicePayloadFromInvoiceBasis") {
                Write-Host "      ✅ buildFortnoxInvoicePayloadFromInvoiceBasis function found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  buildFortnoxInvoicePayloadFromInvoiceBasis function not found" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ❌ $file NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
}

# 3. Check API routes
Write-Host ""
Write-Host "3. Checking API routes..." -ForegroundColor Yellow
$apiRoutes = @(
    "app\api\integrations\fortnox\export-invoice\route.ts",
    "app\api\integrations\fortnox\invoice-links\route.ts"
)

foreach ($route in $apiRoutes) {
    if (Test-Path $route) {
        Write-Host "   ✅ $route exists" -ForegroundColor Green
        
        $content = Get-Content $route -Raw
        
        # Check for permission checks
        if ($route -like "*export-invoice*") {
            if ($content -match "admin.*finance|finance.*admin") {
                Write-Host "      ✅ Admin + finance permission check found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  Permission check may be missing" -ForegroundColor Yellow
            }
            if ($content -match "export async function POST") {
                Write-Host "      ✅ POST handler found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  POST handler not found" -ForegroundColor Yellow
            }
        }
        if ($route -like "*invoice-links*") {
            if ($content -match "admin.*finance.*foreman|foreman.*finance.*admin") {
                Write-Host "      ✅ Admin + finance + foreman permission check found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  Permission check may be missing" -ForegroundColor Yellow
            }
            if ($content -match "export async function GET") {
                Write-Host "      ✅ GET handler found" -ForegroundColor Green
            } else {
                Write-Host "      ⚠️  GET handler not found" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ❌ $route NOT FOUND" -ForegroundColor Red
        $allPassed = $false
    }
}

# 4. Check UI component updates
Write-Host ""
Write-Host "4. Checking UI component..." -ForegroundColor Yellow
$uiFile = "components\invoice-basis\invoice-basis-page-new.tsx"
if (Test-Path $uiFile) {
    $content = Get-Content $uiFile -Raw
    if ($content -match "canExportToFortnox") {
        Write-Host "   ✅ canExportToFortnox helper found" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  canExportToFortnox helper not found" -ForegroundColor Yellow
    }
    if ($content -match "handleExportToFortnox") {
        Write-Host "   ✅ handleExportToFortnox function found" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  handleExportToFortnox function not found" -ForegroundColor Yellow
    }
    if ($content -match "Fortnox Export") {
        Write-Host "   ✅ Fortnox export UI section found" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Fortnox export UI section not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  UI file not found (may be in different location)" -ForegroundColor Yellow
}

# 5. Check environment variables (if .env.local exists)
Write-Host ""
Write-Host "5. Checking environment variables..." -ForegroundColor Yellow
$envFiles = @(".env.local", ".env")
$foundEnv = $false

foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        $foundEnv = $true
        $envContent = Get-Content $envFile -Raw
        
        if ($envContent -match "FORTNOX_CLIENT_ID") {
            Write-Host "   ✅ FORTNOX_CLIENT_ID found in $envFile" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  FORTNOX_CLIENT_ID not found in $envFile" -ForegroundColor Yellow
        }
        
        if ($envContent -match "FORTNOX_CLIENT_SECRET") {
            Write-Host "   ✅ FORTNOX_CLIENT_SECRET found in $envFile" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  FORTNOX_CLIENT_SECRET not found in $envFile" -ForegroundColor Yellow
        }
        
        break
    }
}

if (-not $foundEnv) {
    Write-Host "   ⚠️  No .env.local or .env file found" -ForegroundColor Yellow
    Write-Host "      Create .env.local and add:" -ForegroundColor Yellow
    Write-Host "      FORTNOX_CLIENT_ID=your_client_id" -ForegroundColor Yellow
    Write-Host "      FORTNOX_CLIENT_SECRET=your_client_secret" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ All critical files found!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Apply database migrations in Supabase SQL Editor" -ForegroundColor White
    Write-Host "   2. Set FORTNOX_CLIENT_ID and FORTNOX_CLIENT_SECRET in .env.local" -ForegroundColor White
    Write-Host "   3. Run TypeScript test: npx tsx scripts/test-fortnox-integration.ts" -ForegroundColor White
    Write-Host "   4. Test with a real locked invoice_basis" -ForegroundColor White
} else {
    Write-Host "⚠️  Some files are missing. Please check the errors above." -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan


