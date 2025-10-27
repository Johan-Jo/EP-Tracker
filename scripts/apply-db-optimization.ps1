#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Applicerar EPIC 26.9 Database Optimization Migrations (Phase A, B, C)

.DESCRIPTION
    Detta script:
    1. Verifierar Supabase CLI installation
    2. Loggar in i Supabase (om inte redan inloggad)
    3. Länkar projektet (om inte redan länkat)
    4. Applicerar alla 3 database migrations i korrekt ordning
    5. Verifierar att migrationen lyckades

.NOTES
    Author: AI Assistant
    Epic: EPIC 26.9 - Database Optimization
    Migrations:
      - Phase A: Partial & Covering Indexes
      - Phase B: Activity Log Table with Triggers
      - Phase C: Materialized Views for Counts
#>

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$PROJECT_REF = "ngmqqtryojmyeixicekt"
$MIGRATION_FILES = @(
    "20250126000001_database_optimization_phase_a.sql",
    "20250126000002_database_optimization_phase_b.sql",
    "20250126000003_database_optimization_phase_c.sql"
)

# ============================================================================
# FUNCTIONS
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host "`n$Text" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Text)
    Write-Host "`n✓ $Text" -ForegroundColor Green
}

function Write-Info {
    param([string]$Text)
    Write-Host "  → $Text" -ForegroundColor White
}

function Write-Warning {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Test-SupabaseCLI {
    try {
        $version = supabase --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Supabase CLI är installerat"
            Write-Info "Version: $version"
            return $true
        }
    } catch {
        Write-Error "Supabase CLI är INTE installerat!"
        Write-Info "Installera via: https://supabase.com/docs/guides/cli"
        return $false
    }
}

function Test-SupabaseLogin {
    try {
        $result = supabase projects list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Du är inloggad i Supabase CLI"
            return $true
        } else {
            return $false
        }
    } catch {
        return $false
    }
}

function Invoke-SupabaseLogin {
    Write-Header "STEG 1: Logga in i Supabase"
    
    if (Test-SupabaseLogin) {
        Write-Info "Redan inloggad!"
        return $true
    }
    
    Write-Info "Öppnar webbläsare för inloggning..."
    Write-Info "(Om det inte öppnas automatiskt, följ länken i terminalen)"
    
    try {
        supabase login
        
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Inloggning lyckades!"
            return $true
        } else {
            Write-Error "Inloggning misslyckades!"
            return $false
        }
    } catch {
        Write-Error "Kunde inte logga in: $_"
        return $false
    }
}

function Test-ProjectLinked {
    if (Test-Path ".\.supabase\config.toml") {
        $config = Get-Content ".\.supabase\config.toml" -Raw
        if ($config -match "project_id") {
            return $true
        }
    }
    return $false
}

function Invoke-ProjectLink {
    Write-Header "STEG 2: Länka projekt"
    
    if (Test-ProjectLinked) {
        Write-Step "Projektet är redan länkat!"
        return $true
    }
    
    Write-Info "Länkar projekt: $PROJECT_REF"
    Write-Info "(Du kan behöva ange ditt databas-lösenord)"
    
    try {
        supabase link --project-ref $PROJECT_REF
        
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Projektet är nu länkat!"
            return $true
        } else {
            Write-Error "Kunde inte länka projektet!"
            return $false
        }
    } catch {
        Write-Error "Ett fel uppstod vid länkning: $_"
        return $false
    }
}

function Test-MigrationFiles {
    Write-Header "STEG 3: Verifiera migration-filer"
    
    $allExist = $true
    
    foreach ($file in $MIGRATION_FILES) {
        $path = "supabase\migrations\$file"
        if (Test-Path $path) {
            Write-Info "✓ $file"
        } else {
            Write-Error "✗ $file (SAKNAS!)"
            $allExist = $false
        }
    }
    
    if ($allExist) {
        Write-Step "Alla migration-filer finns!"
        return $true
    } else {
        Write-Error "Vissa migration-filer saknas!"
        return $false
    }
}

function Invoke-DatabasePush {
    Write-Header "STEG 4: Applicera database migrations"
    
    Write-Info "Applicerar Phase A, B och C..."
    Write-Info "(Detta tar ca 30-60 sekunder)"
    Write-Host ""
    
    try {
        # Kör supabase db push
        supabase db push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Step "Alla migrations applicerade framgångsrikt!"
            Write-Host ""
            Write-Info "✓ Phase A: Partial & Covering Indexes"
            Write-Info "✓ Phase B: Activity Log Table with Triggers"
            Write-Info "✓ Phase C: Materialized Views for Counts"
            return $true
        } else {
            Write-Error "Database push misslyckades!"
            return $false
        }
    } catch {
        Write-Error "Ett fel uppstod: $_"
        return $false
    }
}

function Show-Summary {
    Write-Header "✅ KLART!"
    
    Write-Host ""
    Write-Host "🎉 EPIC 26.9 Database Optimization är nu live!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vad som har lagts till:" -ForegroundColor Cyan
    Write-Host "  • 6 nya indexes (partial, covering, composite)" -ForegroundColor White
    Write-Host "  • 1 activity_log tabell med triggers" -ForegroundColor White
    Write-Host "  • 2 materialized views för COUNT() queries" -ForegroundColor White
    Write-Host "  • 3 nya optimerade RPC functions" -ForegroundColor White
    Write-Host ""
    Write-Host "Förväntad förbättring:" -ForegroundColor Cyan
    Write-Host "  • Dashboard queries: 6x snabbare ⚡" -ForegroundColor White
    Write-Host "  • COUNT() queries: 10x snabbare 🚀" -ForegroundColor White
    Write-Host "  • Recent activities: 8x snabbare 💨" -ForegroundColor White
    Write-Host ""
    Write-Host "Nästa steg:" -ForegroundColor Cyan
    Write-Host "  1. Deploy till Vercel: git push origin main" -ForegroundColor White
    Write-Host "  2. Verifiera i produktion: https://eptracker.app" -ForegroundColor White
    Write-Host "  3. Kör performance test: npm run perf-test" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   EPIC 26.9: Database Optimization Deployment                 ║" -ForegroundColor Cyan
Write-Host "║   Phase A, B & C - Alla 3 migrations                          ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Steg 0: Verifiera Supabase CLI
if (-not (Test-SupabaseCLI)) {
    Write-Host ""
    Write-Error "Avbryter: Supabase CLI saknas!"
    exit 1
}

# Steg 1: Logga in
if (-not (Invoke-SupabaseLogin)) {
    Write-Host ""
    Write-Error "Avbryter: Kunde inte logga in!"
    exit 1
}

# Steg 2: Länka projekt
if (-not (Invoke-ProjectLink)) {
    Write-Host ""
    Write-Error "Avbryter: Kunde inte länka projektet!"
    exit 1
}

# Steg 3: Verifiera filer
if (-not (Test-MigrationFiles)) {
    Write-Host ""
    Write-Error "Avbryter: Migration-filer saknas!"
    exit 1
}

# Steg 4: Applicera migrations
if (-not (Invoke-DatabasePush)) {
    Write-Host ""
    Write-Error "Avbryter: Migration misslyckades!"
    Write-Host ""
    Write-Warning "Tips: Kolla felmeddelandet ovan och försök igen."
    Write-Warning "Du kan också applicera manuellt i Supabase Dashboard."
    exit 1
}

# Steg 5: Visa sammanfattning
Show-Summary

exit 0

