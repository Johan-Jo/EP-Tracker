# EP-Tracker User Roles & Permissions

**Last Updated:** 2025-10-19 (Updated with Finance role)

---

## Overview

EP-Tracker implements a **4-tier role-based access control (RBAC)** system with the following roles:

1. **Admin** (Administrator)
2. **Foreman** (Arbetsledare)
3. **Finance** (Ekonomi/Finance Manager) ⭐ NEW
4. **Worker** (Arbetare)

Each user is assigned a role within their organization membership.

---

## Role Definitions

### 1. **Admin** (Administrator)

**Purpose:** Full system access and organization management

**Permissions:**

#### Organization & User Management
- ✅ **Invite new users** to the organization
- ✅ **Manage user roles** (promote/demote users)
- ✅ **Set hourly rates** for team members
- ✅ **Deactivate users** (remove from organization)
- ✅ **Access Settings → Users** page
- ✅ **Access Settings → Organization** page

#### Time Tracking
- ✅ **View all time entries** in the organization
- ✅ **Edit/delete any time entry** (not just their own)
- ✅ **Approve/reject time entries**
- ✅ **Clock in crew members** (bulk time entry creation)
- ✅ **Manually add time entries** for themselves

#### Materials, Expenses & Mileage
- ✅ **View all materials** in the organization
- ✅ **Edit/delete any material entry** (not just their own)
- ✅ **Approve/reject materials**
- ✅ **View all expenses** in the organization
- ✅ **Edit/delete any expense** (not just their own)
- ✅ **Approve/reject expenses**
- ✅ **View all mileage entries** in the organization
- ✅ **Edit/delete any mileage entry** (not just their own)
- ✅ **Approve/reject mileage claims**

#### Projects
- ✅ **Create new projects**
- ✅ **Edit all projects**
- ✅ **Archive projects**
- ✅ **Manage phases and work orders**
- ✅ **View all project data**

---

### 2. **Foreman** (Arbetsledare)

**Purpose:** Site-level management and crew coordination

**Permissions:**

#### Organization & User Management
- ❌ **Cannot invite new users**
- ❌ **Cannot manage user roles**
- ❌ **Cannot access Settings → Users** page
- ❌ **Cannot access Settings → Organization** page
- ✅ **Can view Settings → Profile** (their own)

#### Time Tracking
- ✅ **View all time entries** in the organization
- ✅ **Clock in crew members** (bulk time entry creation)
- ✅ **Manually add time entries** for themselves
- ✅ **Edit/delete their own time entries**
- ⚠️ **Can view** other workers' time entries
- ❌ **Cannot edit/delete** other workers' time entries
- ❌ **Cannot approve/reject** time entries (read-only for others)

#### Materials, Expenses & Mileage
- ✅ **View all materials/expenses/mileage** in the organization
- ✅ **Create materials/expenses/mileage** entries
- ✅ **Edit/delete their own** materials/expenses/mileage
- ⚠️ **Can view** other workers' materials/expenses/mileage
- ❌ **Cannot edit/delete** other workers' entries
- ❌ **Cannot approve/reject** entries

#### Projects
- ✅ **View all projects**
- ⚠️ **May have edit permissions** (TBD - depends on project settings implementation)
- ❌ **Cannot create new projects**
- ❌ **Cannot archive projects**

---

### 3. **Finance** (Ekonomi/Finance Manager) ⭐ NEW

**Purpose:** Handle invoicing and salary management with read-only access to all operational data

**Permissions:**

#### Organization & User Management
- ❌ **Cannot invite new users**
- ❌ **Cannot manage user roles**
- ❌ **Cannot access Settings → Users** page
- ❌ **Cannot access Settings → Organization** page
- ✅ **Can view Settings → Profile** (their own)

#### Time Tracking
- ✅ **View all time entries** in the organization (read-only)
- ❌ **Cannot create time entries**
- ❌ **Cannot edit time entries** (any)
- ❌ **Cannot delete time entries** (any)
- ❌ **Cannot clock in crew members**
- ❌ **Cannot approve/reject** time entries

#### Materials, Expenses & Mileage
- ✅ **View all materials/expenses/mileage** in the organization (read-only)
- ❌ **Cannot create** materials/expenses/mileage
- ❌ **Cannot edit** materials/expenses/mileage (any)
- ❌ **Cannot delete** materials/expenses/mileage (any)
- ❌ **Cannot approve/reject** entries

#### Projects
- ✅ **View all projects** (read-only)
- ❌ **Cannot edit projects**
- ❌ **Cannot create new projects**
- ❌ **Cannot archive projects**

#### Financial Operations (Future)
- ⚠️ **Generate invoices** (to be implemented)
- ⚠️ **Process salaries** (to be implemented)
- ⚠️ **Export financial reports** (to be implemented)
- ✅ **View hourly rates** (accessible via API)

**Key Characteristic:** Finance role is **read-only** for all operational data. They can view everything but cannot create, edit, or delete any entries. This ensures data integrity while allowing financial reporting.

---

### 4. **Worker** (Arbetare)

**Purpose:** Field workers logging their own time, materials, and expenses

**Permissions:**

#### Organization & User Management
- ❌ **Cannot invite new users**
- ❌ **Cannot manage user roles**
- ❌ **Cannot access Settings → Users** page
- ❌ **Cannot access Settings → Organization** page
- ✅ **Can view Settings → Profile** (their own)

#### Time Tracking
- ⚠️ **View only their own time entries** (filtered by user_id)
- ❌ **Cannot view** other workers' time entries
- ❌ **Cannot clock in crew members**
- ✅ **Manually add time entries** for themselves
- ✅ **Edit/delete their own time entries**
- ❌ **Cannot approve/reject** any time entries

#### Materials, Expenses & Mileage
- ⚠️ **View only their own materials/expenses/mileage** (filtered by user_id)
- ❌ **Cannot view** other workers' materials/expenses/mileage
- ✅ **Create materials/expenses/mileage** entries
- ✅ **Edit/delete their own** materials/expenses/mileage
- ❌ **Cannot edit/delete** other workers' entries
- ❌ **Cannot approve/reject** entries

#### Projects
- ✅ **View all projects**
- ❌ **Cannot edit projects**
- ❌ **Cannot create new projects**
- ❌ **Cannot archive projects**

---

## Permission Matrix

| **Feature**                          | **Admin** | **Foreman** | **Finance** | **Worker** |
|--------------------------------------|-----------|-------------|-------------|------------|
| **Organization & Users**             |           |             |             |            |
| Invite users                         | ✅         | ❌           | ❌           | ❌          |
| Manage user roles                    | ✅         | ❌           | ❌           | ❌          |
| Set hourly rates                     | ✅         | ❌           | ❌           | ❌          |
| Access Settings → Users              | ✅         | ❌           | ❌           | ❌          |
| Access Settings → Organization       | ✅         | ❌           | ❌           | ❌          |
| Access Settings → Profile            | ✅         | ✅           | ✅           | ✅          |
|                                      |           |             |             |            |
| **Time Tracking**                    |           |             |             |            |
| View all time entries                | ✅         | ✅           | ✅ (read-only)| ❌ (own only)|
| Clock in crew members                | ✅         | ✅           | ❌           | ❌          |
| Add manual time entry (self)         | ✅         | ✅           | ❌           | ✅          |
| Edit own time entries                | ✅         | ✅           | ❌           | ✅          |
| Edit other users' time entries       | ✅         | ❌           | ❌           | ❌          |
| Delete own time entries              | ✅         | ✅           | ❌           | ✅          |
| Delete other users' time entries     | ✅         | ❌           | ❌           | ❌          |
| Approve/reject time entries          | ✅         | ❌           | ❌           | ❌          |
|                                      |           |             |             |            |
| **Materials**                        |           |             |             |            |
| View all materials                   | ✅         | ✅           | ✅ (read-only)| ❌ (own only)|
| Create materials                     | ✅         | ✅           | ❌           | ✅          |
| Edit own materials                   | ✅         | ✅           | ❌           | ✅          |
| Edit other users' materials          | ✅         | ❌           | ❌           | ❌          |
| Delete own materials                 | ✅         | ✅           | ❌           | ✅          |
| Delete other users' materials        | ✅         | ❌           | ❌           | ❌          |
| Approve/reject materials             | ✅         | ❌           | ❌           | ❌          |
|                                      |           |             |             |            |
| **Expenses**                         |           |             |             |            |
| View all expenses                    | ✅         | ✅           | ✅ (read-only)| ❌ (own only)|
| Create expenses                      | ✅         | ✅           | ❌           | ✅          |
| Edit own expenses                    | ✅         | ✅           | ❌           | ✅          |
| Edit other users' expenses           | ✅         | ❌           | ❌           | ❌          |
| Delete own expenses                  | ✅         | ✅           | ❌           | ✅          |
| Delete other users' expenses         | ✅         | ❌           | ❌           | ❌          |
| Approve/reject expenses              | ✅         | ❌           | ❌           | ❌          |
|                                      |           |             |             |            |
| **Mileage**                          |           |             |             |            |
| View all mileage                     | ✅         | ✅           | ✅ (read-only)| ❌ (own only)|
| Create mileage                       | ✅         | ✅           | ❌           | ✅          |
| Edit own mileage                     | ✅         | ✅           | ❌           | ✅          |
| Edit other users' mileage            | ✅         | ❌           | ❌           | ❌          |
| Delete own mileage                   | ✅         | ✅           | ❌           | ✅          |
| Delete other users' mileage          | ✅         | ❌           | ❌           | ❌          |
| Approve/reject mileage               | ✅         | ❌           | ❌           | ❌          |
|                                      |           |             |             |            |
| **Projects**                         |           |             |             |            |
| View all projects                    | ✅         | ✅           | ✅ (read-only)| ✅          |
| Create projects                      | ✅         | ❌           | ❌           | ❌          |
| Edit projects                        | ✅         | ⚠️ (TBD)     | ❌           | ❌          |
| Archive projects                     | ✅         | ❌           | ❌           | ❌          |
| Manage phases/work orders            | ✅         | ❌           | ❌           | ❌          |

---

## Technical Implementation

### Database Schema

Roles are defined as a CHECK constraint in the `memberships` table:

```sql
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'foreman', 'worker', 'finance')),
  hourly_rate_sek NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Zod Schema Validation

Defined in `lib/schemas/organization.ts`:

```typescript
export const membershipRoleEnum = z.enum(['admin', 'foreman', 'worker', 'finance']);
```

### API-Level Authorization

**Example from `/api/time/entries/route.ts` (GET):**

```typescript
// Workers only see their own entries; admin/foreman/finance see all
if (membership.role === 'worker') {
  query = query.eq('user_id', user.id);
}
```

**Example from `/api/time/entries/[id]/route.ts` (PATCH):**

```typescript
// Finance users have read-only access
if (membership.role === 'finance') {
  return NextResponse.json(
    { error: 'Finance users cannot edit time entries' }, 
    { status: 403 }
  );
}

// Workers can only edit their own entries
if (membership.role === 'worker' && existingEntry.user_id !== user.id) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 403 }
  );
}
```

### UI-Level Permissions

**Example from `app/(dashboard)/dashboard/time/page.tsx`:**

```typescript
const canManageCrew = membership.role === 'admin' || membership.role === 'foreman';

// ... later in JSX
{canManageCrew && (
  <TabsTrigger value="crew">
    <Users className="w-4 h-4 mr-2" />
    Starta bemanning
  </TabsTrigger>
)}
```

---

## Role Assignment

### On User Invite

When an Admin invites a new user:

1. Admin fills out invite form with email and role selection
2. User receives invitation email (if email system is configured)
3. User signs up and is automatically assigned the selected role
4. Membership is created with `is_active: true`

### Changing Roles

- Only **Admins** can change user roles
- Navigate to: **Settings → Users**
- Select user and change role from dropdown
- Changes take effect immediately

### Default Role

- No default role is automatically assigned
- Role must be explicitly set during user invitation
- First user in a new organization typically becomes **Admin**

---

## Security Considerations

### Multi-Layer Security

EP-Tracker implements defense-in-depth with role checks at:

1. **Database Level:** Row Level Security (RLS) policies
2. **API Level:** Membership and role validation in route handlers
3. **UI Level:** Conditional rendering based on role

### Workers Cannot Bypass Restrictions

Workers **cannot** bypass restrictions by:
- Modifying API requests (blocked by server-side role checks)
- Accessing other users' data via query params (filtered by user_id)
- Using browser DevTools to reveal hidden UI (API will reject unauthorized requests)

### RLS Policies

All tables enforce organization-level isolation:

```sql
-- Example: time_entries RLS policy
CREATE POLICY "Users can view time entries in their org" 
ON time_entries
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM memberships 
    WHERE user_id = auth.uid() AND is_active = TRUE
  )
);
```

---

## Future Enhancements

### Potential Additional Roles

- **Project Manager:** Can manage specific projects but not organization settings
- **Accountant:** Read-only access to all data for reporting
- **Client:** Limited view of project progress

### Granular Permissions

- Per-project role assignments
- Custom permission sets
- Time-limited elevated permissions

---

## Testing Role-Based Access

### Manual Testing

1. **Create users with each role:**
   - Admin: Full access
   - Foreman: Mid-level access
   - Worker: Restricted access

2. **Test each feature area:**
   - Time tracking (view, create, edit, delete)
   - Materials (view, create, edit, delete)
   - Expenses (view, create, edit, delete)
   - Mileage (view, create, edit, delete)
   - Projects (view, create, edit)
   - Settings (organization, users, profile)

3. **Verify restrictions:**
   - Workers should only see their own data
   - Foremen should see all data but cannot edit others'
   - Admins should have full control

### Automated Testing (Future)

```typescript
// Example test case
describe('Time Entries API - Role-Based Access', () => {
  test('Worker can only view their own time entries', async () => {
    // ...
  });

  test('Foreman can view all time entries', async () => {
    // ...
  });

  test('Worker cannot edit another worker's time entry', async () => {
    // ...
  });
});
```

---

## Questions & Support

For role-related questions or permission issues:

1. Check this document first
2. Review RLS policies in `supabase/migrations/`
3. Check API route authorization logic
4. Test with multiple users in development

---

**Document Version:** 1.0  
**Author:** AI Assistant + Project Team  
**Status:** ✅ Complete & Accurate as of 2025-10-19

