# User Management Edit Button Fix

## Problem
The edit button (pencil icon) on the user management page wasn't working. Clicking it did nothing.

## Root Cause
The dialogs (`EditUserDialog` and `InviteUserDialog`) were using `DialogTrigger` components with their own internal state, but the parent component was trying to control them externally by conditionally rendering them. This created a mismatch where:
- The parent set `editingUser` state on button click
- But the dialog's internal `open` state wasn't being controlled
- Result: Dialog never opened

## Solution

### 1. Made Dialogs Controlled Components

**EditUserDialog (`components/users/edit-user-dialog.tsx`):**
- Added `open` and `onOpenChange` props for external control
- Removed `DialogTrigger` (dialog is now controlled by parent)
- Supports both controlled and uncontrolled modes

**InviteUserDialog (`components/users/invite-user-dialog.tsx`):**
- Added `open` and `onOpenChange` props for external control
- Removed `DialogTrigger` (button is in parent component)
- Added page reload after successful invite

### 2. Updated Parent Component

**UsersPageNew (`components/users/users-page-new.tsx`):**
- Pass `open={!!editingUser}` to EditUserDialog
- Pass `onOpenChange` to close dialog when user clicks outside
- Added `window.location.reload()` after successful operations to refresh user list
- Properly control InviteUserDialog with `showInviteDialog` state

## Features Now Working

### Edit User
1. ✅ Click pencil icon to open edit dialog
2. ✅ Change user role (Worker, Foreman, Finance, Admin)
3. ✅ Update hourly rate
4. ✅ Deactivate user (removes access to organization)
5. ✅ Protection: Can't demote/deactivate last admin

### Invite User
1. ✅ Click "Bjud in användare" button
2. ✅ Fill in email, name, role, and hourly rate
3. ✅ Send invitation via email
4. ✅ User receives email with Supabase's "Set Password" link
5. ✅ After setting password → redirected to /welcome
6. ✅ Page refreshes to show newly invited user

## API Endpoints (Already Existed)

### PATCH `/api/users/[id]`
- Update user role and hourly rate
- Admin-only
- Prevents last admin from demoting themselves

### DELETE `/api/users/[id]`
- Soft delete (sets `is_active = false`)
- Admin-only
- Prevents last admin from deactivating themselves

## Testing

### Test Edit Functionality:
1. Go to http://localhost:3000/dashboard/settings/users
2. Click the pencil icon on any user
3. Edit dialog should open
4. Change role or hourly rate
5. Click "Spara ändringar"
6. Page refreshes with updated data

### Test Deactivate:
1. Open edit dialog
2. Click "Inaktivera" at the bottom
3. Confirm the action
4. User is removed from the list

### Test Invite:
1. Click "Bjud in användare"
2. Fill in the form
3. Click "Skicka inbjudan"
4. Check http://localhost:54324 for the email
5. Click link → Supabase password page → /welcome

## Technical Details

The fix uses a pattern where dialogs can be controlled either:
- **Externally** (when `open` prop is provided): Parent controls open state
- **Internally** (when `open` prop is not provided): Dialog manages its own state via DialogTrigger

```typescript
// In dialog component:
const [internalOpen, setInternalOpen] = useState(false);
const open = controlledOpen ?? internalOpen;
const setOpen = onOpenChange ?? setInternalOpen;

// In parent component:
<EditUserDialog 
  open={!!editingUser}
  onOpenChange={(open) => {
    if (!open) setEditingUser(null);
  }}
  // ... other props
/>
```

## Files Modified
1. ✅ `components/users/edit-user-dialog.tsx`
2. ✅ `components/users/invite-user-dialog.tsx`
3. ✅ `components/users/users-page-new.tsx`

## No API Changes Required
All backend functionality was already in place! This was purely a frontend state management issue.

