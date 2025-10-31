# EPIC 34: Fakturaunderlag – vy, låsning, export (M4)

## Context/Goal
Förhandsgranska och lås fakturaunderlag per projekt/period med tid, material, utlägg, mil och ÄTA; exportera SIE/CSV/PDF.

## Scope
- Materialiserad vy/tabell `invoice_basis` per projekt/period: tid, material, utlägg, mil, ÄTA, bilagelänkar.
- Redigerbara beskrivningsrader/etiketter; utkast tills låst.
- Export: SIE/CSV + PDF.

## Data model & Migrations
- `invoice_basis` (materialiserad vy eller tabell):
  - `id`, `project_id`, `period_start`, `period_end`
  - `lines_json` (spec), `totals`
  - `locked boolean`, `locked_by`, `locked_at`

## API
- POST `/invoice/basis/lock`
- POST `/exports/invoice`
- POST `/exports/ledger`

## Security & RLS
- RLS per kund + projekt; låsning krävs före export.

## Acceptance
- I1: Alla radtyper ingår; bilagor klickbara.
- I2: Låsning krävs innan export.

## Dependencies & Milestone
- Del av M4.
