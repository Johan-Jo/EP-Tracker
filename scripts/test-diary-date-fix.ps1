#!/usr/bin/env pwsh
# =====================================================
# Test Script: Verify Diary Date Fix
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diary Date Fix - Verification Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Not in project root. Run from EP-Tracker directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project root confirmed" -ForegroundColor Green
Write-Host ""

# 1. Check for utility file
Write-Host "1. Checking formatPlainDate utility..." -ForegroundColor Yellow
if (Test-Path "lib/utils/formatPlainDate.ts") {
    Write-Host "   ✅ lib/utils/formatPlainDate.ts exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ lib/utils/formatPlainDate.ts NOT FOUND" -ForegroundColor Red
}

# 2. Check migration file
Write-Host ""
Write-Host "2. Checking migration..." -ForegroundColor Yellow
if (Test-Path "supabase/migrations/20250127000007_fix_diary_date_timezone.sql") {
    Write-Host "   ✅ Migration file exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Migration file NOT FOUND" -ForegroundColor Red
}

# 3. Check API file
Write-Host ""
Write-Host "3. Checking API implementation..." -ForegroundColor Yellow
$apiContent = Get-Content "app/api/diary/route.ts" -Raw
if ($apiContent -match "insert_diary_entry") {
    Write-Host "   ✅ API uses insert_diary_entry RPC" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  API may not be using RPC function" -ForegroundColor Yellow
}

if ($apiContent -match "^\d\{4\}-\\d\{2\}-\\d\{2\}") {
    Write-Host "   ✅ API validates YYYY-MM-DD format" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  API date validation not found" -ForegroundColor Yellow
}

# 4. Check UI components
Write-Host ""
Write-Host "4. Checking UI components..." -ForegroundColor Yellow

$components = @(
    "components/diary/diary-page-new.tsx",
    "components/diary/diary-detail-new.tsx",
    "components/diary/diary-detail-client.tsx",
    "components/diary/diary-list.tsx"
)

foreach ($component in $components) {
    $content = Get-Content $component -Raw
    $hasImport = $content -match "formatPlainDate|formatSwedishFull"
    
    if ($hasImport) {
        Write-Host "   ✅ $($component.Split('/')[-1]) uses formatPlainDate utilities" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $($component.Split('/')[-1]) may not use formatPlainDate" -ForegroundColor Yellow
    }
}

# 5. Search for problematic patterns
Write-Host ""
Write-Host "5. Searching for problematic date conversions..." -ForegroundColor Yellow

$problematicPatterns = @()

# Search for new Date(entry.date) or new Date(diary.date) WITHOUT T00:00:00
Get-ChildItem -Path "components/diary" -Filter "*.tsx" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Check for new Date(entry.date) or new Date(diary.date) without T00:00:00
    if ($content -match 'new Date\([^)]*\.(date|entry_date)\)(?!.*T00:00:00)') {
        $problematicPatterns += $_.Name
    }
}

if ($problematicPatterns.Count -eq 0) {
    Write-Host "   ✅ No problematic date conversions found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found potential issues in:" -ForegroundColor Yellow
    foreach ($file in $problematicPatterns) {
        Write-Host "      - $file" -ForegroundColor Yellow
    }
}

# 6. Check for parseISO usage
Write-Host ""
Write-Host "6. Checking for date-fns parseISO usage..." -ForegroundColor Yellow

$parseISOFiles = @()
Get-ChildItem -Path "components/diary" -Filter "*.tsx" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'parseISO') {
        $parseISOFiles += $_.Name
    }
}

if ($parseISOFiles.Count -eq 0) {
    Write-Host "   ✅ No parseISO usage found (good!)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Found parseISO in:" -ForegroundColor Yellow
    foreach ($file in $parseISOFiles) {
        Write-Host "      - $file" -ForegroundColor Yellow
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review any warnings above" -ForegroundColor White
Write-Host "2. Run scripts/verify-diary-schema.sql in Supabase SQL Editor" -ForegroundColor White
Write-Host "3. Test creating a new diary entry" -ForegroundColor White
Write-Host "4. Verify dates display correctly in list and detail views" -ForegroundColor White
Write-Host ""
Write-Host "For detailed checklist, see: docs/diary-date-fix-checklist.md" -ForegroundColor Cyan
Write-Host ""

