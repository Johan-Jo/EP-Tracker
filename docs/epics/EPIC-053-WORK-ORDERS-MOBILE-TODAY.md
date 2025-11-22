# EPIC 53: Work Orders Mobile "Today" View

**Goal:** Build mobile-optimized "Mina arbetsorder idag" view for field workers

**Priority:** High  
**Estimated Effort:** 3-4 days  
**Dependencies:** EPIC 50 (Work Orders API & Types), EPIC 24 (Mobile Today - existing)

---

## User Stories

### US-53.1: As a field worker, I want to see my work orders for today

**Acceptance Criteria:**
- Given I am a field worker
- When I navigate to `/dashboard/work-orders/today` (or mobile menu)
- Then I should see a list of work orders where I am assigned
- And `planned_start_at` is today OR status is PÅGÅENDE
- And each card should show: time span, customer name + address, short description, status
- And the list should be optimized for mobile (card layout, large touch targets)

### US-53.2: As a field worker, I want to start a work order job

**Acceptance Criteria:**
- Given I am viewing my work orders for today
- When I click "Starta jobb" on a work order
- Then `actual_start_at` should be set (if not already set)
- And a time entry form should open (pre-filled with project + work order)
- And I should be able to start time tracking immediately
- And the work order status should change to PÅGÅENDE

### US-53.3: As a field worker, I want to open work order details from the today view

**Acceptance Criteria:**
- Given I am viewing my work orders for today
- When I click "Öppna" on a work order card
- Then the work order detail page should open
- And I should see all information: location, customer contact, description, etc.
- And I should be able to complete the work order (signature, "Vad har utförts?")

### US-53.4: As a field worker, I want to navigate to the work location

**Acceptance Criteria:**
- Given I am viewing a work order card
- When I click "Navigera" or address
- Then Google Maps (or Maps app) should open with the work location
- And the address should be pre-filled in the navigation

---

## Tasks

### Mobile Today Page

- [ ] Create `app/dashboard/work-orders/today/page.tsx` (server component)
  - [ ] Get current user session
  - [ ] Calculate today's date (consider timezone)
  - [ ] Fetch work orders for today (via API or direct query)
  - [ ] Pass data to client component
- [ ] Create `app/dashboard/work-orders/today/today-client.tsx` (client component)
  - [ ] React Query for data fetching
  - [ ] Refresh on pull-to-refresh (mobile)
  - [ ] Render work order cards
  - [ ] Handle "Start job" action
  - [ ] Handle navigation to detail page

### Work Order Today Card Component

- [ ] Create `components/work-orders/work-order-today-card.tsx`
  - [ ] Card layout optimized for mobile
  - [ ] Display: WO-number, title, time span (planned_start_at - planned_end_at)
  - [ ] Display: customer name, address (city, street)
  - [ ] Display: short description (truncated)
  - [ ] Display: status badge
  - [ ] Actions: "Öppna" button, "Starta jobb" button
  - [ ] "Navigera" button (opens Maps with address)
  - [ ] Touch-friendly (large buttons, good spacing)
  - [ ] Responsive design (works on small screens)

### Start Job Functionality

- [ ] Create `components/work-orders/work-order-start-button.tsx`
  - [ ] Button component
  - [ ] Click handler:
    - [ ] PATCH work order: set `actual_start_at = NOW()` if null
    - [ ] Update status to PÅGÅENDE if PLANERAD
    - [ ] Open time entry form (pre-filled with project + work order)
  - [ ] Loading state during API call
  - [ ] Error handling
- [ ] Update time entry form to support work order pre-fill
  - [ ] Accept `work_order_id` as prop
  - [ ] Pre-fill project_id from work order
  - [ ] Pre-fill work_order_id
  - [ ] Pre-fill start_at with current time

### Navigation Integration

- [ ] Add "Navigera" button to work order card
  - [ ] Generate Google Maps URL with address
  - [ ] Or use device Maps app (mobile)
  - [ ] Handle missing address gracefully
- [ ] Format address correctly for Maps
  - [ ] Combine: address + city + zip
  - [ ] URL encode for Maps link

### Mobile Menu Integration

- [ ] Update mobile navigation (if exists)
  - [ ] Add "Mina arbetsorder idag" menu item
  - [ ] Or integrate into existing "Today" view (if EPIC 24 exists)
- [ ] Consider combining with existing mobile today view
  - [ ] Show both assignments and work orders
  - [ ] Or separate tabs/sections

### Pull-to-Refresh & Offline Support

- [ ] Implement pull-to-refresh (mobile)
  - [ ] Use React Query refetch
  - [ ] Show loading indicator
- [ ] Consider offline support (if needed)
  - [ ] Cache work orders in IndexedDB
  - [ ] Show cached data when offline
  - [ ] Sync when back online

### Status Updates

- [ ] Update work order status automatically
  - [ ] When "Start job" clicked → PÅGÅENDE
  - [ ] When time entry created → keep PÅGÅENDE
  - [ ] When work order completed → KLAR
- [ ] Show status changes in real-time (if using real-time subscriptions)

---

## Files Delivered

### Pages
- `app/dashboard/work-orders/today/page.tsx` (~50-80 lines)
- `app/dashboard/work-orders/today/today-client.tsx` (~150-200 lines)

### Components
- `components/work-orders/work-order-today-card.tsx` (~200-250 lines)
- `components/work-orders/work-order-start-button.tsx` (~100-150 lines)

### Modified Files
- `components/time/time-entry-form.tsx` (add work_order_id pre-fill support)
- Mobile navigation component (add menu item, if exists)

**Total: ~500-680 lines of code**

---

## Success Criteria

✅ Mobile today page loads and displays work orders  
✅ Work orders are filtered correctly (today or PÅGÅENDE)  
✅ "Start job" sets actual_start_at and opens time entry form  
✅ "Öppna" navigates to work order detail page  
✅ "Navigera" opens Maps with correct address  
✅ Cards are touch-friendly and responsive  
✅ Pull-to-refresh works  
✅ Offline support works (if implemented)  

---

## Dependencies

**Requires:**
- EPIC 50: Work Orders API & Types
- EPIC 24: Mobile Today (existing, for reference)
- Time entry form component

**Enables:**
- Field workers can use work orders on mobile

---

## Notes

- Mobile-first design (card layout, large touch targets)
- Consider combining with existing mobile today view (assignments + work orders)
- Google Maps links work on both iOS and Android
- Time entry form should be mobile-optimized
- Consider PWA offline support for work orders

---

## Next Steps After Completion

1. Test on real mobile devices
2. Test offline functionality
3. Gather user feedback
4. Move to EPIC 54 (Integration with Time, Diary, ÄTA, Invoice)

