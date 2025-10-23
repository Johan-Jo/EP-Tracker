# EPIC 23: Planning UI - Week Grid & Assignment Management

**Goal:** Build responsive week planner UI with resource grid, assignment cards, and conflict handling

**Priority:** High  
**Estimated Effort:** 4-5 days  
**Dependencies:** EPIC 22 (Planning Foundation)

---

## User Stories

### US-23.1: As a planner, I want to see a weekly grid view of all resources and their assignments

**Acceptance Criteria:**
- Given I am a foreman or admin
- When I navigate to `/planning`
- Then I should see a grid with resources (people) in rows and days (Mon-Sun) in columns
- And each resource should show their avatar, name, role, and status (available/busy/vacation)
- And assignment cards should appear in the appropriate day cells
- And I should be able to navigate between weeks using prev/next buttons
- And the current week number should be displayed

### US-23.2: As a planner, I want to create assignments by clicking on grid cells

**Acceptance Criteria:**
- Given I am viewing the planning grid
- When I click on any cell (person + day)
- Then a dialog should open with a form to create an assignment
- And the person and date should be pre-filled
- And I should be able to select project, time range, and add notes
- And when I save, the assignment should appear in the grid immediately
- And if there are conflicts, I should see a warning banner

### US-23.3: As a planner, I want to filter assignments by project

**Acceptance Criteria:**
- Given I am viewing the planning grid
- When I click on project filter chips
- Then the grid should show only assignments for selected projects
- And I should be able to select multiple projects
- And "Alla projekt" should show all assignments
- And the filter state should persist when navigating weeks

### US-23.4: As a planner, I want to see capacity indicators for each day

**Acceptance Criteria:**
- Given I am viewing the planning grid
- When I look above each day column
- Then I should see a capacity bar showing "assigned/needed"
- And the bar should be red if under-staffed (assigned < needed)
- And the bar should be green if adequately staffed (assigned >= needed)
- And the bar should be amber if over-staffed (assigned > needed)

### US-23.5: As a planner, I want to handle scheduling conflicts gracefully

**Acceptance Criteria:**
- Given I am creating an assignment
- When the person already has an assignment or absence during that time
- Then I should see a conflict banner with details
- And as admin/foreman, I should have an "Override" button
- And if I override, I must provide a comment explaining why
- And the override should be logged to audit_log

---

## Tasks

### Core Components

- [ ] Create `components/planning/person-row.tsx`
  - [ ] Display avatar with initials fallback
  - [ ] Show name (truncated), role (text-xs), status badge
  - [ ] Color-code status: available (green), busy (orange), vacation (blue)
  - [ ] Match Figma design: 200px width, 12px padding

- [ ] Create `components/planning/capacity-indicator.tsx`
  - [ ] Display day abbreviation and assigned/needed ratio
  - [ ] Show progress bar (h-2, rounded-full)
  - [ ] Color-code based on capacity: red (under), amber (over), green (at capacity)
  - [ ] Match Figma design spacing

- [ ] Create `components/planning/assignment-card.tsx`
  - [ ] Display project name, time, address
  - [ ] Add project color strip (4px left border)
  - [ ] Show drag handle icon on hover (GripVertical)
  - [ ] Add person count badge if > 1
  - [ ] Implement hover states (border-primary/50, shadow-md)
  - [ ] Match Figma design exactly

- [ ] Create `components/planning/project-chips.tsx`
  - [ ] Horizontal scrollable row
  - [ ] Each chip shows color dot + project name
  - [ ] "Alla projekt" chip first (no dot)
  - [ ] Implement multi-select toggle
  - [ ] Highlight selected chips (border-primary, bg-primary/10)

- [ ] Create `components/planning/add-assignment-dialog.tsx`
  - [ ] Use shadcn Dialog component
  - [ ] Form with React Hook Form + Zod validation
  - [ ] Fields: Project (select), Users (select), Date, All-day toggle, Start/End time, Address, Note, Sync to mobile
  - [ ] Pre-fill person and date if opened from grid cell
  - [ ] Show validation errors in Swedish
  - [ ] Disable time inputs if all-day is ON

- [ ] Create `components/planning/conflict-banner.tsx`
  - [ ] Use shadcn Alert component (variant="destructive")
  - [ ] Display list of conflicts with details
  - [ ] Show "Override" button for admin/foreman
  - [ ] Show "Cancel" button to close
  - [ ] Add X close button in top-right

### Main Grid View

- [ ] Create `components/planning/week-schedule-view.tsx`
  - [ ] Implement header section:
    - [ ] Title: "Veckoplanering" + subtitle "Vecka {week} • {year}"
    - [ ] "Lägg till uppdrag" button (shadow-lg, hover effects)
    - [ ] Project chips filter row
    - [ ] Search input with Search icon
    - [ ] Filter button (outline variant)
  - [ ] Implement week navigation bar:
    - [ ] ChevronLeft/Right buttons
    - [ ] Week date range display (format: "20–26 Oktober 2025")
    - [ ] 7-column capacity indicators grid
  - [ ] Implement schedule grid:
    - [ ] CSS Grid: `grid-cols-[200px_repeat(7,1fr)]`
    - [ ] Sticky header row with day labels + dates
    - [ ] Person rows with hover effect
    - [ ] Day cells (min-h-[80px], clickable, hover state)
    - [ ] Assignment cards in cells (space-y-2)
  - [ ] Calculate person status from assignments/absences
  - [ ] Group assignments by user and day
  - [ ] Calculate daily capacity (need vs assigned)

### Page Integration

- [ ] Create `app/planning/page.tsx`
  - [ ] Server component with auth check
  - [ ] Require admin/foreman/finance role
  - [ ] Redirect to dashboard if unauthorized

- [ ] Create `components/planning/planning-page-client.tsx`
  - [ ] React Query integration for data fetching
  - [ ] Fetch week planning data: `useQuery(['planning', week])`
  - [ ] Create assignment mutation with conflict handling
  - [ ] Handle 409 responses (show ConflictBanner)
  - [ ] Show loading state (Loader2 spinner)
  - [ ] Show error state with retry button
  - [ ] Pass data to WeekScheduleView

### Navigation Integration

- [ ] Update `components/core/sidebar.tsx`
  - [ ] Import Calendar icon from lucide-react
  - [ ] Add "Planering" nav item after "Projekt"
  - [ ] Set href to `/planning`
  - [ ] Set roles to `['admin', 'foreman', 'finance']`

- [ ] Create `components/planning/index.ts`
  - [ ] Export all planning components

---

## Testing

### Component Tests
- [ ] PersonRow renders with correct status colors
- [ ] CapacityIndicator shows correct color based on ratio
- [ ] AssignmentCard displays all data correctly
- [ ] ProjectChips toggle selection properly
- [ ] AddAssignmentDialog validates form inputs
- [ ] ConflictBanner displays conflicts and override option

### Integration Tests
- [ ] WeekScheduleView fetches and displays data
- [ ] Click cell opens dialog with pre-filled data
- [ ] Create assignment updates grid immediately
- [ ] Conflict detection shows banner on 409
- [ ] Week navigation refetches data
- [ ] Project filter updates visible assignments
- [ ] Search filters resources correctly

### E2E Tests (Playwright)
- [ ] Navigate to /planning as admin
- [ ] View week grid with resources
- [ ] Click cell and create assignment
- [ ] Filter by project
- [ ] Navigate to next/previous week
- [ ] Handle conflict (see banner, cancel)
- [ ] Override conflict with comment (admin only)

---

## Files Delivered

### Components
- `components/planning/person-row.tsx` (~70 lines)
- `components/planning/capacity-indicator.tsx` (~40 lines)
- `components/planning/assignment-card.tsx` (~90 lines)
- `components/planning/project-chips.tsx` (~60 lines)
- `components/planning/add-assignment-dialog.tsx` (~200 lines)
- `components/planning/conflict-banner.tsx` (~70 lines)
- `components/planning/week-schedule-view.tsx` (~300 lines)
- `components/planning/planning-page-client.tsx` (~120 lines)
- `components/planning/index.ts` (~10 lines)

### Pages
- `app/planning/page.tsx` (~25 lines)

### Modified Files
- `components/core/sidebar.tsx` (add Planning nav item)

**Total: ~985 lines of code**

---

## Success Criteria

✅ Planning page loads without errors for admin/foreman  
✅ Workers redirected to dashboard when accessing /planning  
✅ Week grid displays all resources and assignments correctly  
✅ Click cell opens dialog with pre-filled person and date  
✅ Create assignment shows in grid immediately (optimistic update)  
✅ Conflict detection shows banner with override option  
✅ Project filter works correctly  
✅ Week navigation updates data  
✅ Capacity indicators show correct colors  
✅ All text is in Swedish  
✅ Design matches Figma "Planering" screen  
✅ Responsive on desktop (1200px+ min-width)  

---

## Dependencies

**Requires:**
- EPIC 22: Planning Foundation (APIs and types must be complete)
- shadcn/ui components: Dialog, Alert, Badge, Avatar, Button, Input, Select, Switch, Textarea

**Enables:**
- EPIC 24: Mobile Today List (uses same API)
- Future: Drag-and-drop enhancements (dnd-kit integration)

---

## Design Notes

**Figma Reference:** "Planering" screen in EP-Tracker Inside pages

**Key Design Elements:**
- Left column: Fixed 200px width for resource info
- Grid cells: Minimum 80px height, expand with content
- Assignment cards: Compact with color strip, hover effects
- Capacity bars: 8px height, color-coded (red/amber/green)
- Project chips: Scrollable horizontal row with color dots
- Header: Sticky with backdrop-blur
- Week navigation: Centered with prev/next arrows

**Colors:**
- Available: green-100 bg, green-700 text
- Busy: orange-100 bg, orange-700 text
- Vacation: blue-100 bg, blue-700 text
- Under capacity: destructive (red)
- Over capacity: orange-500
- At capacity: green-500

---

## Out of Scope (Future Enhancements)

❌ Drag-and-drop (dnd-kit integration) - Phase 2  
❌ Absence overlay on grid - Phase 2  
❌ Absence management dialog - Phase 2  
❌ Multi-select users in dialog - Phase 2 (currently single-select)  
❌ Keyboard navigation - Phase 2  
❌ Grid virtualization (for 200+ users) - Phase 2  
❌ Week duplication feature - Phase 2  
❌ Shift templates UI - Phase 2  

---

## Next Steps After Completion

1. Manual test planning flow end-to-end
2. Test with different user roles (admin, foreman, worker)
3. Verify responsive behavior (minimum 1200px width)
4. Check conflict detection with overlapping assignments
5. Move to EPIC 24 (Mobile Today List)

