# EPIC 31: Test Plan

**Scope:** Worksite Activation, Check-in, Control View, and Exports (CSV/PDF/TXT)
**Related Docs:** `docs/EPIC-31-COMPLETE.md`, `docs/EPIC-31-TEST-RESULTS.md`, `docs/EPIC-31-Worksite-Activation-and-Control-View.md`, `docs/PRD-Personalliggare-v2.md`

---

## 1. Test Environments

- **Local Dev:** http://localhost:3000
- **Browser:** Latest Chrome + Safari (desktop), Chrome on Android, Safari on iOS
- **Accounts:** Admin, Foreman, Worker (3 roles)
- **APIs:** Geoapify API key configured, Supabase connected

---

## 2. Preconditions & Test Data

- Organization with at least 2 projects (A, B)
- Project A: Worksite enabled; full address; timezone set; generated Plats-QR and Kontroll-QR
- Project B: Worksite disabled (negative path tests)
- 5 users: 2 workers, 1 foreman, 1 admin, 1 external (no org access)
- Seed 20 sessions spanning today and prior week for Project A

---

## 3. Acceptance Criteria Mapping

- A1: Kontrollvy laddar < 2s för 500 rader → Performance section
- A2: Export inkluderar hash, period, projekt-ID, adress → Exports section

---

## 4. Test Cases

### 4.1 Worksite Overview Page (`/dashboard/worksites`)

- Verify access control (Admin/Foreman only; Worker redirected)
- List shows active worksites with project details
- Quick actions: View project, Check-in, Control View present and enabled
- Empty state when no worksites are active

### 4.2 Project Form – Worksite Activation

- Enable/disable worksite toggle persists after save/reload
- Address autocomplete (Geoapify) populates street, postal code, city
- Map renders and updates on address change
- QR buttons present: Plats-QR (static), Kontroll-QR (short-lived token)
- Kontroll-QR token URL contains `token` param; opening grants access to control view

### 4.3 Check-in Page (`/worksites/[projectId]/checkin`)

- Page shows project details and QR
- "Checka in" creates a session for the current user and timestamp
- "Checka ut" updates the session with end time
- Last check-in timestamp updates
- Negative: check-in on a disabled worksite fails with proper error

### 4.4 Control View (`/worksites/[projectId]/control?token=...`)

- Token grants access without full app authentication but validates organization/project
- Tabs: Now/Today/Period switch and filter data correctly
- Search/filter narrows the sessions list live
- Columns: Namn, PersonID, In, Ut; values are correct and sortable where applicable
- Token expiration behavior:
  - Existing tokens work during TTL window
  - After TTL, new access should be denied (server-side enforcement TODO; verify current behavior and log)

### 4.5 Exports (CSV & PDF/TXT)

- CSV export downloads with UTF-8 encoding and headers: Namn, PersonID, In, Ut
- Metadata footer includes: hash (sha256), period, projectId, address
- Hash is reproducible for same dataset and changes when data changes
- TXT/PDF endpoint returns human-readable text (pdfkit optional)
- Exported data matches visible filtered dataset (period filter honored)

### 4.6 Security & AuthZ

- Control tokens are scoped to project and organization
- Admin/Foreman can access all worksite admin pages
- Worker cannot access `/dashboard/worksites` or export endpoints
- External/non-member cannot access control view, check-in, or exports
- Inputs validated server-side on all API routes

---

## 5. Performance Tests

### 5.1 Dataset Generation

- Generate 500, 1,000, and 5,000 sessions for Project A within a 7-day period
- Distribute sessions across multiple users and overlapping time windows

### 5.2 Load Metrics (Desktop Chrome)

- Measure initial load time of Control View (Today tab) using DevTools performance
- Target: < 2s for 500 rows, < 3s for 1,000 rows on baseline laptop
- Record memory usage and any long tasks > 50 ms

### 5.3 UX Safeguards

- Verify loading states render
- Verify UI remains responsive during data fetch
- Note: Pagination/virtualization recommended if thresholds not met

---

## 6. Negative & Edge Cases

- Invalid/expired control token → 401/403 and friendly error page
- Missing Geoapify key → address autocomplete gracefully disabled with guidance
- Duplicate check-in prevention within N minutes (if applicable) or allowed by design
- Timezone boundaries around DST transitions (in/out correctness)
- Very long names, special characters, and non-ASCII in CSV

---

## 7. Test Execution Checklist (Quick)

1. Overview page loads with active worksites and actions
2. Enable worksite, save, reload → persists
3. Address autocomplete + map works
4. Generate Plats-QR & Kontroll-QR; open control view via token
5. Check in/out works and timestamps update
6. Control view tabs and filters function
7. CSV export matches view and includes metadata + hash
8. TXT/PDF endpoint returns readable output
9. Worker blocked from admin pages; external blocked from all
10. Performance: 500 rows < 2s load time

---

## 8. Data Verification (Exports)

- Cross-check random 10 rows between UI and CSV
- Verify sha256 hash changes after editing a session
- Validate period boundaries (inclusive/exclusive per PRD)

---

## 9. Reporting

- Record results in `docs/EPIC-31-TEST-RESULTS.md`
- Note deviations, logs, and screenshots where helpful
- File follow-ups: pagination/virtualization, token TTL server-side, pdfkit

---

## 10. Go/No-Go Criteria

- All functional checks pass
- A1 performance target met (≥ 500 rows < 2s)
- A2 export metadata complete and validated
- No critical security gaps; non-blocking issues documented


