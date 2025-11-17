# 🧪 Fortnox Integration Test Scripts

This directory contains test scripts to verify that the Fortnox integration is properly set up and working.

## Quick Start

### Option 1: PowerShell Script (Fastest)

```powershell
.\scripts\test-fortnox-integration.ps1
```

This script checks:
- ✅ Migration files exist
- ✅ Library files exist with required functions
- ✅ API routes exist with permission checks
- ✅ UI component updates
- ✅ Environment variables (if .env.local exists)

### Option 2: TypeScript Script (Comprehensive)

```bash
npx tsx scripts/test-fortnox-integration.ts
```

Or if you have tsx installed globally:
```bash
tsx scripts/test-fortnox-integration.ts
```

This script checks:
- ✅ File structure
- ✅ Environment variables
- ✅ Database migrations (if Supabase is configured)
- ✅ API route structure and permissions
- ✅ Database tables and RLS policies

## Prerequisites

### For PowerShell Script
- PowerShell 5.1+ or PowerShell Core 7+
- No additional dependencies

### For TypeScript Script
- Node.js 18+
- Access to Supabase (for database tests)
- `.env.local` file with environment variables (automatically loaded)

## Environment Variables

The TypeScript script **automatically loads** environment variables from `.env.local` if it exists.

**Required in `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Optional (for full testing):**
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For database tests
FORTNOX_CLIENT_ID=your-client-id                  # For OAuth testing
FORTNOX_CLIENT_SECRET=your-client-secret          # For OAuth testing
```

**Note:** The script uses the `dotenv` package to automatically load `.env.local`. If the file doesn't exist, you'll see warnings but the script will still run (checking file structure and code).

## What Gets Tested

### 1. File Structure ✅
- Migration files in `supabase/migrations/`
- Library files in `lib/integrations/fortnox/`
- API routes in `app/api/integrations/fortnox/`
- UI component updates

### 2. Database Migrations ✅
- `fortnox_connections` table exists
- `fortnox_invoice_links` table exists
- RLS policies are enabled
- Tables are accessible

### 3. API Routes ✅
- Export route has admin+finance permission check
- Invoice links route has admin+finance+foreman permission check
- POST and GET handlers exist

### 4. Library Functions ✅
- `getFortnoxConnectionForOrg()` exists
- `refreshAccessTokenIfNeeded()` exists
- `createFortnoxInvoice()` exists
- `buildFortnoxInvoicePayloadFromInvoiceBasis()` exists

### 5. Environment Variables ✅
- Supabase URL and keys are set
- Fortnox OAuth credentials (optional)

## Expected Output

### Successful Run

```
🧪 Fortnox Integration Test Suite
============================================================

📁 Testing File Structure...
✅ lib/integrations/fortnox/client.ts: Exists
✅ lib/integrations/fortnox/export-invoice.ts: Exists
...

🔐 Testing Environment Variables...
✅ NEXT_PUBLIC_SUPABASE_URL: Set
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: Set
⏭️  FORTNOX_CLIENT_ID: Not set (Required for Fortnox OAuth)

📊 Testing Database Migrations...
✅ fortnox_connections table: Table exists and is accessible
✅ fortnox_invoice_links table: Table exists and is accessible

🌐 Testing API Routes...
✅ Export Route Permissions: Admin and finance role check found
✅ Export Route Handler: POST handler exists
...

============================================================
📋 Test Summary
============================================================
✅ Passed: 15
❌ Failed: 0
⏭️  Skipped: 2
📊 Total: 17

============================================================
🎉 All critical tests passed!

📝 Next Steps:
   1. Apply database migrations if not done
   2. Set FORTNOX_CLIENT_ID and FORTNOX_CLIENT_SECRET
   3. Create OAuth connection UI (optional)
   4. Test with a real locked invoice_basis
```

## Troubleshooting

### "Table does not exist" Error

**Solution:** Apply the database migrations:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251117000001_fortnox_connections.sql`
3. Run the migration
4. Repeat for `20251117000002_fortnox_invoice_links.sql`

### "Missing Supabase environment variables"

**Solution:** Ensure `.env.local` file exists in the project root with:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

The script automatically loads `.env.local` - if you still see this error, check that:
1. The file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
2. The file is in the project root directory
3. The variables are set without quotes: `NEXT_PUBLIC_SUPABASE_URL=https://...` (not `NEXT_PUBLIC_SUPABASE_URL="https://..."`)

### "Permission check not found"

**Solution:** Verify the API route files have the correct permission checks:
- Export route: `['admin', 'finance'].includes(membership.role)`
- Links route: `['admin', 'finance', 'foreman'].includes(membership.role)`

## Manual Testing Checklist

After running the automated tests, manually verify:

- [ ] Lock an invoice_basis
- [ ] As admin: See "Skapa kundfaktura i Fortnox" button
- [ ] As finance: See "Skapa kundfaktura i Fortnox" button
- [ ] As foreman: See read-only status (no button)
- [ ] Export creates invoice in Fortnox
- [ ] Export status is saved in database
- [ ] Failed exports show error message
- [ ] Cannot export same invoice twice

## Next Steps

1. ✅ Run test scripts
2. ✅ Apply database migrations
3. ✅ Set Fortnox OAuth credentials
4. ✅ Test with real invoice_basis
5. ✅ Create OAuth connection UI (optional)
6. ✅ Add customer Fortnox number storage (optional)

