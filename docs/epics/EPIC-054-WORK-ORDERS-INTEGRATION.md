# EPIC 54: Work Orders Integration - Time, Diary, ÄTA, Invoice

**Goal:** Integrate work orders with time entries, diary entries, ÄTA creation, and invoice generation

**Priority:** Medium  
**Estimated Effort:** 4-5 days  
**Dependencies:** EPIC 51 (Work Orders UI), Existing time/diary/ata/invoice features

---

## User Stories

### US-54.1: As a field worker, I want to log time against a work order

**Acceptance Criteria:**
- Given I am creating a time entry
- When I select a work order
- Then the time entry should be linked to that work order
- And the project should be pre-filled from the work order
- And the time entry should appear in the work order detail page
- And time entries should show work order ID/title in time lists

### US-54.2: As a field worker, I want to add diary entries linked to a work order

**Acceptance Criteria:**
- Given I am creating a diary entry
- When I select a work order (optional)
- Then the diary entry should be linked to that work order
- And the diary entry should appear in the work order detail page
- And diary photos should be shown in work order images section

### US-54.3: As a planner, I want to create an ÄTA from a work order

**Acceptance Criteria:**
- Given I am viewing a work order detail page
- When I click "Skapa ÄTA på detta jobb"
- Then an ÄTA creation form should open
- And the project should be pre-filled
- And the work order reference should be in the description
- And when saved, the ÄTA should be linked to the project

### US-54.4: As an accountant, I want to filter and group invoices by work order

**Acceptance Criteria:**
- Given I am generating invoice basis
- When I filter by work order
- Then I should see time entries and materials grouped by work order
- And I should see the work order's `external_summary` as invoice line description
- And I should be able to group invoice lines by work order

---

## Tasks

### Time Entries Integration

- [ ] Update `components/time/time-entry-form.tsx`
  - [ ] Ensure work_order_id field is visible and functional
  - [ ] When work_order_id selected, pre-fill project_id from work order
  - [ ] Show work order title/number in dropdown
  - [ ] Validate work_order_id belongs to selected project
- [ ] Update `components/time/time-entries-list.tsx`
  - [ ] Show work order ID/title in time entry rows
  - [ ] Add filter by work_order_id
  - [ ] Link work order ID to work order detail page
- [ ] Update `app/api/time/entries/route.ts`
  - [ ] Ensure work_order_id filtering works
  - [ ] Include work order in response (already done, verify)
- [ ] Update `components/work-orders/work-order-time-tab.tsx`
  - [ ] Display time entries linked to work order
  - [ ] Show summary: total hours, by user
  - [ ] "Lägg till tid" button opens time entry form (pre-filled)

### Diary Entries Integration

- [ ] Update `app/api/diary/route.ts`
  - [ ] Add work_order_id support in POST handler
  - [ ] Add work_order_id support in PATCH handler
  - [ ] Validate work_order_id belongs to project
- [ ] Update `components/diary/diary-form.tsx` (or equivalent)
  - [ ] Add work_order_id field (optional dropdown)
  - [ ] Filter work orders by selected project
  - [ ] Show work order title/number in dropdown
- [ ] Update `components/work-orders/work-order-detail-client.tsx`
  - [ ] Add "Dagbok" tab or section
  - [ ] Display diary entries linked to work order
  - [ ] Show diary photos in work order images section
- [ ] Update diary entry list/display components
  - [ ] Show work order ID/title if linked
  - [ ] Link to work order detail page

### ÄTA Integration

- [ ] Update `components/work-orders/work-order-detail-client.tsx`
  - [ ] Add "Skapa ÄTA på detta jobb" button (in appropriate tab)
  - [ ] Open ÄTA creation form/modal
  - [ ] Pre-fill: project_id from work order
  - [ ] Pre-fill: description with work order reference (e.g., "ÄTA för WO-2025-001: [work order title]")
- [ ] Update `app/api/ata/route.ts` (if needed)
  - [ ] Ensure project_id validation works
  - [ ] Support work order reference in description
- [ ] Update ÄTA list/display components
  - [ ] Show work order reference if in description
  - [ ] Link to work order if reference found

### Invoice Generation Integration

- [ ] Update `app/dashboard/invoice-basis/page.tsx`
  - [ ] Add work_order_id filter
  - [ ] Fetch work orders for organization
- [ ] Update `components/invoice/invoice-basis-client.tsx`
  - [ ] Add work order filter dropdown
  - [ ] Add "Group by work order" option
  - [ ] When grouped by work order:
    - [ ] Show work order number and title as group header
    - [ ] Show work order's `external_summary` as description
    - [ ] Group time entries and materials under work order
- [ ] Update invoice generation logic
  - [ ] Include work order external_summary in invoice lines
  - [ ] Format work order grouping correctly
  - [ ] Calculate totals per work order

### Work Order Completion & Invoice Flag

- [ ] Update work order completion flow
  - [ ] When work order marked as KLAR:
    - [ ] Set `external_summary` (required for invoicing)
    - [ ] Set `closed_at` and `closed_by_id`
    - [ ] Optionally set "Ready to invoice" flag (if separate from status)
- [ ] Add invoice status tracking (optional)
  - [ ] Add `invoiced_at` timestamp
  - [ ] Update status to FAKTURERAD when invoiced
  - [ ] Or keep separate invoice flag

### Data Validation & Consistency

- [ ] Ensure work_order_id validation
  - [ ] Work order must belong to selected project
  - [ ] Work order must be in user's organization
  - [ ] Work order must exist
- [ ] Handle work order deletion
  - [ ] Set work_order_id to NULL in time_entries (ON DELETE SET NULL)
  - [ ] Set work_order_id to NULL in diary_entries (ON DELETE SET NULL)
  - [ ] Show warning if work order has linked time/diary entries

---

## Files Delivered

### Modified Files
- `components/time/time-entry-form.tsx` (work_order_id support)
- `components/time/time-entries-list.tsx` (show work order, filter)
- `app/api/time/entries/route.ts` (verify work_order_id filtering)
- `components/work-orders/work-order-time-tab.tsx` (display time entries)
- `app/api/diary/route.ts` (add work_order_id support)
- `components/diary/diary-form.tsx` (add work_order_id field)
- `components/work-orders/work-order-detail-client.tsx` (add diary tab, ÄTA button)
- `app/dashboard/invoice-basis/page.tsx` (add work order filter)
- `components/invoice/invoice-basis-client.tsx` (add work order grouping)

**Total: ~800-1,200 lines of code (mostly modifications)**

---

## Success Criteria

✅ Time entries can be linked to work orders  
✅ Time entries appear in work order detail page  
✅ Diary entries can be linked to work orders  
✅ Diary entries appear in work order detail page  
✅ ÄTA can be created from work order  
✅ Invoice can be filtered/grouped by work order  
✅ Work order external_summary appears in invoice  
✅ All validations work correctly  
✅ Data consistency is maintained  

---

## Dependencies

**Requires:**
- EPIC 51: Work Orders UI
- Existing time entry system
- Existing diary entry system
- Existing ÄTA system
- Existing invoice generation system

**Enables:**
- Complete work order workflow from planning to invoicing

---

## Notes

- Work order ID is optional in time/diary entries (backward compatibility)
- Work order deletion should be handled carefully (cascade or set null)
- Invoice grouping by work order is optional feature
- External summary is critical for invoicing (make it required when completing)

---

## Next Steps After Completion

1. Test full workflow: create work order → log time → complete → invoice
2. Test data consistency
3. Verify all integrations work correctly
4. Document work order workflow for users

