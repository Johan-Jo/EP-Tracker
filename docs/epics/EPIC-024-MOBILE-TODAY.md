# EPIC 24: Mobile Today List & Check-In/Out

**Goal:** Build mobile-optimized today screen with job cards, check-in/out functionality, and offline support

**Priority:** High  
**Estimated Effort:** 2-3 days  
**Dependencies:** EPIC 22 (Planning Foundation)

---

## User Stories

### US-24.1: As a field worker, I want to see my assignments for today on mobile

**Acceptance Criteria:**
- Given I am a field worker
- When I navigate to `/planning/today`
- Then I should see a list of all my assignments for today
- And each assignment should show project name, customer, time, address, and status
- And assignments should be sorted by start time
- And if I have no assignments, I should see a friendly empty state
- And the page should work on mobile devices (320px+ width)

### US-24.2: As a field worker, I want to check in when I arrive at a job site

**Acceptance Criteria:**
- Given I have an assignment with status "Planerad"
- When I click the "Checka in" button
- Then the assignment status should change to "Pågående"
- And the check-in event should be logged with timestamp
- And I should see a success toast notification
- And the button should be disabled while processing
- And if offline, the check-in should queue for later sync

### US-24.3: As a field worker, I want to check out when I finish a job

**Acceptance Criteria:**
- Given I have an assignment with status "Pågående"
- When I click the "Checka ut" button
- Then the assignment status should change to "Klar"
- And the check-out event should be logged with timestamp
- And I should see a success toast notification
- And if offline, the check-out should queue for later sync

### US-24.4: As a field worker, I want to navigate to job sites using Google Maps

**Acceptance Criteria:**
- Given an assignment has an address
- When I click the "Navigera" button
- Then Google Maps should open in a new tab with the address
- And the map should show directions from my current location
- And the button should work on both mobile and desktop

### US-24.5: As a planner, I want to add pinned notes that field workers see on mobile

**Acceptance Criteria:**
- Given I am creating/editing an assignment
- When I add mobile notes marked as pinned
- Then field workers should see those notes prominently on the job card
- And notes should have a yellow/amber background for visibility
- And notes should be labeled "Viktig information"

---

## Tasks

### Mobile Components

- [ ] Create `components/planning/mobile-job-card.tsx`
  - [ ] Use shadcn Card component
  - [ ] Display project color as left border (4px)
  - [ ] Show project name (CardTitle) and customer (subtitle)
  - [ ] Display status badge (color-coded: blue=planned, orange=in_progress, green=done)
  - [ ] Show time with Clock icon
  - [ ] Show address with MapPin icon
  - [ ] Display pinned mobile_notes in amber alert box
  - [ ] Add "Navigera" button (opens Google Maps)
  - [ ] Add "Checka in" button (for status=planned)
  - [ ] Add "Checka ut" button (for status=in_progress)
  - [ ] Show loading state on buttons during mutation

- [ ] Create `components/planning/mobile-today-screen.tsx`
  - [ ] Use React Query to fetch data: `useQuery(['mobile-today'])`
  - [ ] Call GET /api/mobile/today
  - [ ] Implement check-in mutation with POST /api/mobile/checkins
  - [ ] Implement check-out mutation with POST /api/mobile/checkins
  - [ ] Show loading spinner while fetching
  - [ ] Show error state with retry button
  - [ ] Display header with Calendar icon and "Dagens uppdrag"
  - [ ] Show formatted date (Swedish: "Måndag 23 Oktober")
  - [ ] Render job cards in space-y-4 layout
  - [ ] Show empty state if no assignments
  - [ ] Add toast notifications for success/error

### Page Integration

- [ ] Create `app/planning/today/page.tsx`
  - [ ] Server component with auth check
  - [ ] Require active membership
  - [ ] No role restriction (all users can access)
  - [ ] Render MobileTodayScreen client component

### Offline Support

- [ ] Extend `lib/db/offline-store.ts`
  - [ ] Add MobileCheckin interface (assignment_id, event, ts, synced)
  - [ ] Add PlanningToday interface (id, assignment_data, cached_at)
  - [ ] Add mobile_checkins table to Dexie schema
  - [ ] Add planning_today table to Dexie schema
  - [ ] Update version and stores configuration

- [ ] Create `lib/sync/mobile-checkin-sync.ts`
  - [ ] Implement queueCheckin() to save to IndexedDB
  - [ ] Implement syncCheckins() to process queue
  - [ ] Mark items as synced after successful POST
  - [ ] Handle errors and retry logic
  - [ ] Integrate with existing sync manager

### Mobile Navigation (Optional)

- [ ] Update `components/core/mobile-nav.tsx` (if exists)
  - [ ] Add "Today" nav item with Calendar icon
  - [ ] Link to `/planning/today`
  - [ ] Show for all user roles
  - [ ] Position prominently (first or second item)

---

## Testing

### Component Tests
- [ ] MobileJobCard renders all data correctly
- [ ] Check-in button disabled during mutation
- [ ] Navigate button opens Google Maps with correct URL
- [ ] Status badges show correct colors
- [ ] Pinned notes display in amber box

### Integration Tests
- [ ] MobileTodayScreen fetches today's assignments
- [ ] Check-in updates assignment status from planned to in_progress
- [ ] Check-out updates assignment status from in_progress to done
- [ ] Error handling shows toast notifications
- [ ] Empty state displays when no assignments

### E2E Tests (Playwright)
- [ ] Navigate to /planning/today as worker
- [ ] View list of today's assignments
- [ ] Click check-in button on planned assignment
- [ ] Verify status changes to "Pågående"
- [ ] Click check-out button on in-progress assignment
- [ ] Verify status changes to "Klar"
- [ ] Click navigate button and verify Google Maps opens

### Offline Tests
- [ ] Simulate offline mode
- [ ] Check-in queues to IndexedDB
- [ ] Go online and verify sync
- [ ] Check-in is idempotent (doesn't duplicate)

---

## Files Delivered

### Components
- `components/planning/mobile-job-card.tsx` (~150 lines)
- `components/planning/mobile-today-screen.tsx` (~140 lines)

### Pages
- `app/planning/today/page.tsx` (~20 lines)

### Offline Sync
- Updates to `lib/db/offline-store.ts` (+30 lines)
- `lib/sync/mobile-checkin-sync.ts` (~80 lines, if needed)

### Modified Files
- `components/core/mobile-nav.tsx` (add Today nav item, if exists)

**Total: ~420 lines of code**

---

## Success Criteria

✅ Today page accessible by all authenticated users  
✅ Shows only user's assignments for today  
✅ Check-in changes status to "Pågående"  
✅ Check-out changes status to "Klar"  
✅ Navigate button opens Google Maps correctly  
✅ Pinned notes display prominently  
✅ Empty state shows if no assignments  
✅ Works on mobile devices (320px+)  
✅ Check-ins work offline and sync when online  
✅ All text is in Swedish  
✅ Toast notifications show for success/error  

---

## Dependencies

**Requires:**
- EPIC 22: Planning Foundation (mobile APIs must be complete)
- shadcn/ui components: Card, Badge, Button
- sonner for toast notifications

**Enables:**
- Field workers can use the system on mobile
- Real-time job status tracking
- Offline work capability

---

## Mobile Design Notes

**Layout:**
- Max width: 2xl (672px) centered
- Padding: p-6 on all sides
- Cards: Full width with space-y-4 between
- Buttons: Full width or flex-1 for equal sizing

**Colors (Status):**
- Planerad (Planned): blue-100 bg, blue-700 text
- Pågående (In Progress): orange-100 bg, orange-700 text
- Klar (Done): green-100 bg, green-700 text

**Typography:**
- Header: text-2xl font-bold
- Date: text-muted-foreground, capitalize
- Project name: text-lg (CardTitle)
- Customer: text-sm text-muted-foreground
- Time/Address: text-sm

**Buttons:**
- Navigate: outline variant, Navigation icon
- Check-in: bg-green-600, LogIn icon
- Check-out: bg-blue-600, CheckCircle icon

**Empty State:**
- Calendar icon: w-16 h-16, opacity-50
- Text: "Inga uppdrag idag"
- Subtext: "Njut av din lediga dag! 🎉"

---

## Offline Strategy

**Queue Mechanism:**
1. Check-in/out attempt while offline
2. Save to IndexedDB mobile_checkins table
3. Show optimistic update in UI
4. When online, sync manager processes queue
5. POST to /api/mobile/checkins
6. Mark as synced on success
7. Revert UI on error

**Idempotency:**
- Server checks for duplicate check-ins within 1 minute
- Returns success if duplicate (safe to retry)
- Prevents double check-ins from sync retries

---

## Out of Scope (Future Enhancements)

❌ Time entry from mobile (link to /dashboard/time instead)  
❌ Materials entry from mobile (link to /dashboard/materials instead)  
❌ Push notifications for new assignments  
❌ GPS-based auto check-in (geo-fence)  
❌ Photo attachments on check-in/out  
❌ Signature capture for job completion  
❌ Sync conflict resolution UI  

---

## Next Steps After Completion

1. Test on real mobile devices (iOS and Android)
2. Test offline mode thoroughly (airplane mode)
3. Verify Google Maps navigation works
4. Test with various screen sizes (320px to 768px)
5. Seed test data with assignments for today
6. Complete manual testing checklist
7. Document mobile usage in user guide

