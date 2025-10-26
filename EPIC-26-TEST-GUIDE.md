# EPIC 26: Performance Test Guide

**Datum:** 2025-10-26  
**Status:** Testing EPIC 26 optimizations in production  
**Tester:** Manual + Chrome DevTools

---

## 🎯 Vad Ska Vi Testa?

### Story 26.1-26.6 Förbättringar:
1. ✅ **React Query Caching** - Färre API-anrop
2. ✅ **Session Caching** - Färre database queries
3. ✅ **Client Navigation** - Ingen full page reload
4. ✅ **Dashboard Optimization** - 12 queries → 5 queries
5. ✅ **Slider Optimization** - Instant check-in/out
6. ✅ **Planning Page** - 5 queries → 2 RPC calls

---

## 📊 TEST 1: Network Performance (5 min)

### Steg 1: Öppna Production
```
https://ep-tracker.vercel.app
```

### Steg 2: Öppna Chrome DevTools
```
1. Tryck F12
2. Gå till "Network" tab
3. ✅ Bocka i "Disable cache" (för ren test)
4. ✅ Filter: "Fetch/XHR" (visa bara API-anrop)
```

### Steg 3: Test Dashboard Load
```
1. Logga in
2. Kolla Dashboard load
3. Räkna API-anrop i Network tab

✅ Förväntat: 5-7 requests (BEFORE: 12+)
✅ Tid: < 2 sekunder
```

**Notera här:**
- Antal requests: _____
- Load tid: _____ sekunder

---

## 📊 TEST 2: Navigation Speed (3 min)

### Test Client-Side Navigation

**FÖRE EPIC 26:**
- window.location.href = full page reload
- 2-3 sekunders delay
- Vit skärm mellan sidor

**EFTER EPIC 26:**
- router.push() = instant
- < 0.5 sekunder
- Smooth transition

### Testa:
```
1. Dashboard → Projekt (se URL ändras, ingen reload)
2. Projekt → Sök efter något (INSTANT, ingen reload!)
3. Projekt → Rensa sökning (INSTANT!)
4. Dashboard → Planering (smooth!)
```

**Känsla:**
- ✅ INSTANT (< 0.5s) - Perfekt!
- ⚠️ SNABB (0.5-1s) - Bra!
- ❌ LÅNGSAM (> 1s) - Problem

**Notera:**
- Navigation känns: _____

---

## 📊 TEST 3: Check-In/Out Slider (2 min)

**FÖRE EPIC 26.5:**
- 2-3 sekunders delay
- Tuggar/spinner
- 4 database queries

**EFTER EPIC 26.5:**
- INSTANT feedback
- Optimistic UI update
- 1 database query

### Testa:
```
1. Gå till Dashboard
2. Tryck på slider för Check In
3. ✅ Ska vara INSTANT (ingen spinner!)
4. Tryck på slider för Check Out
5. ✅ Ska vara INSTANT!
```

**Timer:**
- Check In tid: _____ sekunder
- Check Out tid: _____ sekunder

---

## 📊 TEST 4: Planning Page (3 min)

**FÖRE EPIC 26.6:**
- 5 separata queries
- 3-5 sekunders load
- Typeerror på project.name

**EFTER EPIC 26.6:**
- 2 RPC calls (optimized functions)
- < 2 sekunders load
- Fungerar perfekt

### Testa:
```
1. Gå till "Planering"
2. Öppna Network tab i DevTools
3. Filtrera på "Fetch/XHR"
4. Räkna API-anrop

✅ Förväntat: 2-3 requests
✅ Tid: < 2 sekunder
✅ Ingen TypeError!
```

**Notera:**
- Antal requests: _____
- Load tid: _____ sekunder
- Errors: _____

---

## 📊 TEST 5: Create Project (2 min)

**FÖRE FIX:**
- 500 Error i production
- RLS policy violation
- NEXT_REDIRECT röd ruta

**EFTER FIX:**
- Fungerar perfekt
- Admin client bypass RLS (säkert!)
- Smooth client-side redirect

### Testa:
```
1. Gå till Projekt → "+ Nytt projekt"
2. Fyll i:
   - Namn: "Test Performance"
   - Projektnummer: "PERF-001"
3. Klicka "Skapa projekt"

✅ Förväntat:
   - Inget error
   - Ingen röd ruta
   - Smooth redirect till projekt-sidan
```

**Resultat:**
- Funkar: _____ (Ja/Nej)
- Fel meddelande: _____

---

## 🎯 TEST 6: Lighthouse Score (5 min)

### Kör Lighthouse Audit

**I Chrome DevTools:**
```
1. Gå till "Lighthouse" tab
2. Välj:
   ✅ Performance
   ✅ Best Practices
   ✅ Accessibility
3. Device: Desktop
4. Klicka "Analyze page load"
```

### Mål (Desktop):
- **Performance:** > 90
- **FCP:** < 1.5s
- **LCP:** < 2.5s
- **TBT:** < 200ms

**Resultat:**
- Performance Score: _____
- FCP: _____ ms
- LCP: _____ ms
- TBT: _____ ms

---

## 🎯 TEST 7: Cache Verification (3 min)

**Verifiera React Query Caching:**

```
1. Öppna DevTools → Application tab
2. Storage → IndexedDB
3. Leta efter React Query cache

✅ Ska finnas cached data!
```

**Test Cache:**
```
1. Ladda Dashboard (första gången)
2. Gå till Projekt
3. Gå tillbaka till Dashboard
4. Öppna Network tab
5. ✅ Färre API-anrop andra gången!
```

---

## 📊 RESULTAT SAMMANFATTNING

### Före EPIC 26 (Estimerat):
- Dashboard load: 8-12s
- Navigation: 2-3s (full reload)
- Check-in/out: 2-3s
- Planning: 3-5s
- API calls: 12+ per page

### Efter EPIC 26 (Mål):
- Dashboard load: < 3s
- Navigation: < 0.5s (instant)
- Check-in/out: < 0.5s (instant)
- Planning: < 2s
- API calls: < 5 per page

### Faktiska Resultat:
- Dashboard load: _____ s
- Navigation: _____ s
- Check-in/out: _____ s
- Planning: _____ s
- API calls: _____ requests

---

## ✅ Success Criteria

**EPIC 26 är SUCCESS om:**
- ✅ Dashboard < 3s
- ✅ Navigation känns instant
- ✅ Slider är instant
- ✅ Planning < 2s
- ✅ Färre än 7 API-anrop per sida
- ✅ Ingen NEXT_REDIRECT error
- ✅ Create Project fungerar

---

## 🎊 NEXT STEPS

**Om alla tester passerar:**
1. 🎉 Fira EPIC 26 success!
2. 📝 Dokumentera före/efter metrics
3. 🚀 Överväg EPIC 25 (Push Notifications)

**Om problem upptäcks:**
1. 📝 Dokumentera specifika problem
2. 🔍 Debug med DevTools
3. 🛠️ Fix issues
4. 🔄 Test igen

---

**Good luck! 🚀**

