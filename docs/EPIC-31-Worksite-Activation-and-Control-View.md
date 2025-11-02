# EPIC 31: Worksite-aktivering, platsdata och Kontrollvy (M1)

## Context/Goal
Aktivera personalliggare per projekt utan separat register. Lagra platsdata i `project`, möjliggör plats- och kontroll-QR samt en snabb Kontrollvy med export.

## Scope
- Utöka `project` med platsfält, `worksite_enabled`, `worksite_code`, `timezone`, `control_qr_token`, `retention_years`.
- Generera Plats-QR (valfritt) och Kontroll-QR (engångstoken, TTL 30 min).
- Kontrollvy (read-only): Nu, Idag, Period; filter/sök person/företag; export PDF/CSV inkl. sha256-hash.

## Data model & Migrations
- Alter `project`:
  - `worksite_enabled boolean`, `worksite_code text`
  - `address_line1 text`, `address_line2 text`, `postal_code text`, `city text`, `country text`
  - `building_id text`, `timezone text`, `control_qr_token text`, `retention_years int`
- Index
  - `time_event (project_id, ts)`

## API Routes

### GET `/api/worksites/[projectId]/active`
**Location:** `app/api/worksites/[projectId]/active/route.ts`
- Returns: `{ active: boolean }`
- Checks `worksite_enabled` for project

### GET `/api/worksites/[projectId]/sessions`
**Location:** `app/api/worksites/[projectId]/sessions/route.ts`
- Query params: `from`, `to` (ISO dates)
- Returns: Array of sessions with person/company info
- **Note:** Currently reads from `time_entries` (events); will switch to `attendance_session` after EPIC 32

### POST `/api/worksites/[projectId]/control-token`
**Location:** `app/api/worksites/[projectId]/control-token/route.ts`
- Generates 48-char random token
- Sets 30-min TTL
- Updates `projects.control_qr_token` and `control_qr_expires_at`
- Returns: `{ token, expiresAt }`

### POST `/api/worksites/checkin`
**Location:** `app/api/worksites/checkin/route.ts`
- Body: `{ project_id, user_id, check_in_ts, source }`
- Verifies worksite is enabled
- Creates `time_entries` record
- Validates organization membership
- Returns: `{ check_in_ts, message }`

### GET `/api/exports/worksite`
**Location:** `app/api/exports/worksite/route.ts`
- Query params: `projectId`, `from`, `to`, `format` (csv|pdf)
- Returns: CSV or PDF with sha256-hash
- Includes metadata: period, project ID, address, export timestamp

## UI Components

### Projekt > Platsdata
**Location:** `components/projects/project-form.tsx`
- Address autocomplete (Geoapify integration)
- Switch: "Aktivera personalliggare"
- Button: "Plats-QR" → opens QRDialog with check-in link
- Button: "Kontroll-QR" → generates token + opens QRDialog
- Status badges: Worksite status, Timezone, Retention period
- Interactive map (Leaflet) showing location
- Address fields: `address_line1`, `address_line2` (Postnummer & Stad), `postal_code`, `city`, `site_lat`, `site_lon`

**QR Dialogs:** `components/worksites/qr-dialog.tsx`
- QRCode component (react-qr-code)
- Download button (SVG export)
- Expiration timer for Kontroll-QR

### Kontrollvy
**Location:** `app/worksites/[projectId]/control/page.tsx`, `components/worksites/control-view.tsx`
- Tabs: "Nu", "Idag", "Period"
- Filter dropdown: Person, Företag (org.nr)
- Search input: Real-time search across name/company
- Columns: Namn, Företag, In-tid, Ut-tid, Källa, Skapad
- Action buttons: "Exportera CSV", "Skriv ut PDF"
- Show hash toggle: Displays sha256-hash column

**State management:**
- Local state for active tab, filters, search query
- Query params for token validation

### Worksite Overview Page
**Location:** `app/dashboard/worksites/page.tsx`
- Lists all projects with `worksite_enabled = true`
- Quick actions: Visa projekt, Check-in, Kontrollvy
- Empty state: Message + link to projects

### Check-in Page
**Location:** `app/worksites/[projectId]/checkin/checkin-page-client.tsx`
- Project info card with address
- QR code for sharing check-in link
- "Checka in" button (large, orange)
- Last check-in timestamp display
- Tips banner

## Security & RLS
- Engångstoken för Kontroll-QR, TTL 30 min, begränsad vy.
- RLS per kund + projekt.

## Testing & Performance

### Acceptance Criteria
- **A1:** Kontrollvy laddar < 2s för 500 rader (LCP < 2.5s, p95 < 2.5s)
- **A2:** Export inkluderar hash, period, projekt-ID och adress

### Test Scenarios

**Unit Tests:**
- Token generation: 48 chars, unique
- Token expiration: exactly 30 min TTL
- QR code generation: valid URL encoding
- Address autocomplete: Geoapify API integration
- Worksite validation: required fields check

**Integration Tests:**
- Check-in flow: event creation + audit log
- Kontroll-QR: token validation + access control
- Export CSV: correct columns + hash calculation
- Export PDF: layout + metadata
- Worksite overview: filter + search

**Performance Tests:**
- Load 500 sessions: < 2s response time
- Multiple concurrent check-ins: < 100ms per request
- Map rendering: < 500ms initial load

**E2E Tests:**
- Activate worksite: fill form → enable → generate QR
- Check-in: scan QR → verify event → see in Kontrollvy
- Kontrollvy access: token valid → shows sessions → export
- Export verification: hash matches, metadata correct

### Test Data
- 3 projects with worksite enabled
- 50 users across 2 organizations
- 500+ check-in/out events (mixed dates)
- 2 UE companies with 10 workers each

### Performance Monitoring
- **Metrics:** API response time (p50, p95, p99), DB query time, export generation time
- **Tools:** Next.js telemetry, Supabase query logs, browser performance API
- **Alerting:** If p95 > 2.5s for Kontrollvy load

## Implementation Status

### ✅ Completed
- Project table extensions (all fields + indexes)
- Plats-QR generation and dialog
- Kontroll-QR generation with token rotation
- Worksite overview page
- Check-in page with QR code
- Check-in API endpoint
- Control view UI (tabs, filters, search)
- CSV export with sha256-hash
- PDF/Text export with sha256-hash (uses txt format, proper PDF library can be added later)

### ⏳ In Progress
- Performance optimization for 500+ sessions

### ❌ Remaining
- Performance benchmarking
- UAT with real users
- Optional: Install pdfkit for proper PDF generation (currently uses txt)

## Dependencies & Milestone
- **Del av M1**
- **Depends on:** EPIC 1-3 (Project management foundation)
- **Blocks:** EPIC 32 (needs Kontrollvy complete for session validation)
- **No blocker:** Can run in parallel with EPIC 36 (security hardening)
