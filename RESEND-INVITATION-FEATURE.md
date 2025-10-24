# Resend Invitation Feature

## Overview
Added functionality to resend invitations to users who haven't completed their account setup yet.

## Features Added

### 1. User Status Tracking
- **Active Badge** (Green with checkmark) - User has completed registration
- **Pending Badge** (Amber with clock) - User has been invited but hasn't set password yet
- Real-time status checking via API

### 2. Resend Invitation Button
- Appears only for users with "Pending" status
- Sends a new invitation email with password setup link
- Shows loading state while sending
- Toast notifications for success/error

### 3. Delete/Deactivate Users
- Click the **pencil icon** ✏️ to open edit dialog
- Scroll to bottom and click **"Inaktivera"** button
- Confirms before deactivating
- Protected: Can't deactivate the last admin

## API Endpoints

### POST `/api/users/resend-invite`
**Purpose:** Resend invitation email to a pending user

**Request:**
```json
{
  "user_id": "uuid-here"
}
```

**Response:**
```json
{
  "message": "Invitation resent successfully",
  "email": "user@example.com"
}
```

**Validations:**
- Only admins can resend invitations
- User must be in the same organization
- User must not have completed setup yet (returns error if already active)

### GET `/api/users/status`
**Purpose:** Get confirmation status for all users in organization

**Response:**
```json
{
  "statuses": {
    "user-id-1": {
      "confirmed": true,
      "email_confirmed_at": "2024-10-23T12:00:00Z"
    },
    "user-id-2": {
      "confirmed": false
    }
  }
}
```

## UI Changes

### Users List (`components/users/users-page-new.tsx`)

**Before:**
- User name, email, phone
- Role badge
- Hourly rate
- Edit button

**After:**
- User name, email, phone
- **Status badge** (Active/Pending)
- Role badge
- Hourly rate
- **Resend invitation button** (for pending users only)
- Edit button

### Status Badges

**Active User:**
```
✓ Aktiv (green badge)
```

**Pending User:**
```
⏰ Väntar på registrering (amber badge)
[Skicka ny inbjudan] button
```

## User Flow

### Inviting a New User
1. Admin clicks "Bjud in användare"
2. Fills in email, name, role, hourly rate
3. Clicks "Skicka inbjudan"
4. User appears in list with **"Väntar på registrering"** badge
5. User receives email with setup link

### Resending an Invitation
1. Admin sees user with pending status
2. Clicks **"Skicka ny inbjudan"** button
3. New email is sent to the user
4. Toast notification confirms success
5. User receives fresh invitation email

### User Completes Setup
1. User clicks link in email
2. Goes to Supabase's "Set Password" page
3. Sets password
4. Redirected to `/welcome` page
5. Status badge automatically changes to **"Aktiv"** (green)

### Deactivating a User
1. Admin clicks **pencil icon** ✏️ on any user
2. Edit dialog opens
3. Scrolls to bottom
4. Clicks **"Inaktivera"** button
5. Confirms the action
6. User is removed from organization (soft delete)
7. User can be re-invited later if needed

## Error Handling

### Resend Invitation Errors:
- **User already active:** "User has already completed setup. No invitation needed."
- **User not found:** "User not found in organization"
- **Not admin:** "Only admins can resend invitations"
- **Network error:** "Misslyckades att skicka inbjudan"

### Status Check Errors:
- Falls back to showing no badge if status check fails
- Logged to console for debugging

## Files Modified

1. ✅ `app/api/users/resend-invite/route.ts` (NEW)
   - POST endpoint to resend invitation
   - Validates user status before sending

2. ✅ `app/api/users/status/route.ts` (NEW)
   - GET endpoint to fetch all user statuses
   - Uses admin client to check auth.users table

3. ✅ `components/users/users-page-new.tsx` (UPDATED)
   - Added status badges
   - Added resend invitation button
   - Added status fetching logic
   - Updated info section

4. ✅ `app/dashboard/settings/users/page.tsx` (UPDATED)
   - Pass currentUserId to component
   - Add user_id and created_at to transformed data

## Testing

### Test Resend Invitation:
1. Go to http://localhost:3000/dashboard/settings/users
2. Invite a new user
3. Don't have them complete setup
4. You should see "Väntar på registrering" badge
5. Click "Skicka ny inbjudan"
6. Check http://localhost:54324 for new email

### Test Status Badges:
1. Active users show green "Aktiv" badge
2. Pending users show amber "Väntar på registrering" badge
3. Status updates automatically after user completes setup

### Test Deactivate:
1. Click pencil icon on any user (except last admin)
2. Scroll to bottom of dialog
3. Click "Inaktivera"
4. Confirm
5. User disappears from list

## Benefits

1. **Clear Visibility** - Admins can see who has completed setup
2. **Easy Resend** - One-click to send new invitation
3. **No Email Lost** - Users can always get a fresh link
4. **Status Tracking** - Know which users need follow-up
5. **Better UX** - No confusion about user states
6. **User Management** - Easy to deactivate users when needed

## Security

- All endpoints require authentication
- Only admins can resend invitations
- Only admins can check user statuses
- Only admins can deactivate users
- Can't deactivate the last admin
- Uses Supabase Admin Client for privileged operations
- RLS policies still apply for regular operations

