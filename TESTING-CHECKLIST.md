# EP Tracker - Testing Checklist
**EPIC 5: Materials, Expenses & Mileage**  
**Date:** October 19, 2025  
**URL:** http://localhost:3001/dashboard/materials

---

## 🚀 Before You Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Login with:** `oi@johan.com.br` (Admin account)

3. **Navigate to:** http://localhost:3001/dashboard/materials

---

## ✅ Test 1: Materials Entry (5 min)

### 1.1 Create Material WITH Photo
- [ ] Click on **"Material"** tab
- [ ] Fill in:
  - **Description:** "Trävirke för takstolar"
  - **Quantity:** 45
  - **Unit:** Select "m" (meter)
  - **Unit Price:** 125.50
  - **Project:** Select any active project
  - **Phase:** Select any phase (optional)
- [ ] Click **"📷 Ta foto/välj"** → Upload an image
- [ ] **Expected:** Photo preview appears below button
- [ ] Click **"Spara Material"**
- [ ] **Expected:** Success message + material appears in list below
- [ ] **Expected:** Total shows: 5,647.50 kr (45 × 125.50)
- [ ] **Expected:** Photo thumbnail visible in card

### 1.2 Create Material WITHOUT Photo
- [ ] Fill form again with different data, skip photo
- [ ] Click **"Spara Material"**
- [ ] **Expected:** Material saves successfully
- [ ] **Expected:** No photo placeholder in card

### 1.3 Filter Materials
- [ ] Use **Project** dropdown → select specific project
- [ ] **Expected:** List shows only that project's materials
- [ ] Use **Status** dropdown → select "Draft"
- [ ] **Expected:** List shows only draft materials

### 1.4 Delete Draft Material
- [ ] Find a draft material
- [ ] Click **"🗑️ Ta bort"** button
- [ ] **Expected:** Material removed from list

---

## ✅ Test 2: Expenses Entry (5 min)

### 2.1 Create Expense WITH Receipt
- [ ] Click on **"Utlägg"** tab
- [ ] Fill in:
  - **Category:** Select "Drivmedel"
  - **Description:** "Bensin för arbetsfordon"
  - **Amount:** 850.00
  - **VAT Included:** ✓ Check the box
  - **Project:** Select a project
- [ ] Click **"📷 Ta foto/välj"** → Upload receipt image
- [ ] **Expected:** Receipt preview appears
- [ ] Click **"Spara Utlägg"**
- [ ] **Expected:** Expense appears in list
- [ ] **Expected:** Category badge shows "Drivmedel"
- [ ] **Expected:** Amount shows "850.00 kr" with "Inkl. moms" tag
- [ ] **Expected:** Total at top updates

### 2.2 View Receipt Full Size
- [ ] Click on receipt thumbnail in list
- [ ] **Expected:** Receipt opens in new tab at full size

### 2.3 Filter Expenses
- [ ] Use **Project** filter
- [ ] Use **Status** filter
- [ ] **Expected:** List updates correctly
- [ ] **Expected:** Total amount recalculates

### 2.4 Delete Draft Expense
- [ ] Click **"🗑️ Ta bort"** on a draft expense
- [ ] **Expected:** Expense removed
- [ ] **Expected:** Total recalculates

---

## ✅ Test 3: Mileage Entry (5 min)

### 3.1 Create Mileage with Standard Rate
- [ ] Click on **"Milersättning"** tab
- [ ] Fill in:
  - **Project:** Select a project
  - **Date:** Select today
  - **Kilometers:** 150
  - **Rate per km:** Click **"Standard"** button
  - **From:** "Kontoret, Stockholm"
  - **To:** "Byggplats, Uppsala"
  - **Notes:** "Materialinköp och platsbesök"
- [ ] **Expected:** Rate auto-fills to **1.85 kr/km**
- [ ] **Expected:** Info text shows "Skatteverkets schablon 2025: 18.50 kr/mil"
- [ ] **Expected:** Total calculates to **277.50 kr** (150 × 1.85)
- [ ] Click **"Spara Milersättning"**
- [ ] **Expected:** Entry appears in list
- [ ] **Expected:** Shows "150.0 km (15.0 mil)"
- [ ] **Expected:** Shows "× 1.85 kr/km = 277.50 kr"
- [ ] **Expected:** From → To locations visible
- [ ] **Expected:** Totals at top update

### 3.2 Create with Custom Rate
- [ ] Fill form again
- [ ] Manually enter rate: **2.50 kr/km**
- [ ] Enter: **80 km**
- [ ] **Expected:** Total calculates to **200.00 kr** (80 × 2.50)
- [ ] Click **"Spara Milersättning"**
- [ ] **Expected:** Entry saves with custom rate

### 3.3 Verify Conversion
- [ ] In list, check km to mil conversion
- [ ] **Expected:** 150 km = "15.0 mil"
- [ ] **Expected:** 80 km = "8.0 mil"

### 3.4 Filter Mileage
- [ ] Use **Project** filter
- [ ] Use **Status** filter
- [ ] **Expected:** List updates
- [ ] **Expected:** Totals recalculate

### 3.5 Delete Draft Entry
- [ ] Click **"🗑️ Ta bort"** on draft entry
- [ ] **Expected:** Entry removed
- [ ] **Expected:** Totals recalculate

---

## ✅ Test 4: Mobile View (5 min)

### 4.1 Responsive Design
- [ ] Open Chrome DevTools → Toggle device toolbar (mobile view)
- [ ] **Expected:** Forms are responsive
- [ ] **Expected:** No horizontal scrolling
- [ ] **Expected:** Buttons are large enough to tap

### 4.2 Photo Capture (Real Mobile Device)
- [ ] Open on actual mobile phone
- [ ] On Materials tab, click **"📷 Ta foto/välj"**
- [ ] **Expected:** Camera app opens with back camera
- [ ] Take photo
- [ ] **Expected:** Photo uploads successfully
- [ ] **Expected:** Preview appears

### 4.3 Form Inputs
- [ ] Tap number inputs
- [ ] **Expected:** Numeric keyboard appears
- [ ] Tap dropdown selects
- [ ] **Expected:** Touch-friendly selection

### 4.4 Lists on Mobile
- [ ] View each list (materials, expenses, mileage)
- [ ] **Expected:** Cards stack vertically
- [ ] **Expected:** Photos are tappable
- [ ] **Expected:** All info is readable

---

## ✅ Test 5: Validation (3 min)

### 5.1 Required Fields
- [ ] Try to submit material form without description
- [ ] **Expected:** Error: "Beskrivning är obligatorisk"
- [ ] Try to submit expense without amount
- [ ] **Expected:** Error: "Belopp måste vara större än 0"
- [ ] Try to submit mileage without project
- [ ] **Expected:** Error: "Giltigt projekt måste väljas"

### 5.2 Number Validation
- [ ] Enter negative number in quantity
- [ ] **Expected:** Error or prevented
- [ ] Enter zero in amount
- [ ] **Expected:** Error: "Belopp måste vara större än 0"

---

## ✅ Test 6: Data Persistence (2 min)

### 6.1 Refresh Page
- [ ] Create a material entry
- [ ] Refresh the page (F5)
- [ ] **Expected:** Material still appears in list

### 6.2 Navigate Away and Back
- [ ] Create an expense
- [ ] Navigate to Projects page
- [ ] Navigate back to Materials page
- [ ] **Expected:** Expense still in list

---

## ✅ Test 7: Photo Upload (3 min)

### 7.1 Supported Formats
- [ ] Upload .jpg image
- [ ] **Expected:** Works
- [ ] Upload .png image
- [ ] **Expected:** Works

### 7.2 Remove Photo
- [ ] Upload a photo
- [ ] Click **"✕ Ta bort foto"** (if button exists)
- [ ] **Expected:** Photo preview removed
- [ ] OR re-upload different photo
- [ ] **Expected:** New photo replaces old

### 7.3 Photo Display
- [ ] After saving, check photo in list
- [ ] **Expected:** Thumbnail displays correctly
- [ ] Click thumbnail
- [ ] **Expected:** Opens full size (materials/expenses)

---

## ✅ Test 8: Timer Widget (2 min)

### 8.1 Verify Still Works
- [ ] Check bottom of page for timer widget
- [ ] **Expected:** Timer widget visible
- [ ] Start timer
- [ ] **Expected:** Timer counts up
- [ ] Navigate to Materials page
- [ ] **Expected:** Timer still visible and counting

---

## 🎯 Quick Test Summary (15 min express version)

If short on time, test these critical paths:

1. [ ] Create material WITH photo → See it in list
2. [ ] Create expense WITH receipt → See it in list  
3. [ ] Create mileage with Standard rate → Verify calculation
4. [ ] Delete a draft entry → Verify it's removed
5. [ ] Filter by project → Verify list updates
6. [ ] Test on mobile device → Photo capture works
7. [ ] Refresh page → Data persists

---

## 🐛 If You Find Bugs

**Report format:**
```
Bug: [Short description]
Steps to reproduce:
1. 
2. 
3. 
Expected: [What should happen]
Actual: [What actually happened]
Screenshot: [If applicable]
Browser/Device: [e.g., Chrome/iPhone 13]
```

---

## ✅ Success Criteria

**PASS if:**
- ✅ Can create all 3 entry types (materials, expenses, mileage)
- ✅ Photos upload successfully
- ✅ Calculations are correct (qty × price, km × rate)
- ✅ Lists display all entries
- ✅ Filters work
- ✅ Delete works for draft entries
- ✅ Forms validate properly
- ✅ Mobile view is usable

**FAIL if:**
- ❌ Cannot submit forms
- ❌ Photos don't upload
- ❌ Calculations are wrong
- ❌ Data doesn't persist
- ❌ TypeScript errors in console
- ❌ White screen / app crash

---

## 📊 Test Results Template

**Date Tested:** _______________  
**Tester:** _______________  
**Browser:** _______________  
**Device:** _______________

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Materials Entry | ☐ | |
| Expenses Entry | ☐ | |
| Mileage Entry | ☐ | |
| Mobile View | ☐ | |
| Validation | ☐ | |
| Data Persistence | ☐ | |
| Photo Upload | ☐ | |
| Timer Widget | ☐ | |

**Overall Status:** ☐ PASS / ☐ FAIL  

**Bugs Found:** _______________

**Notes:**
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

---

**Total Estimated Time:** 30 minutes for full test  
**Express Test:** 15 minutes  
**Critical Path Only:** 10 minutes

---

**Ready to Test!** 🚀  
Start dev server: `npm run dev`  
Login: `oi@johan.com.br`  
URL: http://localhost:3001/dashboard/materials

