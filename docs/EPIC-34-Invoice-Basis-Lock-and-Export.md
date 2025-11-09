# EPIC 34: Fakturaunderlag – vy, låsning, export (M4)

## Context/Goal
Fakturaunderlaget ska samla tid, material, utlägg, mil, ÄTA och dagbok per projekt/period. Användaren ska kunna:

1. Välja projekt/period och granska samtliga rader.
2. Redigera header/rader innan låsning.
3. Låsa underlaget (fakturaserie, nummer, OCR, hash) och exportera CSV (Fortnox/Visma-ready).
4. Spåra alla ändringar via audit-logg.

UI finns under `Dashboard → Fakturaunderlag` (synligt för admin/arbetsledare/ekonomi).

## Scope
- **M4a (View):** Läs vy över fakturaunderlag (`/dashboard/invoice-basis`), auto-refresh från befintlig data.
- **M4b (Editing):** Inline-redigering av rader + headerfält, audit-logg på alla uppdateringar.
- **M4c (Lock & Export):** Låsa/oplåsa med OCR + hash, exportera låst snapshot som CSV.
- **M4d (Compliance/PDF/SIE):** Planerad – ej implementerad i denna iteration.
- **M4e (Fortnox/Visma integrationer):** Planerad – ej implementerad.

## Implementation Phases
1. `invoice_basis` tabell + refresh-jobb (`lib/jobs/invoice-basis-refresh.ts`) – aggregerar alla linjetyper och totals.
2. API + hooks för header/radredigering (`POST /header`, `POST /lines/[lineId]`), auditlogg.
3. Lock/Unlock API (serie/nummer/OCR/hash, auditlogg) och CSV-export som använder låst snapshot.
4. Dashboard-sida med full UI-flöde + navigation och uppdaterad hjälpsektion.

## Invoice Line Types (lines_json)
- `time` – godkända `time_entries`, timtaxa från `memberships.hourly_rate_sek`.
- `material` – godkända `materials`.
- `expense` – godkända `expenses`.
- `mileage` – godkända `mileage`.
- `ata` – godkända `ata`.
- `diary` – sanerade dagbokssammanfattningar (text-rader utan belopp).
- `attachments` – URL:er till foton/kvitton när tillgängligt.

## Data model & Migrations
- `supabase/migrations/20251108000001_invoice_basis_table.sql`
  - Headerfält: serie/nummer, datum, OCR, referenser, reverse charge, ROT/RUT, adresser, dimensioner.
  - Payload: `lines_json` (lines + diary), `totals` (per momssats + total).
  - Låsstatus: `locked`, `locked_by`, `locked_at`, `hash_signature`.

## Jobs/Schedulers

### Invoice Basis Refresh
- **Location:** `lib/jobs/invoice-basis-refresh.ts`
- **Function:** `refreshInvoiceBasis({ orgId, projectId, periodStart, periodEnd })`
- **Flow:**
  1. Hämtar godkända poster i hela perioden.
  2. Beräknar rader, moms, totals och dagbokssammanfattningar.
  3. Upsertar `invoice_basis` (så länge den inte är låst).
  4. Returnerar snapshot som används av API/UI.

## API Routes (huvudflöde)

| Endpoint | Beskrivning | Auth | Audit |
| --- | --- | --- | --- |
| `GET /api/invoice-basis/[projectId]?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD` | Hämtar (och refreshar) invoice_basis | Admin/Foreman/Finance | – |
| `POST /api/invoice-basis/[projectId]/header` | Uppdaterar headerfält, auto-beräknar förfallodatum | Admin/Foreman | ✅ |
| `POST /api/invoice-basis/[projectId]/lines/[lineId]` | Uppdaterar rad (artikel, konto, moms, á-pris, etc.) | Admin/Foreman | ✅ |
| `POST /api/invoice-basis/[projectId]/lock` | Tilldelar serie/nummer/OCR, beräknar hash, låser | Admin | ✅ |
| `POST /api/invoice-basis/[projectId]/unlock` | Låser upp (kräver motivering) | Admin | ✅ |
| `GET /api/exports/invoice?projectId=...&start=...&end=...` | Exporterar låst snapshot som CSV | Admin/Foreman/Finance | Loggas via integration_batches |

> OBS: CSV kräver `locked = true`. PDF/SIE reserverat för framtida iteration.

## Security, Audit & Navigation
- RLS per organisation/projekt (endast medlemmar ser underlag).
- Låsning krävs innan export och verhindert fler ändringar.
- Audit-logg (`audit_log`) registrerar header/line-ändringar, lock/unlock.
- UI nås via sidomenyn: *Fakturaunderlag* (ikon `FileText`).
- Hjälpsidan (`/dashboard/help`) uppdaterad med nytt arbetsflöde.

## Acceptance (levererat)
- I1. `invoice_basis` konsumerar alla linjetyper + dagbok.
- I2. UI möjliggör redigering, låsning, export och tydlig status.
- I3. CSV-export ger 100% låst snapshot (inkl. moms, totals, fakturainfo).
- I4. Audit-logg på samtliga muterande operationer.
- I5. Navigering och hjälptexter matchar den nya sidan.
