# EPIC 50: Work Orders API & Types

**Goal:** Build CRUD API routes and TypeScript schemas for work orders management

**Priority:** High  
**Estimated Effort:** 3-4 days  
**Dependencies:** EPIC 49 (Work Orders Foundation)

---

## User Stories

### US-50.1: As a developer, I need TypeScript types and validation schemas for work orders

**Acceptance Criteria:**
- Given I am building work order features
- When I import from `lib/schemas/work-order.ts`
- Then I should have Zod schemas for work orders and assignments
- And TypeScript types for all work order entities with relations
- And validation messages should be in Swedish
- And schemas should validate all PRD fields correctly

### US-50.2: As a planner, I need API endpoints to list and filter work orders

**Acceptance Criteria:**
- Given I am viewing the work orders list
- When I call `GET /api/work-orders` with filters
- Then it should return work orders from my organization
- And support filters: date range (planned_start_at), status, project, customer, assigned user
- And include related data: project, customer, assignments, responsible user
- And the response time should be < 500ms

### US-50.3: As a planner, I need API endpoints to create and manage work orders

**Acceptance Criteria:**
- Given I am creating a work order
- When I call `POST /api/work-orders` with valid data
- Then it should create the work order with auto-generated number
- And create work order assignments if users are specified
- And return 201 with created work order on success
- And return 400 with validation errors if data is invalid
- And log all actions to audit_log

### US-50.4: As a field worker, I need to see my work orders for today

**Acceptance Criteria:**
- Given I am a field worker
- When I call `GET /api/work-orders/today`
- Then it should return work orders where I am assigned
- And `planned_start_at` is today OR status is PÅGÅENDE
- And include location, customer, and time information
- And response should be optimized for mobile

---

## Tasks

### TypeScript Schemas & Types

- [ ] Create `lib/schemas/work-order.ts`
- [ ] Define `workOrderStatusSchema` enum: PLANERAD, PÅGÅENDE, KLAR, FAKTURERAD, AVBOKAD
- [ ] Define `workOrderPrioritySchema` enum: LOW, NORMAL, HIGH, AKUT
- [ ] Define `workOrderTypeSchema` enum: PROJEKTBUNDEN, FRISTÅENDE
- [ ] Define `workOrderAssignmentStatusSchema` enum: TILLDELAD, KLARMARKERAD
- [ ] Define `workOrderSchema` - Full validation with all PRD fields
- [ ] Define `createWorkOrderSchema` - For creation (omits generated fields like id, work_order_number, created_at)
- [ ] Define `updateWorkOrderSchema` - For updates (all fields optional except id)
- [ ] Define `workOrderAssignmentSchema` - For assignments
- [ ] Define `createWorkOrderAssignmentSchema` - For creating assignments
- [ ] Add Swedish validation messages to all schemas
- [ ] Define TypeScript types:
  - `WorkOrder` - Base type
  - `WorkOrderWithRelations` - With project, customer, assignments, created_by, etc.
  - `WorkOrderAssignment` - Assignment type
  - `WorkOrderStatus`, `WorkOrderPriority`, `WorkOrderType` - Enum types

### API Routes - Work Orders CRUD

- [ ] Create `app/api/work-orders/route.ts`
- [ ] Implement GET handler:
  - Parse query params: `start_date`, `end_date`, `status`, `project_id`, `customer_id`, `user_id` (assigned)
  - Filter by organization (from membership)
  - Join with projects, customers, assignments, profiles
  - Order by `planned_start_at` ASC (or configurable)
  - Support pagination (limit, offset)
  - Return work orders with relations
- [ ] Implement POST handler:
  - Validate request body with `createWorkOrderSchema`
  - Get organization from user membership
  - Generate work order number (via trigger or function)
  - Create work order in database
  - If `assignments` array provided, create `work_order_assignments`
  - Return 201 with created work order
  - Log action to audit_log
- [ ] Add permission checks (admin/foreman can create, workers cannot)

- [ ] Create `app/api/work-orders/[id]/route.ts`
- [ ] Implement GET handler:
  - Fetch work order by ID with all relations
  - Check organization access
  - Return 404 if not found or no access
- [ ] Implement PATCH handler:
  - Validate request body with `updateWorkOrderSchema`
  - Check organization access and permissions
  - Update work order fields
  - Handle status changes (e.g., KLAR → set closed_at, closed_by_id)
  - Return updated work order
  - Log action to audit_log
- [ ] Implement DELETE handler:
  - Check organization access and permissions (admin/foreman only)
  - Soft delete or hard delete (decide based on requirements)
  - Return 204 on success
  - Log action to audit_log

### API Routes - Work Order Assignments

- [ ] Create `app/api/work-orders/[id]/assignments/route.ts`
- [ ] Implement GET handler:
  - Fetch all assignments for work order
  - Include user profile data
  - Return assignments array
- [ ] Implement POST handler:
  - Validate request body (user_id, role, is_responsible)
  - Check work order exists and user has access
  - Create assignment (or update if exists)
  - Return 201 with created assignment
- [ ] Create `app/api/work-orders/[id]/assignments/[assignment_id]/route.ts`
- [ ] Implement DELETE handler:
  - Check access permissions
  - Delete assignment
  - Return 204 on success

### API Routes - Today's Work Orders

- [ ] Create `app/api/work-orders/today/route.ts`
- [ ] Implement GET handler:
  - Get current user from session
  - Calculate today's date (consider timezone from query param)
  - Fetch work orders where:
    - User is in `work_order_assignments`
    - AND (`planned_start_at::date = today` OR `status = 'PÅGÅENDE'`)
  - Include: project, customer, location, planned times
  - Order by `planned_start_at` ASC
  - Optimize for mobile (minimal data)
  - Return work orders array

### API Routes - Work Order Number Generation (Optional Helper)

- [ ] Create `app/api/work-orders/generate-number/route.ts`
- [ ] Implement GET handler:
  - Get organization from user membership
  - Get current year
  - Query next available number
  - Return `{ work_order_number: "WO-2025-001" }`
- [ ] This is optional - can be done client-side or via trigger

### Error Handling & Validation

- [ ] Add proper error responses (400, 401, 403, 404, 500)
- [ ] Validate all input with Zod schemas
- [ ] Return Swedish error messages
- [ ] Log errors to console/server logs
- [ ] Handle database constraint violations gracefully

---

## Files Delivered

### Schemas & Types
- `lib/schemas/work-order.ts` (~300-400 lines)

### API Routes
- `app/api/work-orders/route.ts` (~200-250 lines)
- `app/api/work-orders/[id]/route.ts` (~150-200 lines)
- `app/api/work-orders/[id]/assignments/route.ts` (~100-150 lines)
- `app/api/work-orders/[id]/assignments/[assignment_id]/route.ts` (~50-80 lines)
- `app/api/work-orders/today/route.ts` (~80-120 lines)
- `app/api/work-orders/generate-number/route.ts` (~40-60 lines, optional)

**Total: ~920-1,260 lines of code**

---

## Success Criteria

✅ All Zod schemas validate correctly  
✅ GET /api/work-orders returns filtered results in < 500ms  
✅ POST /api/work-orders creates work order with assignments  
✅ PATCH /api/work-orders/[id] updates work order correctly  
✅ GET /api/work-orders/today returns user's work orders  
✅ TypeScript compiles with 0 errors (strict mode)  
✅ All API endpoints return proper error codes  
✅ All actions are logged to audit_log  

---

## Dependencies

**Requires:**
- EPIC 49: Work Orders Database Foundation

**Enables:**
- EPIC 51: Work Orders UI
- EPIC 52: Work Orders Planning Calendar Integration
- EPIC 53: Work Orders Mobile "Today" View

---

## Notes

- Work order number generation can be done via database trigger (preferred) or API endpoint
- Assignments can be created during work order creation or separately
- Status changes trigger side effects (e.g., KLAR → set closed_at)
- All timestamps in UTC, converted to local time in UI
- Mobile "today" endpoint should be optimized for performance

---

## Next Steps After Completion

1. Test all API endpoints with Postman/Thunder Client
2. Verify validation works correctly
3. Test with different user roles
4. Move to EPIC 51 (Work Orders UI)

