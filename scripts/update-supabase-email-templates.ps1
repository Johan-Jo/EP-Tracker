# Script to update Supabase email templates via Management API
# This fixes the invite email to use the correct "set password" flow

Write-Host "=== Supabase Email Template Updater ===" -ForegroundColor Cyan
Write-Host ""

# Check if we have the required tools
$hasNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $hasNode) {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Prompt for Supabase credentials
Write-Host "Vi behöver dina Supabase-uppgifter för att uppdatera email templates." -ForegroundColor Yellow
Write-Host ""

$projectRef = Read-Host "Ange Supabase Project Reference (hittas i Project Settings → General → Reference ID)"
$serviceRoleKey = Read-Host "Ange Service Role Key (hittas i Project Settings → API → service_role key)" -AsSecureString

# Convert SecureString to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRoleKey)
$serviceRoleKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Uppdaterar email template..." -ForegroundColor Cyan

# Read the invite template
$templatePath = "supabase/templates/invite.html"
if (-not (Test-Path $templatePath)) {
    Write-Host "Error: Template file not found at $templatePath" -ForegroundColor Red
    exit 1
}

$templateContent = Get-Content $templatePath -Raw

# Create a temporary Node.js script to update via Management API
$nodeScript = @"
const https = require('https');

const projectRef = '$projectRef';
const serviceRoleKey = '$serviceRoleKeyPlain';
const template = ``$templateContent``;

// Supabase Management API endpoint
const options = {
    hostname: '$projectRef.supabase.co',
    path: '/auth/v1/admin/email/templates/invite',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': ``Bearer ``${serviceRoleKey}``,
        'apikey': serviceRoleKey
    }
};

const data = JSON.stringify({
    subject: 'Välkommen till EP-Tracker!',
    content: template
});

const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
            console.log('✅ Email template uppdaterad!');
            console.log('');
            console.log('Nästa steg:');
            console.log('1. Testa genom att bjuda in en användare från /dashboard/settings/users');
            console.log('2. Kolla mailet - det ska ha en "Sätt lösenord"-knapp');
            console.log('3. Klicka knappen - ska gå till Supabase password-setup sida');
            console.log('4. Efter lösenord är satt - redirect till /welcome');
        } else {
            console.error('❌ Error:', res.statusCode);
            console.error('Response:', responseData);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
});

req.write(data);
req.end();
"@

# Write temporary script
$tempScript = "temp-update-email.js"
$nodeScript | Out-File -FilePath $tempScript -Encoding utf8

# Run the script
try {
    node $tempScript
} finally {
    # Clean up
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
}

Write-Host ""
Write-Host "Om du fick ett error, kan du göra detta manuellt:" -ForegroundColor Yellow
Write-Host "1. Gå till: https://supabase.com/dashboard/project/$projectRef/auth/templates" -ForegroundColor White
Write-Host "2. Hitta 'Invite user' template" -ForegroundColor White
Write-Host "3. Se till att subject är: 'Välkommen till EP-Tracker!'" -ForegroundColor White
Write-Host "4. Se till att den använder {{ .ConfirmationURL }} (inte {{ .SiteURL }})" -ForegroundColor White
Write-Host "5. Klicka 'Save'" -ForegroundColor White
Write-Host ""
