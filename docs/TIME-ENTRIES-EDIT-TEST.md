# Time Entries Edit Functionality - Testing Checklist

**Date:** 2025-10-19  
**Feature:** Full edit functionality for time entries  
**Status:** ✅ Ready for Testing

---

## Prerequisites

- [ ] Dev server is running (`npm run dev`)
- [ ] Browser hard refresh performed (`Ctrl + Shift + R`)
- [ ] Logged in as a user with active organization
- [ ] At least one time entry with status "Utkast" (draft) exists

---

## Test 1: View Time Entries List

### Steps:
1. Navigate to **Tidrapportering** → **Översikt** tab
2. Verify time entries are displayed grouped by date

### Expected Results:
- ✅ Time entries are visible
- ✅ Each entry shows:
  - Project name
  - Status badge ("Utkast", "Inskickad", etc.)
  - Start/stop times and duration
  - Task label and notes (if any)
- ✅ **Pencil icon (edit button)** visible on "Utkast" entries
- ✅ **Trash icon (delete button)** visible on "Utkast" entries
- ✅ No edit/delete buttons on approved/submitted entries

---

## Test 2: Open Edit Mode

### Steps:
1. Click the **pencil icon** (edit button) on any "Utkast" time entry

### Expected Results:
- ✅ List view **disappears**
- ✅ Edit form **appears** in its place
- ✅ Card title shows: **"Redigera tidrapport"**
- ✅ Card description shows: **"Uppdatera tidrapport information"**
- ✅ **X button** (close icon) visible in top-right corner of card header
- ✅ All form fields are **pre-filled** with existing data:
  - Project dropdown shows correct project
  - Phase dropdown shows correct phase (if any)
  - Work order shows correct order (if any)
  - Task label field shows correct text
  - Start time shows correct datetime
  - Stop time shows correct datetime (if any)
  - Notes show correct text (if any)

---

## Test 3: Edit Time Entry - Update Values

### Steps:
1. In edit mode, modify one or more fields:
   - Change task label text
   - Change start time
   - Add/modify stop time
   - Add/modify notes
2. Click **"Uppdatera tid"** button

### Expected Results:
- ✅ Button shows loading state while saving
- ✅ No error messages appear
- ✅ Form closes and returns to list view
- ✅ Updated entry appears in the list with new values
- ✅ Changes are reflected immediately (no page refresh needed)

---

## Test 4: Edit Time Entry - Cancel Changes

### Steps:
1. Click pencil icon to enter edit mode
2. Modify some fields (don't save)
3. Click the **X button** in the card header

### Expected Results:
- ✅ Form closes immediately
- ✅ Returns to list view
- ✅ Original entry data is **unchanged** in the list
- ✅ No updates were saved to database

---

## Test 5: Edit Multiple Entries

### Steps:
1. Edit first entry → save → verify changes
2. Edit second entry → save → verify changes
3. Edit first entry again → save → verify changes

### Expected Results:
- ✅ Each edit operation works correctly
- ✅ Correct entry data loads in form each time
- ✅ No data from previous edit "leaks" into next edit
- ✅ List refreshes after each save

---

## Test 6: Validation - Invalid Data

### Steps:
1. Enter edit mode
2. Clear the "Starttid" (start time) field
3. Try to save

### Expected Results:
- ✅ Validation error appears: **"Starttid måste vara ett giltigt datum"**
- ✅ Form does **not** submit
- ✅ User remains in edit mode

### Steps:
1. Fill in valid start time
2. Set stop time **before** start time
3. Try to save

### Expected Results:
- ✅ Validation error appears: **"Sluttid måste vara efter starttid"**
- ✅ Form does **not** submit

---

## Test 7: Edit with Phase and Work Order

### Steps:
1. Find/create a time entry with a project that has phases and work orders
2. Enter edit mode
3. Change phase selection
4. Change work order selection
5. Save

### Expected Results:
- ✅ Phase and work order dropdowns populate correctly
- ✅ Current phase/work order are pre-selected
- ✅ Changes save successfully
- ✅ List shows updated phase/work order badges

---

## Test 8: React Query Cache Invalidation

### Steps:
1. Edit a time entry and save
2. Immediately check if changes appear in list (no manual refresh)

### Expected Results:
- ✅ List updates **automatically** after save
- ✅ No need to manually refresh the page
- ✅ Updated data appears within 1-2 seconds

---

## Test 9: Tab Navigation While Editing

### Steps:
1. Click pencil icon to enter edit mode on a time entry
2. While form is open, try clicking **"Lägg till tid"** tab
3. Then click back to **"Översikt"** tab

### Expected Results:
- ✅ Tab switches to "Lägg till tid" form (new entry form)
- ✅ When returning to "Översikt", edit form is **closed**
- ✅ List view is displayed
- ✅ No unsaved changes are lost (user was not prompted)

---

## Test 10: Button Text and States

### Steps:
1. Check button text in **create mode** (Lägg till tid tab)
2. Check button text in **edit mode** (Översikt tab, after clicking pencil)

### Expected Results:
- ✅ Create mode button: **"Spara tid"**
- ✅ Edit mode button: **"Uppdatera tid"**
- ✅ Loading state shows spinner and disables button
- ✅ Cancel button appears only in edit mode

---

## Test 11: Success Feedback (Create Mode Only)

### Steps:
1. Go to **"Lägg till tid"** tab
2. Fill in new time entry
3. Save

### Expected Results:
- ✅ Green success banner appears: **"Tidrapport sparad!"**
- ✅ Banner auto-dismisses after 5 seconds
- ✅ Form resets to empty state

### Steps:
1. Edit an existing entry in **Översikt** tab
2. Save changes

### Expected Results:
- ✅ **No** success banner appears (this is expected)
- ✅ Form closes and returns to list
- ✅ Changes are visible in the list

---

## Test 12: API Integration

### Steps:
1. Open browser DevTools → Network tab
2. Edit a time entry and save
3. Check network requests

### Expected Results:
- ✅ **PATCH** request sent to `/api/time/entries/{id}`
- ✅ Request contains updated form data
- ✅ Response status: **200 OK**
- ✅ Response contains updated time entry data

---

## Test 13: Browser Console (No Errors)

### Steps:
1. Open browser DevTools → Console tab
2. Perform all edit operations (open, modify, save, cancel)
3. Monitor for errors

### Expected Results:
- ✅ **No red errors** appear in console
- ✅ Only expected log messages (if any)
- ✅ No React warnings about keys, props, or state

---

## Known Limitations

- ⚠️ Only **"Utkast"** (draft) entries can be edited
- ⚠️ Submitted/approved entries are **read-only**
- ⚠️ Edit mode shows form, not inline editing
- ⚠️ No success message shown after edit (returns to list)

---

## Bug Reporting Template

If you find issues, report them with:

```
**Issue:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:** 

**Actual Result:** 

**Screenshot:** [If applicable]

**Console Errors:** [If any]
```

---

## Sign-off

- [ ] All 13 tests passed
- [ ] No critical bugs found
- [ ] Minor issues documented (if any)
- [ ] Ready for production

**Tested by:** _______________  
**Date:** _______________  
**Notes:** _______________

---

**Status:** ✅ Feature Complete & Ready for Testing

