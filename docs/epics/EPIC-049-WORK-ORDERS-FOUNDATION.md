# EPIC 49: Work Orders Database Foundation

**Goal:** Establish database schema, migrations, and security policies for the work orders system

**Priority:** High  
**Estimated Effort:** 2-3 days  
**Dependencies:** EPIC 2 (Database schema), EPIC 3 (Projects), EPIC 4 (Users)

---

## User Stories

### US-49.1: As a developer, I need a complete work orders database schema

**Acceptance Criteria:**
- Given I am implementing the work orders system
- When the database migration runs
- Then it should drop and recreate the `work_orders` table with all PRD fields
- And create the `work_order_assignments` table for user assignments
- And add `work_order_id` FK to `diary_entries` table
- And all tables should have proper indexes for performance
- And Row Level Security policies should enforce org-based access
- And `updated_at` triggers should be added to all tables

### US-49.2: As a system, I need work order numbers to be auto-generated

**Acceptance Criteria:**
- Given I am creating a new work order
- When the work order is saved
- Then it should have a unique number in format WO-YYYY-NNN (e.g., WO-2025-001)
- And the number should be sequential per year
- And the number should be stored in `work_order_number` column

### US-49.3: As a user, I need proper access control for work orders

**Acceptance Criteria:**
- Given I am accessing work orders
- When I query the database
- Then I should only see work orders from my organization
- And admin/foreman can create/update/delete all work orders
- And workers can read and update their assigned work orders
- And all actions should be logged for audit purposes

---

## Tasks

### Database Schema - Work Orders Table

- [ ] Create migration file: `supabase/migrations/[timestamp]_work_orders_m1_schema.sql`
- [ ] Drop existing `work_orders` table (fresh start approach)
- [ ] Create new `work_orders` table with columns:
  - Core: `id`, `organization_id`, `project_id` (required), `customer_id` (nullable, default from project)
  - Identification: `work_order_number` (TEXT, unique), `title`, `description`
  - Status: `status` (PLANERAD, PÅGÅENDE, KLAR, FAKTURERAD, AVBOKAD), `priority` (LOW, NORMAL, HIGH, AKUT)
  - Planning: `planned_start_at`, `planned_end_at`, `actual_start_at`, `actual_end_at`, `all_day` (bool)
  - Type: `work_order_type` (PROJEKTBUNDEN, FRISTÅENDE) - M1: always PROJEKTBUNDEN
  - Location: `location_address`, `location_city`, `location_zip`, `location_lat`, `location_lng`, `door_code`, `location_notes`
  - Notes: `internal_notes`, `external_summary` (for invoice)
  - Metadata: `created_by_id`, `closed_by_id`, `closed_at`
  - Signature: `signature_blob_url` (TEXT, nullable)
  - Billing: `billing_type_override` (TEXT, nullable)
  - Timestamps: `created_at`, `updated_at`
- [ ] Add CHECK constraints for status and priority enums
- [ ] Add CHECK constraint: `planned_end_at > planned_start_at` (if both set)
- [ ] Create indexes:
  - `idx_work_orders_org_id` on `organization_id`
  - `idx_work_orders_project_id` on `project_id`
  - `idx_work_orders_customer_id` on `customer_id`
  - `idx_work_orders_status` on `status`
  - `idx_work_orders_priority` on `priority`
  - `idx_work_orders_planned_start_at` on `planned_start_at`
  - `idx_work_orders_planned_end_at` on `planned_end_at`
  - `idx_work_orders_created_at` on `created_at`
  - `idx_work_orders_number` on `work_order_number` (unique)
- [ ] Add foreign key constraints:
  - `organization_id` → `organizations(id)`
  - `project_id` → `projects(id)`
  - `customer_id` → `customers(id)` (nullable)
  - `created_by_id` → `profiles(id)`
  - `closed_by_id` → `profiles(id)` (nullable)

### Database Schema - Work Order Assignments Table

- [ ] Create `work_order_assignments` table with columns:
  - `id` (UUID, PK)
  - `work_order_id` (UUID, FK to work_orders)
  - `user_id` (UUID, FK to profiles)
  - `role` (TEXT, nullable - simple in M1)
  - `is_responsible` (BOOLEAN, default false)
  - `assignment_status` (TEXT, default 'TILLDELAD', CHECK: TILLDELAD, KLARMARKERAD)
  - `created_at`, `updated_at`
- [ ] Add UNIQUE constraint: `(work_order_id, user_id)`
- [ ] Create indexes:
  - `idx_work_order_assignments_work_order_id` on `work_order_id`
  - `idx_work_order_assignments_user_id` on `user_id`
  - `idx_work_order_assignments_responsible` on `(work_order_id, is_responsible)` WHERE `is_responsible = true`
- [ ] Add foreign key constraints:
  - `work_order_id` → `work_orders(id) ON DELETE CASCADE`
  - `user_id` → `profiles(id) ON DELETE CASCADE`

### Database Schema - Diary Entries Extension

- [ ] Add `work_order_id` column to `diary_entries` table (UUID, nullable)
- [ ] Add foreign key: `work_order_id` → `work_orders(id) ON DELETE SET NULL`
- [ ] Create index: `idx_diary_entries_work_order_id` on `work_order_id`

### Row Level Security Policies

- [ ] Create RLS policy for `work_orders` SELECT:
  - Users can read work orders from their organization
- [ ] Create RLS policy for `work_orders` INSERT:
  - Admin/foreman can create work orders in their organization
- [ ] Create RLS policy for `work_orders` UPDATE:
  - Admin/foreman can update all work orders in their organization
  - Workers can update work orders they are assigned to
- [ ] Create RLS policy for `work_orders` DELETE:
  - Admin/foreman can delete work orders in their organization
- [ ] Create RLS policies for `work_order_assignments` (same pattern as work_orders)
- [ ] Enable RLS on both tables

### Database Functions & Triggers

- [ ] Create function `generate_work_order_number()`:
  - Takes `organization_id` and `year` as parameters
  - Returns next sequential number (WO-YYYY-NNN)
  - Uses `work_order_number` sequence per org/year
- [ ] Create trigger `set_work_order_number`:
  - Fires BEFORE INSERT on `work_orders`
  - Calls `generate_work_order_number()` if `work_order_number` is NULL
- [ ] Create trigger `update_work_orders_updated_at`:
  - Fires BEFORE UPDATE on `work_orders`
  - Sets `updated_at = NOW()`
- [ ] Create trigger `update_work_order_assignments_updated_at`:
  - Fires BEFORE UPDATE on `work_order_assignments`
  - Sets `updated_at = NOW()`

### Migration Testing

- [ ] Test migration runs successfully on clean database
- [ ] Test migration handles existing `time_entries.work_order_id` FK (should remain valid)
- [ ] Test work order number generation (sequential, per year)
- [ ] Test RLS policies with different user roles
- [ ] Test foreign key constraints (cascade deletes, set null)

---

## Files Delivered

### Database
- `supabase/migrations/[timestamp]_work_orders_m1_schema.sql` (~400-500 lines)

---

## Success Criteria

✅ Migration runs successfully without errors  
✅ All RLS policies enforce proper access control  
✅ Work order numbers are generated correctly and sequentially  
✅ Foreign key constraints work as expected  
✅ Indexes improve query performance  
✅ Triggers update timestamps automatically  

---

## Dependencies

**Requires:**
- EPIC 2: Database schema and authentication
- EPIC 3: Projects management
- EPIC 4: User management with memberships
- Customers table (from customer registry EPIC)

**Enables:**
- EPIC 50: Work Orders API & Types
- EPIC 51: Work Orders UI

---

## Notes

- Fresh start approach: existing minimal `work_orders` table is dropped and recreated
- Work order numbers are unique per organization and year
- `time_entries` already has `work_order_id` FK - no changes needed
- `diary_entries` gets new `work_order_id` FK (nullable for backward compatibility)
- All timestamps stored in UTC

---

## Next Steps After Completion

1. Run migration in Supabase SQL Editor
2. Test RLS policies with different user roles
3. Verify work order number generation
4. Move to EPIC 50 (Work Orders API & Types)

