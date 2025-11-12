# EPIC 22: Planning System Foundation

**Goal:** Establish database schema, API routes, and core types for the planning and scheduling system

**Priority:** High  
**Estimated Effort:** 3-4 days  
**Dependencies:** EPIC 1-5 (Projects, Users, Auth)

---

## User Stories

### US-22.1: As a planner, I need a database structure to store work assignments and schedules

**Acceptance Criteria:**
- Given I am creating the planning system
- When the database migration runs
- Then it should create `assignments`, `absences`, `shift_templates`, and `mobile_notes` tables
- And extend the `projects` table with `color` and `daily_capacity_need` columns
- And all tables should have proper indexes for performance
- And Row Level Security policies should enforce org-based access

### US-22.2: As a developer, I need TypeScript types and validation schemas for planning entities

**Acceptance Criteria:**
- Given I am building planning features
- When I import from `lib/schemas/planning.ts`
- Then I should have Zod schemas for assignments, absences, conflicts, and mobile check-ins
- And TypeScript types for all planning entities with relations
- And validation messages should be in Swedish
- And schemas should support multi-user assignment creation

### US-22.3: As a planner, I need API endpoints to fetch weekly planning data

**Acceptance Criteria:**
- Given I am viewing the planning page
- When I call `GET /api/planning?week=YYYY-WW`
- Then it should return resources (users), projects, assignments, and absences for that week
- And data should be filtered by my organization
- And timestamps should be in UTC
- And the response time should be < 500ms

### US-22.4: As a planner, I need API endpoints to create and manage assignments

**Acceptance Criteria:**
- Given I am creating work assignments
- When I call `POST /api/assignments` with valid data
- Then it should create assignments for all specified users
- And return 201 with created assignment IDs on success
- And return 409 with conflict details if overlaps or absences exist
- And support force override with mandatory comment (admin/foreman only)
- And log all actions to audit_log

---

## Tasks

### Database Schema

- [ ] Create migration file: `supabase/migrations/20241023000001_planning_system.sql`
- [ ] Define `assignments` table with columns: id, org_id, project_id, user_id, start_ts, end_ts, all_day, status, address, note, sync_to_mobile
- [ ] Define `absences` table with columns: id, org_id, user_id, type (vacation/sick/training), start_ts, end_ts, note
- [ ] Define `shift_templates` table with columns: id, org_id, label, start_time, end_time, days_of_week[], is_default
- [ ] Define `mobile_notes` table with columns: id, assignment_id, content, pinned
- [ ] Add `color TEXT` and `daily_capacity_need INT` to `projects` table
- [ ] Create indexes: `assignments(user_id, start_ts, end_ts)`, `assignments(project_id)`, `absences(user_id, start_ts, end_ts)`
- [ ] Implement RLS policies for all new tables (org-based, role-based for create/update)
- [ ] Add updated_at triggers for all new tables

### TypeScript Types & Schemas

- [ ] Create `lib/schemas/planning.ts`
- [ ] Define Zod schemas: assignmentSchema, createAssignmentSchema (with user_ids[]), updateAssignmentSchema
- [ ] Define Zod schemas: absenceSchema, mobileCheckinSchema, conflictSchema, shiftTemplateSchema
- [ ] Define TypeScript types: Assignment, AssignmentWithRelations, Absence, Conflict, WeekPlanningData
- [ ] Add Swedish validation messages to all schemas
- [ ] Support force override with override_comment in createAssignmentSchema

### API Routes - Planning Data

- [ ] Create `app/api/planning/route.ts`
- [ ] Implement GET handler with week parameter (YYYY-WW or ISO date)
- [ ] Parse week parameter and calculate week start/end dates
- [ ] Fetch resources (memberships + profiles) for user's org
- [ ] Fetch active projects for user's org
- [ ] Fetch assignments for week range
- [ ] Fetch absences overlapping with week range
- [ ] Return combined WeekPlanningData structure
- [ ] Add query param filters: project_id, user_id

### API Routes - Assignments CRUD

- [ ] Create `app/api/assignments/route.ts`
- [ ] Implement GET with filters (project_id, user_id, status, date range)
- [ ] Implement POST with multi-assign support (user_ids array)
- [ ] Add server-side conflict detection in POST:
  - [ ] Check for overlapping assignments using date range overlap
  - [ ] Check for absences during assignment period
  - [ ] Return 409 with conflicts array if found
- [ ] Support force override with mandatory comment
- [ ] Log override actions to audit_log
- [ ] Create `app/api/assignments/[id]/route.ts`
- [ ] Implement PATCH for updating assignments
- [ ] Implement DELETE for removing assignments
- [ ] Add permission checks (admin/foreman can manage all, workers only own)

### API Routes - Absences

- [ ] Create `app/api/absences/route.ts`
- [ ] Implement GET with filters (user_id, type, date range)
- [ ] Use date overlap query for filtering
- [ ] Implement POST for creating absences
- [ ] Add role check: admin/foreman for anyone, workers for self only
- [ ] Validate absence doesn't conflict with existing absences

### API Routes - Mobile Today & Check-ins

- [ ] Create `app/api/mobile/today/route.ts`
- [ ] Implement GET to fetch today's assignments for authenticated user
- [ ] Calculate today based on user's timezone (query param)
- [ ] Include mobile_notes in response
- [ ] Return sync metadata (last_updated timestamp)
- [ ] Create `app/api/mobile/checkins/route.ts`
- [ ] Implement POST for check-in/check-out events
- [ ] Add idempotency check (prevent duplicates within 1 minute)
- [ ] Update assignment status on check-in (planned → in_progress)
- [ ] Update assignment status on check-out (in_progress → done)
- [ ] Log all check-in/out events to audit_log

### Utilities

- [ ] Create `lib/utils/conflict-detection.ts`
- [ ] Implement `detectConflicts()` function using date-fns areIntervalsOverlapping
- [ ] Implement `detectMultiUserConflicts()` for batch checking
- [ ] Add helper functions: formatTimeRange, formatDateRange, formatAbsenceType

---

## Testing

### Unit Tests
- [ ] Test Zod schemas with valid and invalid data
- [ ] Test conflict detection utility with various overlap scenarios
- [ ] Test date range calculations in planning API

### API Tests
- [ ] Test GET /api/planning returns correct week data
- [ ] Test POST /api/assignments creates multiple assignments
- [ ] Test POST /api/assignments returns 409 on conflicts
- [ ] Test force override with comment logs to audit_log
- [ ] Test GET /api/mobile/today returns only user's assignments
- [ ] Test POST /api/mobile/checkins updates assignment status
- [ ] Test idempotency of check-in endpoint

### Integration Tests
- [ ] Test full assignment creation flow with conflict detection
- [ ] Test absence blocking assignment creation
- [ ] Test mobile check-in flow updates database correctly

---

## Files Delivered

### Database
- `supabase/migrations/20241023000001_planning_system.sql` (~220 lines)

### Schemas & Types
- `lib/schemas/planning.ts` (~350 lines)

### API Routes
- `app/api/planning/route.ts` (~150 lines)
- `app/api/assignments/route.ts` (~180 lines)
- `app/api/assignments/[id]/route.ts` (~120 lines)
- `app/api/absences/route.ts` (~130 lines)
- `app/api/mobile/today/route.ts` (~70 lines)
- `app/api/mobile/checkins/route.ts` (~100 lines)

### Utilities
- `lib/utils/conflict-detection.ts` (~120 lines)

**Total: ~1,440 lines of code**

---

## Success Criteria

✅ Database migration runs successfully without errors  
✅ All RLS policies enforce proper access control  
✅ GET /api/planning returns week data in < 500ms  
✅ POST /api/assignments detects conflicts correctly  
✅ Mobile check-in updates assignment status  
✅ TypeScript compiles with 0 errors (strict mode)  
✅ All API endpoints return proper error codes (400, 401, 403, 409, 500)  

---

## Dependencies

**Requires:**
- EPIC 2: Database schema and authentication
- EPIC 3: Projects management
- EPIC 4: User management with memberships

**Enables:**
- EPIC 23: Planning UI (week grid view)
- EPIC 24: Mobile today list and check-ins

---

## Notes

- All timestamps stored in UTC, converted to local time in UI
- Conflict detection happens both client-side (instant feedback) and server-side (authoritative)
- Multi-assign creates one assignment row per user (not shared)
- Absences take priority over assignments (must be overridden)
- Check-ins are idempotent (safe to retry)

---

## Next Steps After Completion

1. Run migration in Supabase SQL Editor
2. Test all API endpoints with Postman/Thunder Client
3. Verify RLS policies with different user roles
4. Move to EPIC 23 (Planning UI components)

