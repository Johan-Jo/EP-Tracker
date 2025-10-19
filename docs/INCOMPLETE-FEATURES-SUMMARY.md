# Incomplete Features from Completed EPICs

**Date:** 2025-10-19  
**Status:** Features planned but not yet implemented

---

## Overview

While EPICs 1-5 are marked as "complete," several advanced features from the original plan were intentionally deferred or simplified. This document tracks those features for potential future implementation.

---

## 📋 EPIC 3: Core UI & Projects Management

### ❌ **Geo-Fence Map Picker** (Deferred to Phase 2)

**Planned Feature:**
- Interactive map picker for project location
- Set lat/lon coordinates
- Define radius for geo-fence alerts
- Location-based clock-in reminders

**Current Status:**
- Database schema includes `lat`, `lon`, `geo_fence_radius_m` fields in `projects` table
- Fields exist but are not used
- No UI for setting location
- No map integration (e.g., Google Maps, Mapbox)

**Reason for Deferral:**
- Marked as "Phase 2" in implementation plan
- Requires external map service integration
- Not critical for MVP functionality

**Estimated Effort:** 2-3 days
- Integrate map library (react-leaflet or Google Maps)
- Build map picker component
- Add location field to project form
- Implement location-based features

---

## ⏱️ EPIC 4: Time Tracking & Crew Management

### ❌ **Split Crew Time** (Not Implemented)

**Planned Feature:**
- After crew clock-in, ability to split time differently per user
- Equal split (default) or custom percentages
- Useful when crew members worked different durations

**Current Status:**
- Crew clock-in creates identical entries for all selected users
- No UI for splitting time
- No percentage distribution

**Estimated Effort:** 1 day
- Add split options UI after crew clock-in
- Implement percentage or custom duration input
- Update API to handle split logic

---

### ❌ **Duplicate Yesterday** (Not Implemented)

**Planned Feature:**
- Quick button to copy previous day's time entries
- Auto-populate today with same project/phase/duration
- Saves time for repetitive work

**Current Status:**
- No duplicate/copy functionality
- Users must manually re-enter data

**Estimated Effort:** 0.5 days
- Add "Duplicate Yesterday" button
- Query previous day's entries
- Copy with today's date
- Confirmation dialog

---

### ❌ **Batch Edit Time Entries** (Not Implemented)

**Planned Feature:**
- Select multiple time entries (checkboxes)
- Bulk change project, phase, or task
- Bulk delete selected entries

**Current Status:**
- Only individual edit/delete is available
- No multi-select UI
- No batch operations

**Estimated Effort:** 1-2 days
- Add checkbox column to time entries list
- Implement multi-select state
- Build batch edit dialog
- API support for batch updates

---

### ❌ **Daily Reminders** (Not Implemented)

**Planned Feature:**
- Server-side cron or push notifications
- Remind users to clock in/out
- Daily timesheet completion reminders

**Current Status:**
- No reminder system
- No scheduled jobs
- No push notifications

**Estimated Effort:** 2-3 days
- Set up cron jobs (Vercel Cron or Supabase Functions)
- Implement notification system
- Build reminder preferences UI
- Configure schedule

---

### ❌ **"Forgot to Stop" Detection** (Not Implemented)

**Planned Feature:**
- Scheduled job checks for running timers > 12 hours
- Auto-stop or notify user
- Prevents unrealistic time entries

**Current Status:**
- No automatic detection
- Users can have timers running indefinitely
- No safeguards

**Estimated Effort:** 1 day
- Create scheduled job
- Query long-running timers
- Implement auto-stop logic
- Send notifications

---

## 📦 EPIC 5: Materials, Expenses & Mileage

### ❌ **Mobile Camera Capture** (Simplified)

**Planned Feature:**
- Native mobile camera integration
- Camera-first UX (open camera directly)
- Optimized for mobile devices

**Current Status:**
- Uses standard `<input type="file" accept="image/*">`
- Works but opens file picker first on mobile
- Not as streamlined as native camera

**Estimated Effort:** 1-2 days
- Implement `getUserMedia` API
- Build camera preview component
- Add capture button
- Mobile-optimized UI

---

### ❌ **Offline Photo Queue** (Not Implemented)

**Planned Feature:**
- Store photos locally when offline
- Sync to Supabase Storage on reconnect
- Queue management for failed uploads

**Current Status:**
- Photo upload requires internet connection
- No offline photo storage
- Upload fails if offline

**Estimated Effort:** 2-3 days
- Store photos in IndexedDB
- Implement upload queue
- Background sync on reconnect
- Retry logic for failed uploads

---

### ❌ **Quick Entry Shortcuts** (Not Implemented)

**Planned Feature:**
- Scan receipt → auto-fill expense amount
- OCR for receipt data extraction
- AI-powered categorization

**Current Status:**
- All fields must be manually entered
- No OCR or auto-fill
- No AI assistance

**Estimated Effort:** 3-5 days (complex)
- Integrate OCR service (Google Vision API, Tesseract)
- Parse receipt data
- Auto-fill expense form
- Fallback for manual entry

---

### ❌ **Batch Delete/Edit for Materials & Expenses** (Not Implemented)

**Planned Feature:**
- Select multiple materials/expenses
- Bulk delete
- Bulk change project or status

**Current Status:**
- Only individual edit/delete
- No multi-select
- No batch operations

**Estimated Effort:** 1-2 days
- Add checkbox column
- Implement multi-select state
- Build batch action bar
- API support for batch operations

---

## 📊 Summary Table

| Feature | EPIC | Priority | Estimated Effort | Complexity |
|---------|------|----------|------------------|------------|
| **Geo-Fence Map Picker** | 3 | Low (Phase 2) | 2-3 days | Medium |
| **Split Crew Time** | 4 | Medium | 1 day | Low |
| **Duplicate Yesterday** | 4 | High | 0.5 days | Low |
| **Batch Edit Time** | 4 | High | 1-2 days | Medium |
| **Daily Reminders** | 4 | Medium | 2-3 days | Medium |
| **Forgot to Stop Detection** | 4 | Low | 1 day | Low |
| **Mobile Camera Capture** | 5 | Low | 1-2 days | Low |
| **Offline Photo Queue** | 5 | Medium | 2-3 days | Medium |
| **Quick Entry Shortcuts (OCR)** | 5 | Low | 3-5 days | High |
| **Batch Delete/Edit (Materials)** | 5 | Medium | 1-2 days | Low |

**Total Estimated Effort:** 15-25 days

---

## 🎯 Recommendations

### High Priority (Should implement before EPIC 6)
1. **Duplicate Yesterday** (0.5 days) - High value, low effort
2. **Batch Edit Time** (1-2 days) - Very useful for corrections
3. **Batch Delete/Edit Materials** (1-2 days) - Common workflow need

### Medium Priority (Can wait until after EPIC 9)
1. **Split Crew Time** (1 day) - Nice to have for flexibility
2. **Daily Reminders** (2-3 days) - Improves compliance
3. **Offline Photo Queue** (2-3 days) - Better offline experience

### Low Priority (Phase 2 or later)
1. **Geo-Fence Map Picker** (2-3 days) - Explicitly Phase 2
2. **Forgot to Stop Detection** (1 day) - Edge case, can be manual
3. **Mobile Camera Capture** (1-2 days) - Current solution works
4. **Quick Entry Shortcuts** (3-5 days) - Nice to have, complex

---

## 🚦 Decision Points

### Option A: Continue to EPIC 6 Now
- **Pro:** Maintain momentum, complete all EPICs
- **Pro:** These features can be added later
- **Con:** Missing some useful productivity features

### Option B: Implement High-Priority Features First
- **Pro:** More polished UX before moving forward
- **Pro:** Only adds ~3 days total
- **Con:** Delays EPIC 6 start

### Option C: Cherry-Pick After EPIC 9
- **Pro:** Complete all EPICs first
- **Pro:** Re-evaluate priorities based on pilot feedback
- **Con:** May be harder to retrofit later

---

## 📝 Notes

- **Offline Queue (EPIC 4):** Basic offline queue for time entries IS implemented
- **Photo Gallery:** Multiple photos per entry IS implemented (added during EPIC 5 fixes)
- **Edit Functionality:** Edit mode for materials, expenses, and time entries IS implemented
- **User Management:** Full invite/edit/deactivate IS implemented (completed today)

**Recommendation:** Proceed to EPIC 6 and defer these features to a "Polish & Enhancements" phase after EPIC 9 completion.

---

**Date Documented:** 2025-10-19  
**Next Review:** After EPIC 9 completion or pilot feedback

