# EPIC 33: Löneunderlag – vy, låsning, export (M3)

## Context/Goal
Beräkna och förhandsgranska löneunderlag per person/period, tillämpa regler (rast/OB/övertid), lås före export.

## Scope
- **M3a (Read-only view):** Visa löneunderlag per person/period med beräknade timmar
- **M3b (Rules engine):** Implementera OB/rast-regler + övertidsberäkning
- **M3c (Lock + Export):** Låsning och export (CSV/PDF)

## Implementation Phases
- **Phase 1:** M3a - View löneunderlag (read-only, sums from `attendance_session`)
- **Phase 2:** M3b - Apply rules (rast/OB/övertid) + configuration UI
- **Phase 3:** M3c - Lock workflow + export formats

## Data model & Migrations
- `payroll_basis` (materialiserad vy eller tabell):
  - `id`, `person_id`, `period_start`, `period_end`
  - `hours_norm`, `hours_overtime`, `ob_hours`
  - `corrections_json`, `locked boolean`, `locked_by`, `locked_at`

## Rules & Configuration

### Payroll Rules (per organization)
**Location:** `org_settings` table extension or `payroll_rules` table

- `normal_hours_threshold`: int (default 40, hours/week for overtime)
- `auto_break_duration`: int (minutes, default 30)
- `auto_break_after_hours`: float (default 6.0)
- `overtime_multiplier`: float (default 1.5)
- `ob_rates`: JSON (e.g., `{ "night": 1.2, "weekend": 1.5, "holiday": 2.0 }`)

### Break Rules
- Auto-rast: Add 30 min if session > 6 hours
- Manual breaks: Tracked via separate time_entries (type = 'break')

### OT/Overtime Rules
- Calculate: Total hours per week > threshold → overtime hours
- Multiply: overtime_hours * multiplier

## Jobs/Schedulers

### Basis Refresh Job
**Location:** `lib/jobs/basis-refresh.ts`
**Trigger:** Manual, after lock/unlock, after corrections, after rule changes

**Function:** `refreshPayrollBasis(orgId, periodStart, periodEnd, personIds?)`

**Logic:**
1. Fetch all `attendance_session` for period
2. Group by `person_id` + week
3. Calculate per person:
   - `hours_norm`: Regular hours (up to threshold)
   - `hours_overtime`: Overtime hours (above threshold)
   - `ob_hours`: Night/weekend/holiday hours (apply OB rates)
   - `break_hours`: Auto-breaks + manual breaks
   - `total_hours`: Net hours after breaks
4. Store/update `payroll_basis` record
5. Mark as `locked = false` (if was locked, this triggers notification)

**Implementation:**
- Use Supabase Edge Function
- Batch processing: 100 persons per run
- Idempotent: recalculate from scratch each time
- Cache rules in memory during processing

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
