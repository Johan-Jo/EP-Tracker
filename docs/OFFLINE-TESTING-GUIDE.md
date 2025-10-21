# Offline-First Testing Guide

Comprehensive testing guide for EPIC 8: Offline-First & PWA features.

---

## 🎯 Testing Objectives

Verify that EP Tracker works seamlessly when:
1. User goes offline mid-session
2. User starts app while offline
3. Network is intermittent
4. Data conflicts occur
5. App updates are available

---

## 🛠️ Setup

### Prerequisites
- Chrome/Edge (best PWA support)
- iOS Safari (for iOS testing)
- Android Chrome (for Android testing)
- DevTools open (F12)

### Test Environment
```bash
# Start dev server
npm run dev

# Visit app
http://localhost:3000
```

---

## ✅ Test Scenarios

### Test 1: Basic Offline Mode
**Objective:** Verify offline detection and UI feedback

**Steps:**
1. Log in to EP Tracker
2. Navigate to dashboard
3. Open DevTools → Network tab
4. Select "Offline" in throttling dropdown
5. Observe UI changes

**Expected Results:**
- ✅ Red banner: "Du är offline"
- ✅ Sync status shows "Offline"
- ✅ Toast notification appears
- ✅ No errors in console

**Pass Criteria:** All UI elements respond to offline state

---

### Test 2: Create Time Entry Offline
**Objective:** Verify data is queued when offline

**Steps:**
1. Go offline (DevTools)
2. Navigate to Tid
3. Fill out time entry form:
   - Project: Select any
   - Start time: Now
   - Stop time: Now + 2 hours
4. Submit form
5. Check sync status indicator

**Expected Results:**
- ✅ Time entry saved to IndexedDB
- ✅ "1 väntande" shown in sync status
- ✅ Success toast: "Tidrapport sparad (offline)"
- ✅ Entry appears in list with "offline" badge

**Pass Criteria:** Entry created and queued for sync

---

### Test 3: Auto-Sync on Reconnect
**Objective:** Verify automatic sync when connection restored

**Steps:**
1. Create 2-3 time entries offline (from Test 2)
2. Verify "3 väntande" in sync status
3. Go back online (DevTools → Online)
4. Wait 2-3 seconds
5. Observe sync status

**Expected Results:**
- ✅ Green banner: "Tillbaka online!"
- ✅ Toast: "Anslutning återupprättad! Synkroniserar..."
- ✅ Sync status changes to "Synkroniserar..."
- ✅ Pending count decreases: 3 → 2 → 1 → 0
- ✅ Toast: "Synkronisering klar!"
- ✅ Sync status: "Synkad" with timestamp

**Pass Criteria:** All queued items sync successfully

---

### Test 4: Manual Sync
**Objective:** Verify manual sync button works

**Steps:**
1. Create 1 time entry offline
2. Go online
3. DO NOT wait for auto-sync
4. Click refresh button in sync status
5. Observe sync process

**Expected Results:**
- ✅ Sync starts immediately
- ✅ Button shows loading spinner
- ✅ Pending count goes to 0
- ✅ Toast: "Synkronisering klar!"

**Pass Criteria:** Manual sync triggers immediately

---

### Test 5: Sync Error Handling
**Objective:** Verify retry logic on sync failure

**Steps:**
1. Go offline
2. Create time entry with invalid data:
   - Empty project ID (if possible)
   - OR future date beyond validation
3. Go online
4. Watch console for retry attempts

**Expected Results:**
- ✅ First attempt fails
- ✅ Console: "❌ Sync failed, retry 1/5 in 2s"
- ✅ Waits 2 seconds
- ✅ Console: "❌ Sync failed, retry 2/5 in 4s"
- ✅ Exponential backoff continues (2s, 4s, 8s, 16s, 32s)
- ✅ After 5 retries: item removed from queue
- ✅ Console: "❌ Max retries reached for item X"

**Pass Criteria:** Exponential backoff works, max retries respected

---

### Test 6: Data Preload on Login
**Objective:** Verify critical data is cached

**Steps:**
1. Clear IndexedDB:
   - DevTools → Application → IndexedDB → ep-tracker-db → Delete
2. Log in to EP Tracker
3. Wait for preload prompt or auto-preload
4. Observe preload process
5. Check IndexedDB after completion

**Expected Results:**
- ✅ Prompt appears: "Ladda ner offline-data"
- ✅ Progress bar shows loading
- ✅ Toast: "Data nedladdad!"
- ✅ Stats shown: "X projekt • Y tidrapporter • Z material"
- ✅ IndexedDB contains:
   - projects table with entries
   - time_entries table with recent entries
   - materials table with entries
   - expenses table with entries

**Pass Criteria:** Data successfully cached in IndexedDB

---

### Test 7: Offline with Preloaded Data
**Objective:** Verify app works with cached data only

**Steps:**
1. Complete Test 6 (data preloaded)
2. Go offline
3. Navigate to:
   - Dashboard → Should show projects
   - Tid → Should show cached time entries
   - Material → Should show cached materials
4. Try to create new entries

**Expected Results:**
- ✅ Lists show cached data (not empty)
- ✅ Can create new entries (queued for sync)
- ✅ Can view details of cached entries
- ✅ No errors or blank screens

**Pass Criteria:** Full functionality with cached data

---

### Test 8: PWA Install Prompt (Android/Desktop)
**Objective:** Verify install prompt appears

**Steps:**
1. Clear site data (DevTools → Application → Clear storage)
2. Visit app on Chrome/Edge (NOT in incognito)
3. Wait 5 seconds
4. Observe for install prompt

**Expected Results:**
- ✅ Prompt appears bottom-right
- ✅ Shows "Installera EP Tracker"
- ✅ Description mentions offline support
- ✅ "Installera" and "Senare" buttons visible
- ✅ Click "Installera" → browser's native prompt appears
- ✅ Accept prompt → app installs
- ✅ App icon appears on desktop/home screen

**Pass Criteria:** Install prompt functional

---

### Test 9: PWA Install Prompt (iOS)
**Objective:** Verify iOS install instructions

**Steps:**
1. Open app in iOS Safari
2. NOT installed (clear site data if needed)
3. Wait 5 seconds
4. Observe prompt

**Expected Results:**
- ✅ Prompt appears showing share icon
- ✅ Instructions in Swedish:
   1. "Tryck på 🔗 (Dela) i Safari"
   2. "Välj 'Lägg till på hemskärmen'"
   3. "Tryck på 'Lägg till'"
- ✅ "Avvisa" button works
- ✅ Prompt dismissed is remembered (7 days)

**Pass Criteria:** iOS users get proper instructions

---

### Test 10: Service Worker Update
**Objective:** Verify update notifications work

**Steps:**
1. Have app running with SW registered
2. Modify any file (trigger rebuild)
3. Reload page (Ctrl+F5 or Cmd+Shift+R)
4. Wait for new SW to detect
5. Observe update prompt

**Expected Results:**
- ✅ Blue alert appears: "Uppdatering tillgänglig"
- ✅ "Uppdatera nu" button visible
- ✅ Click button → page reloads
- ✅ New version active

**Pass Criteria:** Update prompt functional

---

### Test 11: Intermittent Connection
**Objective:** Verify handling of unstable network

**Steps:**
1. Go online
2. Create time entry (syncs immediately)
3. Go offline
4. Create another entry (queued)
5. Go online for 2 seconds
6. Go offline before sync completes
7. Go online again

**Expected Results:**
- ✅ Sync pauses when offline
- ✅ Sync resumes when online
- ✅ No duplicate entries
- ✅ Eventually syncs successfully

**Pass Criteria:** Graceful handling of network changes

---

### Test 12: Multiple Tabs Sync
**Objective:** Verify sync works across tabs

**Steps:**
1. Open EP Tracker in Tab A
2. Open EP Tracker in Tab B
3. In Tab A: go offline, create entry
4. In Tab B: observe sync status
5. In Tab A: go online
6. In both tabs: observe sync

**Expected Results:**
- ✅ Tab A queues entry
- ✅ Tab B may not show queue (different instance)
- ✅ When Tab A syncs, data appears in DB
- ✅ Tab B can refetch and see new entry

**Pass Criteria:** No conflicts, data eventually consistent

---

### Test 13: Long Offline Period
**Objective:** Verify app handles extended offline use

**Steps:**
1. Go offline
2. Create 10+ time entries
3. Create 5+ materials
4. Create 3+ expenses
5. Check IndexedDB queue size
6. Go online
7. Wait for all to sync

**Expected Results:**
- ✅ All items queued successfully
- ✅ Sync status shows correct pending count
- ✅ Auto-sync processes sequentially
- ✅ All items sync without errors
- ✅ No memory leaks or crashes

**Pass Criteria:** Handles bulk sync gracefully

---

### Test 14: PWA Installed - Offline Launch
**Objective:** Verify installed PWA works offline from start

**Steps:**
1. Install PWA (Test 8)
2. Close browser completely
3. Disconnect internet
4. Launch EP Tracker from desktop icon
5. Try to navigate and use app

**Expected Results:**
- ✅ App launches successfully (service worker cache)
- ✅ Shows cached data
- ✅ Can create new entries
- ✅ Offline banner visible
- ✅ Full functionality available

**Pass Criteria:** Complete offline capability

---

### Test 15: Data Refresh
**Objective:** Verify preload refresh works

**Steps:**
1. Have old cached data (7+ days)
2. Log in
3. Observe preload prompt
4. Click "Ladda ner"
5. Wait for completion
6. Check IndexedDB

**Expected Results:**
- ✅ Prompt appears (7 days since last preload)
- ✅ Progress bar shows
- ✅ Old data cleared
- ✅ Fresh data loaded
- ✅ Toast: "Data nedladdad!"

**Pass Criteria:** Refresh updates cached data

---

## 📊 Test Results Template

### Test Session
**Date:** _______  
**Tester:** _______  
**Device:** _______  
**Browser:** _______  
**Version:** _______  

### Results

| Test # | Test Name | Pass/Fail | Notes |
|--------|-----------|-----------|-------|
| 1 | Basic Offline Mode | ⬜ | |
| 2 | Create Time Entry Offline | ⬜ | |
| 3 | Auto-Sync on Reconnect | ⬜ | |
| 4 | Manual Sync | ⬜ | |
| 5 | Sync Error Handling | ⬜ | |
| 6 | Data Preload on Login | ⬜ | |
| 7 | Offline with Preloaded Data | ⬜ | |
| 8 | PWA Install (Android/Desktop) | ⬜ | |
| 9 | PWA Install (iOS) | ⬜ | |
| 10 | Service Worker Update | ⬜ | |
| 11 | Intermittent Connection | ⬜ | |
| 12 | Multiple Tabs Sync | ⬜ | |
| 13 | Long Offline Period | ⬜ | |
| 14 | PWA Installed - Offline Launch | ⬜ | |
| 15 | Data Refresh | ⬜ | |

**Overall Pass Rate:** ___/15 (___%)

---

## 🐛 Bug Report Template

### Bug Report
**Test #:** _______  
**Test Name:** _______  
**Severity:** 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**


**Actual Result:**


**Screenshots/Console Errors:**


**Environment:**
- Device: _______
- Browser: _______
- Version: _______

---

## 🎯 Acceptance Criteria

**Minimum Pass Rate:** 80% (12/15 tests)

**Critical Tests (Must Pass):**
- Test 1: Basic Offline Mode
- Test 2: Create Time Entry Offline
- Test 3: Auto-Sync on Reconnect
- Test 6: Data Preload on Login
- Test 7: Offline with Preloaded Data

**Optional (Nice-to-Have):**
- Test 8-9: PWA Install (depends on icons being generated)
- Test 11: Intermittent Connection (edge case)
- Test 13: Long Offline Period (stress test)

---

## 🚀 Pre-Production Checklist

Before deploying to production:

- [ ] All critical tests pass
- [ ] 80%+ overall pass rate
- [ ] No critical bugs
- [ ] Service worker registered successfully
- [ ] IndexedDB working on target browsers
- [ ] PWA install prompt tested (if icons ready)
- [ ] Offline banner tested
- [ ] Sync status indicator tested
- [ ] Data preload tested
- [ ] Multi-day offline usage tested

---

**Status:** Testing guide complete - Ready for QA

