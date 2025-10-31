# EPIC 33: Löneunderlag – vy, låsning, export (M3)

## Context/Goal
Beräkna och förhandsgranska löneunderlag per person/period, tillämpa regler (rast/OB/övertid), lås före export.

## Scope
- Materialiserad vy/tabell `payroll_basis` per person/period: normal-/övertid, OB, raster, rättelser.
- Låsning före export; upplåsning endast superadmin.
- Export: CSV (Visma/Lön), PDF sammanställning.

## Data model & Migrations
- `payroll_basis` (materialiserad vy eller tabell):
  - `id`, `person_id`, `period_start`, `period_end`
  - `hours_norm`, `hours_overtime`, `ob_hours`
  - `corrections_json`, `locked boolean`, `locked_by`, `locked_at`

## Jobs/Schedulers
- `basis-refresh` vid lås/olås och vid rättelser/regeländringar.

## API
- POST `/payroll/basis/lock`
- POST `/exports/payroll`

## Security & RLS
- RLS per kund + projekt.
- Lås/olås: endast administratör; upplåsning endast superadmin.

## Acceptance
- P1: Avvikelse mellan sessionssumma och lönesummering < 1 %.
- P2: Låsning krävs innan export; upplåsning endast superadmin.

## Dependencies & Milestone
- Del av M3.
