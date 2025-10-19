EPIC 5 - Manual Testing Checklist
🎯 Setup
[ ] Sign in as user with admin or worker role
[ ] Navigate to Material & Kostnader tab
📦 1. Materials Testing
Create Material Entry:
[ ] Click "Material" tab
[ ] Fill in form:
Project: Select an active project
Description: "Trävirke för takstolar"
Quantity: 10
Unit: m (meter)
Unit price: 150 kr
Upload 2-3 photos
Notes: "Test material entry"
[ ] Click "Spara material"
[ ] ✅ Entry appears in list below with "Utkast" badge
[ ] ✅ Photos show as thumbnails (3-column grid)
[ ] ✅ Total price calculated correctly (10 × 150 = 1,500 kr)
View Photos:
[ ] Click on any photo thumbnail in the list
[ ] ✅ Photo gallery opens in full-screen
[ ] ✅ Arrow buttons (← →) appear
[ ] Use arrow buttons to navigate between photos
[ ] Press keyboard arrow keys to navigate
[ ] ✅ Thumbnail strip shows at bottom
[ ] ✅ Active photo highlighted
[ ] ✅ Counter shows "Foto 1 av 3"
[ ] Press ESC or click X to close
[ ] ✅ Gallery closes
Edit Material:
[ ] Click 🖊️ Edit button on a draft entry
[ ] ✅ Form at top fills with existing data
[ ] ✅ Existing photos load in grid (with more vertical space, no cropping)
[ ] Click on a photo in the edit form
[ ] ✅ Photo gallery opens
[ ] Modify description: "Updated material"
[ ] Remove one photo (hover and click X)
[ ] Add a new photo
[ ] Change quantity to 15
[ ] Click "Uppdatera material"
[ ] ✅ Entry updates in list
[ ] ✅ Form resets
[ ] ✅ Changes are visible
Filter Materials:
[ ] Use "Alla projekt" dropdown to filter by specific project
[ ] ✅ Only materials for that project show
[ ] Use "Alla status" dropdown to filter by "Utkast"
[ ] ✅ Only draft materials show
Delete Material:
[ ] Click 🗑️ trash icon on a draft entry
[ ] ✅ Entry removed from list
💰 2. Expenses Testing
Create Expense Entry:
[ ] Click "Utlägg" tab (should load without errors now!)
[ ] ✅ Tab loads successfully
[ ] Fill in form:
Project: Select project
Category: Select "Material" (optional)
Description: "Verktyg från Bauhaus"
Amount: 2,500 kr
VAT: Toggle ON (green)
Upload 1-2 receipt photos
Notes: "Test expense"
[ ] Click "Spara utlägg"
[ ] ✅ Entry appears in list with "Utkast" badge
[ ] ✅ Photos show as thumbnails
[ ] ✅ Amount displays correctly
View Receipt Photos:
[ ] Click on receipt photo in list
[ ] ✅ Photo gallery opens
[ ] Navigate with arrows and keyboard
[ ] ✅ All features work (thumbnails, counter, ESC)
Edit Expense:
[ ] Click 🖊️ Edit button
[ ] ✅ Form fills with existing data
[ ] ✅ Photos load without cropping faces/documents
[ ] Click photo to view in gallery
[ ] Change amount to 3,000 kr
[ ] Toggle VAT OFF
[ ] Add another receipt photo
[ ] Click "Uppdatera utlägg"
[ ] ✅ Entry updates
[ ] ✅ Changes reflected in list
Test Category Selection:
[ ] Create new expense
[ ] Category dropdown should work (no error)
[ ] ✅ Can select a category
[ ] ✅ Can leave category blank (shows placeholder)
[ ] Save expense
[ ] ✅ Saves successfully
🚗 3. Mileage Testing
Create Mileage Entry:
[ ] Click "Milersättning" tab
[ ] Fill in form:
Date: Select today
Project: Select project
From: "Stockholm"
To: "Uppsala"
Distance: 70 km
Rate: 18.50 kr/km (default)
Notes: "Client meeting"
[ ] Click "Spara milersättning"
[ ] ✅ Entry appears in list
[ ] ✅ Total calculated correctly (70 × 18.50 = 1,295 kr)
Filter and Review:
[ ] Filter by project
[ ] ✅ Only mileage for that project shows
[ ] Review total distance and amount
🎨 4. UI/UX Testing
Photo Display:
[ ] ✅ Photos in edit form show full image (no cropped faces/documents)
[ ] ✅ Photos have adequate vertical space (256px max)
[ ] ✅ object-contain preserves aspect ratio
[ ] ✅ Light gray background behind photos
[ ] ✅ Photos are clickable with hover effect
Photo Gallery:
[ ] ✅ Gallery works in both list and edit views
[ ] ✅ Keyboard navigation works (Arrow keys, ESC)
[ ] ✅ Mouse navigation works (buttons, thumbnails)
[ ] ✅ Mobile responsive (if testing on mobile)
Form Behavior:
[ ] ✅ Edit mode shows "Redigera" title
[ ] ✅ Edit mode shows "Uppdatera" button
[ ] ✅ Create mode shows "Lägg till" title
[ ] ✅ Create mode shows "Spara" button
[ ] ✅ Form resets after successful save
[ ] ✅ List refreshes automatically after create/update
❌ 5. Error Handling
[ ] Try to save material without required fields
[ ] ✅ Validation errors show
[ ] Try to upload 11 photos (max is 10)
[ ] ✅ Error message shows
[ ] Try to edit approved material (not draft)
[ ] ✅ No edit button shows
✅ Summary Checklist
Materials:
[ ] Create ✅
[ ] Edit ✅
[ ] Delete ✅
[ ] Photo gallery ✅
[ ] Photo upload (multiple) ✅
[ ] Filters ✅
Expenses:
[ ] Create ✅
[ ] Edit ✅
[ ] Delete ✅
[ ] Photo gallery ✅
[ ] Category selection ✅
[ ] VAT toggle ✅
Mileage:
[ ] Create ✅
[ ] List view ✅
[ ] Calculations ✅
UI/UX:
[ ] Photos show without cropping ✅
[ ] Photo gallery everywhere ✅
[ ] Edit functionality ✅
🐛 Known Fixes Applied Today: