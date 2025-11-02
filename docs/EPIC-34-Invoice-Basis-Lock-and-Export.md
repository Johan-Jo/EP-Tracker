# EPIC 34: Fakturaunderlag – vy, låsning, export (M4)

## Context/Goal
Förhandsgranska och lås fakturaunderlag per projekt/period med tid, material, utlägg, mil och ÄTA; exportera SIE/CSV/PDF.

## Scope
- **M4a (Read-only view):** Visa fakturaunderlag per projekt/period
- **M4b (Editing):** Redigera beskrivningsrader/etiketter
- **M4c (Export):** Låsning och export (SIE/CSV/PDF)

## Implementation Phases
- **Phase 1:** M4a - View fakturaunderlag (read-only, aggregate from existing data)
- **Phase 2:** M4b - Edit lines + labels + attachments
- **Phase 3:** M4c - Lock workflow + export formats (SIE/CSV/PDF)

## Invoice Line Types
- **Tid:** From `attendance_session` (hours * rate)
- **Material:** From `materials` table
- **Utlägg:** From `expenses` table
- **Mil:** From `mileage_entries` table
- **ÄTA:** From `ata_entries` table
- **Bilagor:** Links to photos/invoices

## Data model & Migrations
- `invoice_basis` (materialiserad vy eller tabell):
  - `id`, `project_id`, `period_start`, `period_end`
  - `lines_json` (spec), `totals`
  - `locked boolean`, `locked_by`, `locked_at`

## Jobs/Schedulers

### Invoice Basis Refresh
**Location:** `lib/jobs/basis-refresh.ts` (extended)
**Function:** `refreshInvoiceBasis(projectId, periodStart, periodEnd)`

**Logic:**
1. Fetch data for period:
   - `attendance_session` → time lines (hours * rate)
   - `materials` → material lines
   - `expenses` → expense lines
   - `mileage_entries` → mileage lines
   - `ata_entries` → ATA lines
2. Aggregate per line type
3. Calculate totals (subtotal, VAT, grand total)
4. Store/update `invoice_basis` record

## API Routes

### GET `/api/invoice-basis/[projectId]`
**Location:** `app/api/invoice-basis/[projectId]/route.ts`
- Query params: `periodStart`, `periodEnd`
- Returns: `invoice_basis` with lines + totals
- Auth: Project access required

### POST `/api/invoice-basis/[projectId]/lines/[lineId]`
**Location:** `app/api/invoice-basis/[projectId]/lines/[lineId]/route.ts`
- Body: `{ description?, label?, amount? }`
- Auth: Foreman/admin
- Updates: Edit line details (only if not locked)

### POST `/api/invoice-basis/[projectId]/lock`
**Location:** `app/api/invoice-basis/[projectId]/lock/route.ts`
- Body: `{ periodStart, periodEnd }`
- Auth: Admin
- Returns: `{ success, locked_at }`
- Side effects: Mark as locked, prevent further edits

### POST `/api/invoice-basis/[projectId]/unlock`
**Location:** `app/api/invoice-basis/[projectId]/unlock/route.ts`
- Auth: Superadmin only
- Returns: `{ success }`
- Side effects: Unlock + trigger notification

### GET `/api/exports/invoice`
**Location:** `app/api/exports/invoice/route.ts`
- Query params: `projectId`, `periodStart`, `periodEnd`, `format` (csv|sie|pdf)
- Auth: Admin
- Validation: Must be locked
- Returns: File download

### GET `/api/exports/ledger`
**Location:** `app/api/exports/ledger/route.ts`
- Query params: `projectId`, `periodStart`, `periodEnd`
- Auth: Admin
- Returns: SIE-format ledger file

## Security & RLS
- RLS per kund + projekt; låsning krävs före export.

## Acceptance
- I1: Alla radtyper ingår; bilagor klickbara.
- I2: Låsning krävs innan export.

## Dependencies & Milestone
- Del av M4.
