# Quick Start: Testing EPIC 26 Changes

## 🚀 Server är Igång!

Servern körs nu på: **http://localhost:3000**

---

## 📋 Snabb Test-Checklista

### 1. Grundläggande Funktionalitet (5 min)

**Test Login:**
```
1. Öppna http://localhost:3000
2. Klicka på "Sign In"  
3. Logga in med dina credentials
4. ✅ Verifiera att du kommer till dashboard
```

**Test Dashboard:**
```
1. Dashboard ska ladda
2. Se stats (projekt, tidsrapporter, material)
3. Se recent activities
4. ✅ Notera laddningstid (borde kännas snabbare)
```

**Test Projects:**
```
1. Klicka på "Projekt" i sidomenyn
2. Använd sökfältet för att söka efter ett projekt
3. ✅ VIKTIGT: Sidan ska INTE ladda om (ingen refresh)
4. ✅ Verifiera att URL uppdateras
5. ✅ Klicka "Rensa" - ingen reload!
```

---

### 2. Performance Observation (5 min)

**Öppna DevTools (F12):**

1. **Network Tab:**
   - Ladda om dashboard (Ctrl+R)
   - Kolla antal API-requests
   - ✅ Förväntat: 3-5 requests (inte 12!)

2. **Console Tab:**
   - Se efter errors
   - ✅ Förväntat: Inga kritiska errors

3. **Application Tab → Storage:**
   - Se efter cached data
   - ✅ React Query cache ska finnas

---

### 3. Navigation Test (3 min)

```
Test dessa navigeringar (ska vara snabba, ingen reload):

1. Dashboard → Projects ✅
2. Projects → Search → Clear Search ✅
3. Projects → Back to Dashboard ✅
4. Dashboard → Time → Back ✅

Alla ska vara INSTANT utan full page reload!
```

---

### 4. Cache Test (3 min)

**Test 1: Data Caching**
```
1. Gå till Dashboard
2. Notera data som visas
3. Gå till Projects
4. Gå tillbaka till Dashboard
5. ✅ Dashboard ska ladda INSTANT (från cache)
```

**Test 2: Stale Time**
```
1. Vänta 5 minuter
2. Gå tillbaka till Dashboard  
3. ✅ Data ska refetchas (efter 5 min är stale)
```

---

### 5. Session Test (2 min)

```
1. Logga in
2. Öppna ny tab → Gå till localhost:3000/dashboard
3. ✅ Ska vara inloggad direkt (ingen dubbel query)
4. Stäng tab
5. Logga ut i original tab
6. ✅ Ska logga ut korrekt
```

---

## 🧪 Kör Performance Test

```bash
# I en ny terminal:
cd "C:\Users\johan\Cursor Portfolio\EP-Tracker"
node scripts/performance-test.js
```

**Detta kommer:**
- Mäta FCP, LCP, TTI
- Räkna API calls
- Mäta bundle size
- Spara resultat i `performance-results/`

**Förväntat:**
- FCP: ~1.5-2s (var 4-6s)
- API calls: 3-5 (var 12+)

---

## ❌ Vanliga Problem & Lösningar

### Problem 1: "Ser ingen skillnad i hastighet"
**Lösning:** 
- Rensa browser cache (Ctrl+Shift+Delete)
- Hard reload (Ctrl+Shift+R)
- Testa igen

### Problem 2: "Search gör fortfarande reload"
**Lösning:**
- Verifiera att du är på Projects page
- Kolla Console för errors
- Verifiera att ändringarna är sparade

### Problem 3: "Får errors i console"
**Lösning:**
- Stoppa servern (Ctrl+C)
- Rensa cache: `Remove-Item -Recurse -Force .next`
- Starta igen: `npm run dev`

### Problem 4: "Data verkar gammal"
**Lösning:**
- Detta är normalt (5-min cache)
- Gör en mutation (skapa/uppdatera något)
- Cache ska invalideras automatiskt

---

## 📊 Vad ska dokumenteras

Efter testning, notera:

1. **Förbättringar:**
   - [ ] Dashboard känns snabbare?
   - [ ] Projects search utan reload?
   - [ ] Färre network requests?

2. **Problem:**
   - [ ] Några errors?
   - [ ] Något som inte fungerar?
   - [ ] Något som känns långsammare?

3. **Metrics:**
   - [ ] FCP tid (från performance test)
   - [ ] Antal API calls (från Network tab)
   - [ ] Subjektiv upplevelse (snabbare/samma/långsammare)

---

## ✅ Success Criteria

**EPIC 26 Phase 1 är framgångsrik om:**

- [x] Servern startar utan errors ✅
- [ ] Alla sidor fungerar som förut
- [ ] Dashboard känns snabbare
- [ ] Projects search fungerar utan reload
- [ ] Färre API-requests i DevTools
- [ ] Inga kritiska bugs

---

## 🔄 Nästa Steg Efter Testning

Om allt fungerar bra:
1. ✅ Dokumentera resultat
2. ✅ Commit changes till git (lokalt)
3. ✅ Fortsätt med Phase 1 window.location fixes
4. ✅ Fortsätt med Story 26.4 (Dashboard optimization)

Om något är fel:
1. ❌ Dokumentera problemet
2. ❌ Revert specifik ändring
3. ❌ Fixa och testa igen

---

**Lycka till med testningen!** 🚀

**Frågor? Se:**
- `EPIC-26-PROGRESS-REPORT.md` - Fullständig rapport
- `DEPLOYMENT-CHECKLIST.md` - Deployment process
- `PERFORMANCE-IMPROVEMENT-EPIC.md` - Implementation guide

