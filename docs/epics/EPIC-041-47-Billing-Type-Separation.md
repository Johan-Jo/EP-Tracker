# EPIC 41–47: Separation of Löpande vs Fast Billing

**Context:** Implements dual billing modes (Löpande/FAST) for time and ÄTA, ensures invoice basis, exports, and mobile flows align with new rules without impacting payroll.

---

## EPIC 41 – Fixed Billing Data Model Foundations

**Scope**
- Introduce `billing_type` enum.
- Add `project_billing_mode` enum (`LOPANDE_ONLY`, `FAST_ONLY`, `BOTH`) and extend `projects` with `billing_mode`, `quoted_amount_sek`, `project_hourly_rate_sek`.
- Extend `projects`, `time_entries`, `atas`, `invoice_basis` with billing metadata, validation fields.
- Extend `time_entries` med valfri `ata_id`-referens för att kunna boka tid direkt på ÄTA.
- Create `fixed_time_blocks` table with relations, audit columns, and constraints.
- Add supporting indexes and defaults.
- Update shared Supabase types, Prisma/TypeScript definitions, Zod schemas.
- Provide backfill/migration scripts and documentation.

**Dependencies:** None.  
**Acceptance Criteria**
- Migrations apply cleanly on staging and production clones.
- All existing APIs/tests compile with new typings.
- New project creation stores billing mode, quote, and hourly rate defaults.
- Invoice basis refresh and exports retain current behaviour for Löpande data.

---

## EPIC 42 – Fixed Time Blocks Management (API + UI)

**Scope**
- Build CRUD API routes for `fixed_time_blocks` with RLS, auditing, lock safeguards.
- Implement React Query hooks and shared service to manage blocks.
- Add dashboard & mobile UI to list, create, edit, delete blocks (sheet/dialog pattern).
- Ensure “delete” is blocked when block is used by locked invoice basis.
- Provide form validation and error messaging.

**Dependencies:** EPIC 41.  
**Acceptance Criteria**
- Users can manage fixed blocks per project on web & mobile.
- Attempting to delete a block linked to locked data returns a blocking error.
- Audit log captures create/update/delete actions.

---

## EPIC 43 – Time Entry Billing-Type Controls

**Scope**
- Add Löpande/Fast toggle to slider & manual time entry flows using project defaults.
- Integrate fixed block selector with inline “+ Ny fast post” sheet.
- Persist `billing_type` and `fixed_block_id` via API/Sync (online + offline queue).
- Tillåt Fast-tid utan fast post om projektet saknar block och användaren istället väljer en ÄTA.
- Provide UX hint explaining Fast behaviour.
- Update Zod schemas, mutations, offline sync to kräva fast post eller ÄTA för Fast-tid.
- Regression test payroll export remains unchanged.

**Dependencies:** EPIC 41, EPIC 42.  
**Acceptance Criteria**
- Users can create both billing types; Fast kräver fast post eller ÄTA innan sparning.
- Offline entries sync with korrekt koppling (fast post eller ÄTA) beroende på val.
- Payroll export data matches previous totals.

---

## EPIC 44 – ÄTA Billing-Type Enhancements

**Scope**
- Extend ÄTA creation/edit forms with Löpande/Fast controls and validation.
- Persist `billing_type` and `fixed_amount_sek` through API routes.
- Update detail/list views with billing badges and amount display.
- Ensure diary integration untouched.
- Add audit log coverage for billing changes.
- ÄTA som väljs i tidflöden ska synas i fakturaunderlagets Fast-delposter.

**Dependencies:** EPIC 41.  
**Acceptance Criteria**
- ÄTA Fast requires `fixed_amount_sek` + moms before save.
- UI surfaces badges for billing mode in lists and detail view.
- Invoice basis reflects Fast ÄTA as fixed amount rows.

---

## EPIC 45 – Invoice Basis Refresh & Validation

**Scope**
- Update `refreshInvoiceBasis` job to aggregate Fast time per `fixed_block_id`.
- Generate single invoice line per fixed block and per Fast ÄTA with correct metadata.
- Populate `validation_errors` when Fast time lacks block or Fast ÄTA lacks amount; set `exportable=false`.
- Adjust totals to provide Löpande vs Fast subtotals.
- Add unit tests covering both billing modes.

**Dependencies:** EPIC 41, EPIC 42, EPIC 44.  
**Acceptance Criteria**
- Refresh job emits correct rows for both billing types.
- Validation errors block lock/export when requirements unmet.
- Test suite passes with new coverage.

---

## EPIC 46 – Lock UI, Export & Project Settings Updates

**Scope**
- Surface validation errors in invoice basis UI and block lock action until resolved.
- Display sections and totals per billing type with badges.
- Update project creation flow to require selecting billing mode (Fixed, Löpande, Both) and capture quoted project amount & hourly charge.
- Extend project billing settings with defaults and article/account mappings for four categories.
- Adjust Fortnox/Visma CSV generators: Fast rows exported with `qty=1`, `unitprice=amount`.
- Update documentation/help content.

**Dependencies:** EPIC 45.  
**Acceptance Criteria**
- Lock dialog prevents completion when validation errors exist.
- Invoice basis UI shows clear separation of Löpande vs Fast totals.
- New project wizard enforces billing-mode selection and persists quote/hourly defaults.
- CSV export matches new mapping rules and imports cleanly in Fortnox/Visma demo.

---

## EPIC 47 – End-to-End Validation & Mobile QA

**Scope**
- Execute E2E scenario: create Löpande & Fast time, ÄTA, lock invoice, export, import to Fortnox demo.
- Perform mobile UX QA on slider/block flows.
- Verify payroll exports unaffected.
- Document QA checklist, findings, and update release notes.

**Dependencies:** EPIC 43, EPIC 44, EPIC 46.  
**Acceptance Criteria**
- Playwright E2E test passes for full flow.
- Manual QA checklist signed off for web/mobile.
- Documented confirmation that Fortnox import succeeds without errors and payroll regression avoided.


