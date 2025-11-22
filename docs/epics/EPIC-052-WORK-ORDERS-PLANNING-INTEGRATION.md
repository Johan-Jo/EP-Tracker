# EPIC 52: Work Orders Planning Calendar Integration

**Goal:** Integrate work orders into the planning calendar with drag-and-drop, create from calendar, and resource view

**Priority:** High  
**Estimated Effort:** 4-5 days  
**Dependencies:** EPIC 51 (Work Orders UI), EPIC 22-24 (Planning System)

---

## User Stories

### US-52.1: As a planner, I want to see work orders in the planning calendar

**Acceptance Criteria:**
- Given I am viewing the planning calendar
- When I look at the org view or resource view
- Then I should see work orders as calendar events
- And each event should show: WO-number, title, customer, responsible user
- And events should be color-coded by status (blue=PLANERAD, yellow=PÅGÅENDE, green=KLAR, red=AKUT)
- And events should span from `planned_start_at` to `planned_end_at`

### US-52.2: As a planner, I want to create work orders directly from the calendar

**Acceptance Criteria:**
- Given I am viewing the planning calendar
- When I drag to select a time slot (or click and drag)
- Then a modal should open "Create Work Order"
- And the selected time range should be pre-filled as planned dates
- And if I'm in resource view, the user should be pre-selected
- And I should be able to fill in: customer, project, title, location
- And when I save, the work order should appear in the calendar immediately

### US-52.3: As a planner, I want to update work order scheduling via drag-and-drop

**Acceptance Criteria:**
- Given I am viewing the planning calendar
- When I drag a work order event to a different time
- Then the `planned_start_at` and `planned_end_at` should update
- And the change should be saved automatically
- And I should see a loading indicator during save
- And if the save fails, the event should revert to original position

### US-52.4: As a planner, I want to reassign work orders between users

**Acceptance Criteria:**
- Given I am viewing the resource view in planning calendar
- When I drag a work order event to a different user row
- Then the work order assignments should update
- And the responsible user should change (or assignment added)
- And the event should move to the new user's row

### US-52.5: As a planner, I want to open work order details from the calendar

**Acceptance Criteria:**
- Given I am viewing the planning calendar
- When I click or double-click on a work order event
- Then the work order detail page should open
- And it should open in a new tab or panel (configurable)

---

## Tasks

### Planning API Updates

- [ ] Update `app/api/planning/route.ts`
  - [ ] Include work orders in response alongside assignments
  - [ ] Fetch work orders for week range (planned_start_at between week start/end)
  - [ ] Include relations: project, customer, assignments (with users)
  - [ ] Filter by organization
  - [ ] Support project_id and user_id filters (for work orders)
  - [ ] Return work orders in `work_orders` array in response

### Planning Calendar Component Updates

- [ ] Update `components/planning/week-schedule-view.tsx`
  - [ ] Render work orders alongside assignments
  - [ ] Create work order event component
  - [ ] Handle drag-and-drop for work orders
  - [ ] Support both org view and resource view
- [ ] Create `components/planning/work-order-event.tsx`
  - [ ] Calendar event component for work orders
  - [ ] Display: WO-number, title (truncated), customer name
  - [ ] Show assigned users (avatar stack or initials)
  - [ ] Color-code by status
  - [ ] Click handler → open detail page
  - [ ] Drag handlers for time and user changes
- [ ] Update `components/planning/planning-page-client.tsx`
  - [ ] Include work orders in React Query data
  - [ ] Handle work order drag-and-drop mutations
  - [ ] Optimistic updates for work order moves

### Create Work Order from Calendar

- [ ] Create `components/planning/create-work-order-modal.tsx`
  - [ ] Modal triggered by calendar time selection
  - [ ] Pre-fill: planned_start_at, planned_end_at, assigned user (if in resource view)
  - [ ] Form fields: customer (search), project (search), title, location
  - [ ] Save → create work order + assignments
  - [ ] Close modal and refresh calendar
- [ ] Update `components/planning/week-schedule-view.tsx`
  - [ ] Add time selection handler (drag to select)
  - [ ] Open create work order modal
  - [ ] Pass selected time range and user to modal

### Drag-and-Drop Implementation

- [ ] Implement drag handlers in `work-order-event.tsx`
  - [ ] Detect drag start (time change)
  - [ ] Detect drag end (time change or user change)
  - [ ] Calculate new planned_start_at/planned_end_at
  - [ ] Calculate new assigned user (if dragged to different row)
- [ ] Create drag-and-drop mutation
  - [ ] PATCH `/api/work-orders/[id]` with new dates
  - [ ] POST/DELETE `/api/work-orders/[id]/assignments` if user changed
  - [ ] Optimistic update in UI
  - [ ] Error handling with revert on failure
- [ ] Use existing drag library (react-beautiful-dnd, dnd-kit, or native HTML5)

### Work Order API Updates for Drag-and-Drop

- [ ] Update `app/api/work-orders/[id]/route.ts` PATCH handler
  - [ ] Support partial updates (only planned_start_at/planned_end_at)
  - [ ] Validate new dates (end > start)
  - [ ] Return updated work order
- [ ] Ensure assignment updates work correctly
  - [ ] POST to add assignment
  - [ ] DELETE to remove assignment
  - [ ] Handle responsible user changes

### Calendar Event Styling

- [ ] Style work order events differently from assignments
  - [ ] Different border style or icon
  - [ ] Status color coding
  - [ ] Hover effects
  - [ ] Selected state
- [ ] Ensure events don't overlap visually
  - [ ] Stack events if same time
  - [ ] Show count if too many to display

### Link from Work Order Detail to Calendar

- [ ] Update `components/work-orders/work-order-detail-header.tsx`
  - [ ] Add "Visa i planeringskalender" button
  - [ ] Navigate to planning page with date filter
  - [ ] Scroll to work order event (if possible)
  - [ ] Highlight the work order event

---

## Files Delivered

### Modified Files
- `app/api/planning/route.ts` (add work orders to response)
- `components/planning/week-schedule-view.tsx` (render work orders)
- `components/planning/planning-page-client.tsx` (handle work order mutations)

### New Components
- `components/planning/work-order-event.tsx` (~200-250 lines)
- `components/planning/create-work-order-modal.tsx` (~150-200 lines)

**Total: ~500-700 lines of code (mostly modifications)**

---

## Success Criteria

✅ Work orders appear in planning calendar  
✅ Work orders are color-coded by status  
✅ Create work order from calendar works  
✅ Drag-and-drop updates work order dates  
✅ Drag between users updates assignments  
✅ Click event opens work order detail  
✅ Calendar performance is acceptable (< 500ms render)  
✅ Optimistic updates work smoothly  

---

## Dependencies

**Requires:**
- EPIC 51: Work Orders UI
- EPIC 22: Planning Foundation
- EPIC 23: Planning UI
- Drag-and-drop library (or native implementation)

**Enables:**
- Full planning workflow with work orders

---

## Notes

- Work orders and assignments can coexist in calendar (different visual styles)
- Drag-and-drop should be smooth and responsive
- Consider using a drag library for better UX (dnd-kit recommended for React)
- Calendar should handle many work orders efficiently (virtualization if needed)
- Time zone handling is critical (all dates in UTC, convert for display)

---

## Next Steps After Completion

1. Test drag-and-drop thoroughly
2. Verify calendar performance with many work orders
3. Test on mobile (if calendar is mobile-accessible)
4. Move to EPIC 53 (Mobile "Today" View)

