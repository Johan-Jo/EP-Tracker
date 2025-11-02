# EPIC 31 Quick Test Checklist

## Test Environment
- Dev server running on `http://localhost:3000`
- Login as admin/foreman user

---

## 1. Worksite Overview Page
**URL:** `/dashboard/worksites`

**Test Steps:**
1. Navigate to "Personalliggare" in sidebar
2. Should see list of projects with `worksite_enabled = true`
3. Each card shows: project name, project number, address, quick actions

**Expected:**
- ✅ Page loads without errors
- ✅ List of active worksites displays
- ✅ Empty state shows if no worksites active
- ✅ Quick action buttons present: "Visa projekt", "Check-in", "Kontrollvy"

---

## 2. Project Form - Worksite Activation
**URL:** `/dashboard/projects/[id]` → "Redigera projekt"

**Test Steps:**
1. Open any project
2. Click "Redigera projekt"
3. Scroll to "Personalliggare / Platsdata" section
4. Test address autocomplete (Geoapify)
5. Enable worksite toggle
6. Fill in address fields
7. Click "Plats-QR" button
8. Click "Kontroll-QR" button
9. Save project

**Expected:**
- ✅ Address autocomplete works (suggests addresses)
- ✅ Map displays location
- ✅ Plats-QR dialog opens with QR code
- ✅ Kontroll-QR generates token + shows QR
- ✅ All data saves correctly
- ✅ Section persists after page reload

---

## 3. Check-in Page
**URL:** `/worksites/[projectId]/checkin`

**Test Steps:**
1. Navigate to check-in page for active worksite
2. Check project info displays correctly
3. Check QR code appears
4. Click "Checka in" button
5. Verify check-in succeeds

**Expected:**
- ✅ Page loads with project details
- ✅ QR code visible for sharing
- ✅ Check-in button works
- ✅ Success message appears
- ✅ Last check-in timestamp updates

---

## 4. Control View
**URL:** `/worksites/[projectId]/control?token=[token]`

**Test Steps:**
1. Generate Kontroll-QR from project form
2. Navigate to control view URL
3. Switch between tabs: Nu / Idag / Period
4. Enter period dates and click "Visa period"
5. Test search/filter functionality
6. Click "Exportera CSV"
7. Click "Skriv ut PDF"

**Expected:**
- ✅ Control view loads with token
- ✅ Sessions display in table
- ✅ Tabs work correctly (Now / Today / Period)
- ✅ Search filters sessions
- ✅ CSV export downloads with hash
- ✅ PDF export downloads with hash (text format)
- ✅ Hash visible in footer of exports

---

## 5. Export Formats

### CSV Export
- ✅ File downloads as `.csv`
- ✅ Columns: Namn, PersonID, In, Ut
- ✅ Footer includes: project_id, period, created, hash

### PDF/TXT Export
- ✅ File downloads as `.txt` (or `.pdf` if pdfkit installed)
- ✅ Header shows project name, period, export date, hash
- ✅ Address from project displayed
- ✅ Sessions listed
- ✅ Metadata footer with hash

---

## 6. Performance
**Critical:** Load Kontrollvy with 500+ sessions

**Test Steps:**
1. Create test data: 500+ check-in/out events
2. Navigate to Kontrollvy
3. Measure load time

**Expected:**
- ✅ Kontrollvy loads in < 2 seconds
- ✅ No timeout errors
- ✅ Pagination or virtualization works smoothly

---

## Known Issues / TODOs
- [ ] Proper PDF format (currently text)
- [ ] Performance test with 500+ sessions (needs test data)
- [ ] Token expiration testing (30 min TTL)
- [ ] Geoapify rate limiting handling

---

**Test Date:** 2025-11-02  
**Tester:** AI Assistant  
**Status:** Manual testing required

