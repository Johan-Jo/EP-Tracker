# Work Orders Feature - Branch Information

## Branch: `feature/work-orders`

The work orders feature has been moved to a separate branch to keep it out of production until it's ready.

### What's in the branch:
- Work orders API routes (`app/api/work-orders/`)
- Work orders UI components (`components/work-orders/`)
- Work orders dashboard pages (`app/dashboard/work-orders/`)
- Work order schemas (`lib/schemas/work-order.ts`)
- Work orders migration (`supabase/migrations/20250203000001_work_orders_m1_schema.sql`)
- Work orders documentation (`docs/epics/EPIC-049*` through `EPIC-054*`)

### What was removed from main:
- `work_order_id` column from `time_entries` table (via migration)
- `work_order_id` column from `diary_entries` table (via migration)
- All `work_order_id` references from API routes
- All `work_order_id` references from schemas
- All `work_order_id` references from components

### To restore work orders later:
1. Merge `feature/work-orders` branch into main
2. Apply the work orders migration
3. Re-add `work_order_id` column to `time_entries` and `diary_entries` tables

### Current status:
- ✅ Database: Work orders tables removed from production
- ✅ API: All work_order_id references removed
- ✅ Frontend: All work_order_id references removed
- ✅ Branch: Work orders code preserved in `feature/work-orders`

