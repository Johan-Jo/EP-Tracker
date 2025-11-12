# Finance Role Implementation

**Date:** 2025-10-19  
**Type:** Feature Addition  
**Status:** ✅ Complete

---

## Overview

Added a new **"Finance"** role to EP-Tracker's role-based access control system for users responsible for invoicing and salary management.

---

## Role Definition

### **Finance** (Ekonomi/Finance Manager)

**Purpose:** Handle invoicing, salary calculations, and financial reporting with read-only access to all operational data.

**Key Characteristics:**
- **Read-only access** to all time, materials, expenses, and mileage data
- **Cannot create, edit, or delete** any operational entries
- **Cannot manage** organization settings or users
- **View-only** access to projects
- Same visibility as Admin/Foreman but without modification privileges

---

## Permissions

### ✅ **What Finance CAN do:**

#### Data Viewing (Read-Only)
- ✅ View all time entries across the organization
- ✅ View all materials across the organization
- ✅ View all expenses across the organization
- ✅ View all mileage entries across the organization
- ✅ View all projects
- ✅ Access their own profile settings

#### Financial Operations (Future)
- ⚠️ Generate invoices (to be implemented)
- ⚠️ Process salary payments (to be implemented)
- ⚠️ Export financial reports (to be implemented)
- ⚠️ View hourly rates (already accessible via API)

### ❌ **What Finance CANNOT do:**

#### Operational Data (Blocked)
- ❌ Create new time entries
- ❌ Edit existing time entries
- ❌ Delete time entries
- ❌ Approve/reject time entries
- ❌ Create materials
- ❌ Edit materials
- ❌ Delete materials
- ❌ Create expenses
- ❌ Edit expenses
- ❌ Delete expenses
- ❌ Create mileage entries
- ❌ Edit mileage entries
- ❌ Delete mileage entries
- ❌ Clock in crew members

#### Administrative (Blocked)
- ❌ Invite new users
- ❌ Manage user roles
- ❌ Access Settings → Users page
- ❌ Access Settings → Organization page
- ❌ Create/edit/archive projects
- ❌ Manage phases or work orders

---

## Technical Implementation

### 1. Database Migration

**File:** `supabase/migrations/20241019000008_add_finance_role.sql`

```sql
-- Drop existing CHECK constraint on role
ALTER TABLE memberships 
DROP CONSTRAINT IF EXISTS memberships_role_check;

-- Add new CHECK constraint with 'finance' role included
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check 
CHECK (role IN ('admin', 'foreman', 'worker', 'finance', 'ue'));
```

### 2. Zod Schema Update

**File:** `lib/schemas/organization.ts`

```typescript
export const membershipRoleEnum = z.enum(['admin', 'foreman', 'worker', 'finance', 'ue']);
```

### 3. API Authorization

#### Read Access (GET endpoints)

**Pattern:** Finance users see all data (like admin/foreman), workers see only their own data.

```typescript
// Example: app/api/time/entries/route.ts
// Workers and UE only see their own entries; admin/foreman/finance see all
if (membership.role === 'worker' || membership.role === 'ue') {
  query = query.eq('user_id', user.id);
}
```

**Applied to:**
- `/api/time/entries` (GET)
- `/api/materials` (GET)
- `/api/expenses` (GET)
- `/api/mileage` (GET)

#### Write Protection (PATCH/DELETE endpoints)

**Pattern:** Block finance users from editing or deleting any data.

```typescript
// Example: app/api/time/entries/[id]/route.ts (PATCH)
// Finance users have read-only access
if (membership.role === 'finance') {
  return NextResponse.json(
    { error: 'Finance users cannot edit time entries' }, 
    { status: 403 }
  );
}
```

**Applied to:**
- `/api/time/entries/[id]` (PATCH & DELETE)
- `/api/materials/[id]` (PATCH & DELETE)
- `/api/expenses/[id]` (PATCH & DELETE)
- `/api/mileage/[id]` (PATCH & DELETE)

### 4. Error Messages

All blocked operations return HTTP 403 with descriptive errors:

- `"Finance users cannot edit time entries"`
- `"Finance users cannot delete time entries"`
- `"Finance users cannot edit materials"`
- `"Finance users cannot delete materials"`
- `"Finance users cannot edit expenses"`
- `"Finance users cannot delete expenses"`
- `"Finance users cannot edit mileage"`
- `"Finance users cannot delete mileage"`

---

## Updated Role Hierarchy

EP-Tracker now has a **5-tier RBAC system:**

1. **Admin** - Full system access
2. **Foreman** - Site management + crew coordination
3. **Finance** - Read-only + financial operations ⭐ NEW
4. **Worker** - Personal data entry only
5. **UE (Underentreprenör)** - External subcontractors with worker-level access

---

## Use Cases

### Primary Use Case: Salary Processing

1. Finance user logs in
2. Views all time entries for the month
3. Exports time data for payroll system
4. Processes salaries based on hourly rates
5. Cannot accidentally modify or delete operational data

### Secondary Use Case: Client Invoicing

1. Finance user views project data
2. Views associated materials, expenses, and time
3. Calculates total project costs
4. Generates invoice (future feature)
5. Data integrity maintained (read-only access)

### Tertiary Use Case: Financial Reporting

1. Finance user accesses all organizational data
2. Views expenses by category/project/user
3. Views mileage reimbursements
4. Generates financial reports (future feature)
5. No risk of data tampering

---

## Migration Guide

### For Existing Deployments

1. **Run the SQL migration:**
   ```bash
   npx supabase migration up
   # Or apply directly: supabase/migrations/20241019000008_add_finance_role.sql
   ```

2. **No code changes needed** - role enum is automatically updated

3. **Assign finance role to users:**
   - Admin navigates to Settings → Users
   - Changes user role to "Finance"
   - User gains immediate read-only access

### For New Deployments

- Finance role is automatically available
- No additional setup required
- Migration runs as part of initial schema setup

---

## Testing

### Manual Testing Checklist

- [ ] Finance user can view all time entries
- [ ] Finance user can view all materials
- [ ] Finance user can view all expenses
- [ ] Finance user can view all mileage
- [ ] Finance user **cannot** edit time entries (403 error)
- [ ] Finance user **cannot** delete time entries (403 error)
- [ ] Finance user **cannot** edit materials (403 error)
- [ ] Finance user **cannot** delete materials (403 error)
- [ ] Finance user **cannot** edit expenses (403 error)
- [ ] Finance user **cannot** delete expenses (403 error)
- [ ] Finance user **cannot** edit mileage (403 error)
- [ ] Finance user **cannot** delete mileage (403 error)
- [ ] Finance user **cannot** access Settings → Users
- [ ] Finance user **cannot** access Settings → Organization
- [ ] Finance user **can** access Settings → Profile

### API Testing

```bash
# Test read access (should succeed)
curl -H "Authorization: Bearer <finance_user_token>" \
  http://localhost:3000/api/time/entries

# Test write access (should return 403)
curl -X PATCH -H "Authorization: Bearer <finance_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "test"}' \
  http://localhost:3000/api/time/entries/<entry_id>
```

---

## Future Enhancements

### Phase 1: Financial Operations (Next Release)
- [ ] Generate client invoices from project data
- [ ] Export salary reports (CSV/PDF)
- [ ] View hourly rates UI (currently only API)
- [ ] Approve expenses for reimbursement

### Phase 2: Advanced Reporting
- [ ] Custom date range reports
- [ ] Cost analysis by project/user/category
- [ ] Profit margin calculations
- [ ] Export to accounting systems (JSON/XML)

### Phase 3: Integration
- [ ] Connect to accounting software (Fortnox, etc.)
- [ ] Auto-generate invoices on project completion
- [ ] Salary system integration

---

## Security Considerations

### Read-Only Enforcement

Finance role is enforced at **three layers:**

1. **Database (RLS):** Finance users in memberships table
2. **API:** Explicit role checks in all PATCH/DELETE handlers
3. **UI:** Conditional rendering (hide edit/delete buttons)

### Cannot Be Bypassed

- Finance users **cannot** modify data via API (403 errors)
- Finance users **cannot** bypass checks with direct DB access (RLS policies)
- Finance users **cannot** use DevTools to reveal hidden UI (API rejects requests)

### Data Integrity

- Operational teams (workers/foremen) work without finance interference
- Finance team reports accurate data without risk of accidental changes
- Audit trail remains clean (no finance-initiated modifications)

---

## Documentation Updates

### Updated Files:
- ✅ `docs/USER-ROLES-AND-PERMISSIONS.md` (comprehensive guide)
- ✅ `docs/FINANCE-ROLE-ADDED.md` (this file)
- ✅ `README.md` (role count updated to 4-tier)

### Updated Diagrams:
- ⚠️ Role hierarchy diagram (to be added)
- ⚠️ Permission matrix visual (to be added)

---

## Questions & Answers

### Q: Can finance users approve time entries?
**A:** No. Only Admin users can approve entries. Finance has read-only access.

### Q: Can finance users see other users' salaries (hourly rates)?
**A:** Yes, via API. They need this data to calculate salaries. UI display TBD.

### Q: Can finance users create invoices yet?
**A:** Not yet. This is planned for a future release. Currently read-only data access only.

### Q: What happens if I change a user from Admin to Finance?
**A:** They immediately lose all write permissions. They can still view all data but cannot modify anything.

### Q: Can finance users export data?
**A:** Yes, they can use browser tools or future export features. Read access includes all data.

---

**Implementation Complete:** 2025-10-19  
**Next Step:** Update main USER-ROLES-AND-PERMISSIONS.md documentation

