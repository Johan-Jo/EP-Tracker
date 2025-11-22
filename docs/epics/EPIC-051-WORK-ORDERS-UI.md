# EPIC 51: Work Orders UI - List & Detail Pages

**Goal:** Build work orders list page, detail page, and project tab integration

**Priority:** High  
**Estimated Effort:** 5-6 days  
**Dependencies:** EPIC 50 (Work Orders API & Types)

---

## User Stories

### US-51.1: As a planner, I want to see a list of all work orders with filters

**Acceptance Criteria:**
- Given I am a foreman or admin
- When I navigate to `/dashboard/work-orders`
- Then I should see a table/list of work orders
- And I should be able to filter by: date range, status, project, customer, assigned user
- And columns should show: WO-number, Title, Customer, Location (city), Project, Responsible, Planned date/time, Status
- And I should be able to click a row to open the detail page
- And I should see a "Create work order" button

### US-51.2: As a planner, I want to create a new work order from the list page

**Acceptance Criteria:**
- Given I am on the work orders list page
- When I click "Create work order"
- Then a modal/form should open
- And I should be able to fill in: title, project, customer, planned dates, location, assigned users
- And when I save, the work order should appear in the list
- And I should be redirected to the detail page

### US-51.3: As a planner, I want to view and edit work order details

**Acceptance Criteria:**
- Given I am viewing a work order detail page
- When I navigate to `/dashboard/work-orders/[id]`
- Then I should see tabs/sections: Allmänt, Kund & Plats, Planering & Resurser, Tid & Material, Bilder & Dokument, Avslut & Signatur
- And I should be able to edit fields (if I have permission)
- And I should see related time entries, diary entries, and images
- And I should be able to complete the work order with signature

### US-51.4: As a planner, I want to see work orders on the project detail page

**Acceptance Criteria:**
- Given I am viewing a project detail page
- When I click the "Arbetsorder" tab
- Then I should see all work orders for that project
- And I should see a "Skapa arbetsorder" button (pre-fills project + customer)
- And I should see quick stats: hours/material logged per work order

---

## Tasks

### Work Orders List Page

- [ ] Create `app/dashboard/work-orders/page.tsx` (server component)
  - [ ] Fetch work orders with filters from query params
  - [ ] Get user session and membership
  - [ ] Pass data to client component
- [ ] Create `app/dashboard/work-orders/work-orders-client.tsx` (client component)
  - [ ] State management for filters
  - [ ] React Query for data fetching
  - [ ] Render list component
- [ ] Create `components/work-orders/work-orders-list.tsx`
  - [ ] Table/list view with columns
  - [ ] Row click → navigate to detail page
  - [ ] Status badges with colors
  - [ ] Responsive design (mobile-friendly)
- [ ] Create `components/work-orders/work-order-filters.tsx`
  - [ ] Date range picker (planned_start_at)
  - [ ] Status dropdown (multi-select)
  - [ ] Project dropdown (searchable)
  - [ ] Customer dropdown (searchable)
  - [ ] Assigned user dropdown
  - [ ] Clear filters button
- [ ] Create `components/work-orders/work-order-table.tsx`
  - [ ] Table component with sorting
  - [ ] Columns: WO-number, Title, Customer, Location, Project, Responsible, Planned date/time, Status
  - [ ] Row actions (edit, delete, view)
  - [ ] Pagination or infinite scroll

### Work Order Detail Page

- [ ] Create `app/dashboard/work-orders/[id]/page.tsx` (server component)
  - [ ] Fetch work order by ID with all relations
  - [ ] Check access permissions
  - [ ] Pass data to client component
- [ ] Create `app/dashboard/work-orders/[id]/work-order-detail-client.tsx` (client component)
  - [ ] Tab navigation
  - [ ] State management for editing
  - [ ] React Query for data fetching/updating
- [ ] Create `components/work-orders/work-order-detail-header.tsx`
  - [ ] Work order number, title, status badge
  - [ ] Priority indicator
  - [ ] Actions: Edit, Delete, "Visa i planeringskalender"
- [ ] Create `components/work-orders/work-order-general-tab.tsx`
  - [ ] Title, project, customer (read-only or editable)
  - [ ] Status, priority dropdowns
  - [ ] Planned/actual dates (date-time pickers)
  - [ ] Description textarea
  - [ ] Work order type (read-only, M1: always PROJEKTBUNDEN)
- [ ] Create `components/work-orders/work-order-location-tab.tsx`
  - [ ] Contact person, phone, email (from customer)
  - [ ] Address fields (address, city, zip)
  - [ ] Door code, location notes
  - [ ] "Open in Maps" button (Google Maps link)
  - [ ] Location coordinates (lat/lng) if available
- [ ] Create `components/work-orders/work-order-planning-tab.tsx`
  - [ ] Assigned users multi-select (with avatars)
  - [ ] Responsible user selector (radio or checkbox)
  - [ ] Assignment status indicators
  - [ ] Link to planning calendar (scroll to work order event)
- [ ] Create `components/work-orders/work-order-time-tab.tsx`
  - [ ] Embedded time entries list (filtered by work_order_id)
  - [ ] Show: user, date, duration, project, notes
  - [ ] "Lägg till tid" button → opens time entry form (pre-filled with project + work order)
  - [ ] Total hours summary
- [ ] Create `components/work-orders/work-order-completion-tab.tsx`
  - [ ] "Vad har utförts?" textarea (external_summary)
  - [ ] "Jobbet klart?" checkbox
  - [ ] Customer signature canvas
  - [ ] Save button → sets status = KLAR, closed_at, closed_by_id
- [ ] Create `components/work-orders/work-order-signature.tsx`
  - [ ] Canvas component for signature drawing
  - [ ] Clear button
  - [ ] Save signature to blob URL or storage
  - [ ] Display existing signature if present

### Work Order Create/Edit Modal

- [ ] Create `components/work-orders/work-order-form.tsx`
  - [ ] Reusable form for create/edit
  - [ ] All PRD fields
  - [ ] Validation with Zod
  - [ ] React Hook Form integration
  - [ ] Submit handler (create or update)
- [ ] Create `components/work-orders/create-work-order-modal.tsx`
  - [ ] Modal wrapper
  - [ ] Uses work-order-form
  - [ ] Pre-fill project/customer if from project page
  - [ ] Pre-fill dates if from calendar

### Project Tab Integration

- [ ] Update `app/dashboard/projects/[id]/page.tsx`
  - [ ] Fetch work orders for project
  - [ ] Add "Arbetsorder" tab to tabs component
- [ ] Update `components/projects/project-detail-client.tsx`
  - [ ] Add work orders tab content
  - [ ] Reuse `components/work-orders/work-orders-list.tsx` with project filter
  - [ ] Show "Skapa arbetsorder" button (pre-fills project + customer)
  - [ ] Show quick stats: hours/material per work order

### Navigation Updates

- [ ] Update navigation component (likely in `app/dashboard/layout.tsx` or separate component)
  - [ ] Add "Arbetsorder" menu item
  - [ ] Place between "Projekt" and "Planering" in menu

### Images & Documents Section

- [ ] Create `components/work-orders/work-order-images-tab.tsx`
  - [ ] Image upload component
  - [ ] Display uploaded images
  - [ ] Show diary photos linked to work order
  - [ ] Image gallery with lightbox

---

## Files Delivered

### Pages
- `app/dashboard/work-orders/page.tsx` (~50-80 lines)
- `app/dashboard/work-orders/work-orders-client.tsx` (~100-150 lines)
- `app/dashboard/work-orders/[id]/page.tsx` (~50-80 lines)
- `app/dashboard/work-orders/[id]/work-order-detail-client.tsx` (~200-300 lines)

### Components
- `components/work-orders/work-orders-list.tsx` (~150-200 lines)
- `components/work-orders/work-order-filters.tsx` (~200-250 lines)
- `components/work-orders/work-order-table.tsx` (~150-200 lines)
- `components/work-orders/work-order-detail-header.tsx` (~80-120 lines)
- `components/work-orders/work-order-general-tab.tsx` (~150-200 lines)
- `components/work-orders/work-order-location-tab.tsx` (~150-200 lines)
- `components/work-orders/work-order-planning-tab.tsx` (~150-200 lines)
- `components/work-orders/work-order-time-tab.tsx` (~150-200 lines)
- `components/work-orders/work-order-completion-tab.tsx` (~150-200 lines)
- `components/work-orders/work-order-signature.tsx` (~100-150 lines)
- `components/work-orders/work-order-form.tsx` (~300-400 lines)
- `components/work-orders/create-work-order-modal.tsx` (~80-120 lines)
- `components/work-orders/work-order-images-tab.tsx` (~150-200 lines)

### Modified Files
- `app/dashboard/projects/[id]/page.tsx` (add work orders tab)
- `components/projects/project-detail-client.tsx` (add work orders tab content)
- Navigation component (add menu item)

**Total: ~2,000-3,000 lines of code**

---

## Success Criteria

✅ Work orders list page loads and displays correctly  
✅ Filters work correctly  
✅ Create work order modal opens and saves successfully  
✅ Work order detail page shows all tabs/sections  
✅ Edit functionality works (with proper permissions)  
✅ Signature canvas works and saves  
✅ Project tab shows work orders  
✅ Navigation menu includes "Arbetsorder"  
✅ All forms validate correctly  
✅ Responsive design works on mobile  

---

## Dependencies

**Requires:**
- EPIC 50: Work Orders API & Types
- shadcn/ui components (already in project)
- React Hook Form + Zod (already in project)

**Enables:**
- EPIC 52: Work Orders Planning Calendar Integration
- EPIC 54: Work Orders Integration

---

## Notes

- Reuse existing time entry form component (update to support work_order_id)
- Signature can be stored as blob URL or uploaded to Supabase Storage
- Images can be stored in Supabase Storage with work_order_id reference
- All date/time pickers should handle timezones correctly
- Mobile view should use card layout instead of table

---

## Next Steps After Completion

1. Test all UI flows manually
2. Verify permissions work correctly
3. Test on mobile devices
4. Move to EPIC 52 (Planning Calendar Integration)

