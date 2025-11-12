# EPIC 32: Sessionsbyggare, Rättelser och Grundexport (M2)

## Context/Goal
Bygg en regelmotor som parar `time_event` in→out till `attendance_session`, hanterar auto-stängning och rättelser, samt exporterar periodunderlag.

## Scope
- Parningslogik in→out per person/projekt i tidsordning med toleranser.
- Auto-stängning vid dygnsbyte enligt regel och flagga.
- Skapa/uppdatera `attendance_session` inkl. `immutable_hash`, `corrected:boolean`.
- Rättelser via dialog (platsansvarig/superadmin), logga ändringar, uppdatera hash.
- Export (PDF/CSV) av kontrollperiod inkl. "Corrected: yes".

## Data model & Migrations
- Tabell `attendance_session`:
  - `id`, `person_id`, `company_id`, `project_id`
  - `check_in_ts`, `check_out_ts`, `source_first`, `source_last`
  - `device_first`, `device_last`, `immutable_hash`, `corrected boolean`
- Tabell `correction_log`:
  - `id`, `session_id`, `field`, `old_value`, `new_value`
  - `reason`, `changed_by`, `changed_at`
- Index
  - `attendance_session (project_id, check_in_ts)`
  - `attendance_session (person_id, check_in_ts)`

## Jobs/Schedulers

### Attendance Builder
**Location:** `lib/jobs/attendance-builder.ts`
**Trigger:** Manual API call or scheduled cron (every 5 minutes)
**Function:** `buildAttendanceSessions(projectId?, startDate?, endDate?)`

**Logic:**
1. Fetch unpaired `time_event` records (type = 'check_in' without corresponding 'check_out')
2. For each project:
   - Sort events by person + timestamp
   - Pair check_in → check_out using matching rules:
     - Same person_id + project_id
     - check_out.ts > check_in.ts
     - Within max session duration (configurable, default 16 hours)
   - Handle edge cases:
     - Multiple check-ins without check-out: flag for manual review
     - check_out without prior check_in: flag as orphan
     - Cross-day sessions: auto-close at 23:59:59 if configured
3. Create/update `attendance_session`:
   - Generate `immutable_hash` from: person_id + check_in_ts + check_out_ts + source
   - Set `corrected = false`
   - Store first/last source + device
4. Log auto-starts/stops to `audit_log`

**Implementation:**
- Use Supabase Edge Function or Next.js API route
- Idempotent: skip already-processed events
- Batch processing: 1000 events per run
- Error handling: retry failed batches, log errors to monitoring

### Auto-Close Cross-Day Sessions
**Function:** `autoCloseCrossDaySessions()`
**Trigger:** Daily at 23:59:59 (per project timezone)

**Logic:**
- Find open sessions from previous day
- Close at 23:59:59 in project timezone
- Send notification to project foreman/admin
- Log reason: "Auto-stängd vid dygnsbyte"

## API Routes

### GET `/api/worksites/[projectId]/sessions`
**Location:** `app/api/worksites/[projectId]/sessions/route.ts`
- Query params: `from`, `to` (ISO dates), `person_id?`, `company_id?`
- Returns: Array of `attendance_session` with person/company details
- Includes: `id`, `person_name`, `company_name`, `check_in_ts`, `check_out_ts`, `hours`, `source`, `corrected`, `immutable_hash`
- Performance: < 2s for 500 sessions (indexed query)

### POST `/api/worksites/[projectId]/sessions/[sessionId]/correct`
**Location:** `app/api/worksites/[projectId]/sessions/[sessionId]/correct/route.ts`
- Body: `{ field: 'check_in_ts' | 'check_out_ts', new_value: string, reason: string }`
- Auth: Requires foreman/admin role
- Returns: `{ success: boolean, updated_session, correction_log_id }`
- Side effects:
  - Update `attendance_session` record
  - Log change to `correction_log`
  - Regenerate `immutable_hash`
  - Send audit event

### POST `/api/admin/build-sessions`
**Location:** `app/api/admin/build-sessions/route.ts`
- Body: `{ projectId?, startDate?, endDate? }`
- Auth: Admin only
- Trigger: Manually run attendance-builder job
- Returns: `{ processed, created, updated, flagged, errors }`

## Security & RLS
- RLS per kund + projekt på nya tabeller.
- Rättelser kräver roll: Platsansvarig eller Superadmin.

## UI Components

### Sessions List (Control View Update)
**Location:** `components/worksites/control-view.tsx` (extended)
- Replace `time_entries` with `attendance_session` data source
- Add column: "Korrigerad" badge if `corrected = true`
- Filter: "Visa endast korrigerade"
- Row click: Opens correction dialog if has permissions

### Correction Dialog
**Location:** `components/worksites/correction-dialog.tsx`
- Form fields:
  - Field selector: "In-tid" or "Ut-tid"
  - DateTime picker: New value
  - Textarea: Reason (required, min 10 chars)
  - Info banner: "Alla rättelser loggas och kan granskas"
- Actions: "Spara korrigering" (primary), "Avbryt"
- Validation:
  - New time must be within valid range
  - Reason required
  - Can't correct locked payroll/invoice periods

### Admin: Build Sessions UI
**Location:** `app/dashboard/admin/jobs/page.tsx`
- Button: "Bygg sessions för alla projekt"
- Loading state: Progress indicator
- Results: Stats (processed, created, updated, flagged)
- Error handling: Display failed batches

## Testing & Performance

### Acceptance Criteria
- **S1:** Parning korrekt i ≥ 99%, övriga flaggas
- **S2:** Auto-stängning vid dygnsbyte; notis skickas
- **A3:** Rättelser kräver reason och syns i export

### Test Scenarios

**Unit Tests:**
- Pairing logic: Normal in→out pair
- Pairing edge: Multiple check-ins without out
- Pairing edge: Orphan check-out
- Auto-close: Cross-day session handling
- Hash generation: Immutability verification
- Correction flow: Update session + log

**Integration Tests:**
- Build sessions: Process 100 events → create 50 sessions
- Correction: Update check_in_ts → verify hash + log
- Export: CSV shows "Corrected: yes" column
- Permission: Foreman can correct, worker cannot

**E2E Tests:**
- Full flow: Check-in → Auto-pair → Build sessions → View → Correct → Export
- Cross-day: Check-in 23:45 → Auto-close 23:59:59 → Notification
- Multiple projects: Sessions isolated per project

### Performance Tests
- Build 1000 sessions: < 5s processing time
- Query 500 sessions: < 2s response time
- Correction update: < 500ms end-to-end

### Test Data
- 2000 time_events (1000 pairs, 20 edge cases)
- 10 projects with mixed timezones
- 2 cross-day scenarios per project

## Implementation Status

### ❌ Not Started
- `attendance_session` table migration
- `correction_log` table migration
- Attendance builder job
- Correction API endpoint
- Correction UI dialog
- Control view update (use sessions instead of events)

### 📋 Planned Order
1. Create migrations (tables + indexes)
2. Build pairing logic + edge case handling
3. Implement correction API
4. Build correction UI dialog
5. Update control view to use sessions
6. Performance testing

## Dependencies & Milestone
- **Del av M2**
- **Depends on:** EPIC 31 (Control view + QR working)
- **Blocks:** EPIC 33–34 (Payroll/Invoice needs sessions)
- **Can start after:** EPIC 31 UI complete
