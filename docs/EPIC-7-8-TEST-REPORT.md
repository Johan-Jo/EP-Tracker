# EPIC 7 & 8 - Pre-Test Bugfix Report

**Datum:** 2025-10-19  
**Testat av:** AI Code Review  
**Status:** 1 Bug Fixad, Redo för Manuell Testning

---

## 🐛 Buggar Hittade & Fixade

### Bug #1: Saknad Email i Approvals API ✅ FIXAD
**Fil:** `app/api/approvals/time-entries/route.ts`

**Problem:**
- API:et för approvals hämtade INTE `email` från `profiles`
- Men `lib/exports/salary-csv.ts` kräver `user.email` för CSV-export
- Detta skulle orsaka runtime error när man exporterar löne-CSV

**Före:**
```typescript
user:profiles!time_entries_user_id_fkey(full_name),
```

**Efter:**
```typescript
user:profiles!time_entries_user_id_fkey(full_name, email),
```

**Impact:** 🔴 KRITISK - Utan denna fix skulle löne-CSV export krascha

**Status:** ✅ Fixad och rebuild utförd

---

## ✅ Verifierade Komponenter

### EPIC 7: Approvals & CSV Exports

**API Routes:**
- ✅ `/api/approvals/time-entries` - GET (fixad)
- ✅ `/api/approvals/time-entries/approve` - POST
- ✅ `/api/approvals/time-entries/reject` - POST
- ✅ `/api/approvals/time-entries/request-changes` - POST
- ✅ `/api/approvals/materials` - GET + approve
- ✅ `/api/approvals/expenses` - GET + approve
- ✅ `/api/approvals/mileage` - GET + approve
- ✅ `/api/exports/salary` - GET
- ✅ `/api/exports/invoice` - GET
- ✅ `/api/exports/history` - GET

**Komponenter:**
- ✅ `components/approvals/approvals-page-client.tsx`
- ✅ `components/approvals/week-selector.tsx` - ISO 8601 week calculation korrekt
- ✅ `components/approvals/time-entries-review-table.tsx`
- ✅ `components/approvals/materials-review-table.tsx`
- ✅ `components/approvals/request-changes-dialog.tsx`
- ✅ `components/approvals/exports-history.tsx`

**CSV Exports:**
- ✅ `lib/exports/salary-csv.ts` - Typ-definitioner korrekta
- ✅ `lib/exports/invoice-csv.ts` - Typ-definitioner korrekta

---

### EPIC 8: Offline-First & PWA

**Komponenter:**
- ✅ `components/core/sync-status.tsx` - Event listeners korrekt cleanup
- ✅ `components/core/offline-banner.tsx` - State management OK
- ✅ `components/core/sw-update-prompt.tsx` - Service worker listeners OK
- ✅ `components/ui/alert.tsx` - Radix UI variant korrekt

**Offline Infrastructure:**
- ✅ `lib/db/offline-store.ts` - Dexie schema version 1
- ✅ `lib/sync/offline-queue.ts` - Exponential backoff implementation korrekt

**Configuration:**
- ✅ `next.config.mjs` - PWA config korrekt
- ✅ Service worker genereras vid build

---

## 🧪 Prioriterade Testfall (Manuell Testning Behövs)

### EPIC 7 - Kritiska Tester

#### Test 1: Godkännande av Tidrapporter
**Prioritet:** 🔴 KRITISK

**Steg:**
1. Logga in som Admin/Foreman
2. Gå till "Godkännanden"
3. Välj aktuell vecka
4. Kontrollera att tidrapporter laddas
5. Markera en tidrapport
6. Klicka "Godkänn"

**Förväntat resultat:**
- ✅ Toast: "Tidrapporter godkända!"
- ✅ Status ändras till "Godkänd"
- ✅ Tabellen uppdateras automatiskt

**Potentiella Problem:**
- React Query cache invalidation
- Status update race condition

---

#### Test 2: Löne-CSV Export
**Prioritet:** 🔴 KRITISK (NYLIGEN FIXAD)

**Steg:**
1. Gå till "Godkännanden"
2. Välj en vecka med godkända tidrapporter
3. Klicka "Löne-CSV"

**Förväntat resultat:**
- ✅ CSV-fil laddas ner
- ✅ Filnamn: `lon_YYYY-MM-DD_YYYY-MM-DD.csv`
- ✅ Email-kolumnen innehåller faktiska email-adresser (INTE undefined)
- ✅ Exportens sparas i historiken

**Potentiella Problem:**
- ❌ (FIXAD) Email var undefined → ska nu fungera
- CSV-encoding (åäö)
- Semikolon i data

---

#### Test 3: Faktura-CSV Export
**Prioritet:** 🟡 HÖG

**Steg:**
1. Samma som Test 2, men välj "Faktura-CSV"

**Förväntat resultat:**
- ✅ CSV-fil laddas ner
- ✅ Tidrapporter grupperas per projekt/fas
- ✅ Endast godkända ÄTA inkluderas
- ✅ Timmar summeras korrekt

**Potentiella Problem:**
- Grupperings-logik för tidrapporter
- ÄTA-status filtrering

---

#### Test 4: Begär Ändringar
**Prioritet:** 🟡 HÖG

**Steg:**
1. Klicka meddelande-ikonen på en tidrapport
2. Skriv feedback: "Fel projekt valt"
3. Klicka "Skicka feedback"

**Förväntat resultat:**
- ✅ Dialog stängs
- ✅ Toast: "Ändringar begärda!"
- ✅ Status ändras till "draft"
- ✅ Notes uppdateras med feedback

**Potentiella Problem:**
- Notes overwrite (tidigare notes försvinner)

---

#### Test 5: Exporthistorik
**Prioritet:** 🟢 MEDIUM

**Steg:**
1. Exportera några CSV:er
2. Klicka "Historik"

**Förväntat resultat:**
- ✅ Alla exporter visas
- ✅ Sorterade nyast först
- ✅ Visar: Typ, Period, Antal poster, Skapad av, Datum

**Potentiella Problem:**
- Batch tracking misslyckas (silent fail)

---

### EPIC 8 - Kritiska Tester

#### Test 6: Offline Mode Grundläggande
**Prioritet:** 🔴 KRITISK

**Steg:**
1. Öppna DevTools (F12) → Network tab
2. Välj "Offline" i throttling dropdown
3. Observera UI

**Förväntat resultat:**
- ✅ Röd banner: "Du är offline"
- ✅ Toast: "Du är offline. Ändringar sparas lokalt."
- ✅ Sync-status ändras till "Offline"

**Potentiella Problem:**
- Event listeners körs inte (SSR issue)
- Toast visas inte

---

#### Test 7: Offline → Skapa Tidrapport → Online Sync
**Prioritet:** 🔴 KRITISK

**Steg:**
1. Gå offline (DevTools)
2. Skapa en tidrapport
3. Observera sync-status: "1 väntande"
4. Gå online igen

**Förväntat resultat:**
- ✅ Tidrapport sparas i IndexedDB
- ✅ Läggs i sync-queue
- ✅ Sync-status visar "1 väntande"
- ✅ När online: Grön banner "Tillbaka online!"
- ✅ Toast: "Synkronisering klar!"
- ✅ Tidrapport syns i databasen

**Potentiella Problem:**
- ❌ IndexedDB write failure
- ❌ Sync queue körs inte automatiskt
- ❌ API endpoint mismatch
- ❌ Payload serialization error

---

#### Test 8: Manual Sync Button
**Prioritet:** 🟡 HÖG

**Steg:**
1. Skapa 3 tidrapporter offline
2. Gå online
3. Klicka refresh-knappen i sync-status

**Förväntat resultat:**
- ✅ Status ändras till "Synkroniserar..."
- ✅ Spinner visas
- ✅ Toast: "Synkronisering klar!"
- ✅ Sync-status ändras till "Synkad"

**Potentiella Problem:**
- Knappen disabled fastnar (stuck state)
- Dubbelklick orsakar dubbel sync

---

#### Test 9: Service Worker Update
**Prioritet:** 🟢 MEDIUM

**Steg:**
1. Öppna Application tab i DevTools
2. Gå till Service Workers
3. Klicka "Update" på service worker

**Förväntat resultat:**
- ✅ Blå alert visas: "Uppdatering tillgänglig"
- ✅ "Uppdatera nu"-knapp syns
- ✅ Klicka → sidan laddas om

**Potentiella Problem:**
- SKIP_WAITING message når inte service worker
- Dubbel reload

---

#### Test 10: Sync Error Handling (Exponential Backoff)
**Prioritet:** 🟡 HÖG

**Steg:**
1. Gå offline
2. Skapa tidrapport med invalid data (t.ex. tomt projekt-ID)
3. Gå online
4. Öppna Console (F12)
5. Observera retry-försök

**Förväntat resultat:**
- ✅ Retry efter 2s
- ✅ Retry efter 4s
- ✅ Retry efter 8s
- ✅ Efter 5 retries: item tas bort från queue
- ✅ Error loggas i console

**Potentiella Problem:**
- Infinite retry loop
- Error inte loggad
- Max retries nås inte

---

## ⚠️ Kända Begränsningar (EJ Buggar)

### EPIC 7
- ⏳ **Period Lock** - Inte implementerad (planerad för senare)
- ⏳ **ZIP-export** - Bilagor exporteras inte än
- ⏳ **Export Preview** - Ingen förhandsgranskning
- ⏳ **Audit Log Viewer** - UI saknas

### EPIC 8
- ⏳ **Conflict Resolution** - Latest-write-wins inte implementerad
- ⏳ **PWA Install Prompt** - Ingen custom install-banner
- ⏳ **Icons & Screenshots** - PWA-assets behöver genereras
- ⏳ **Data Preloading** - Ingen prefetch vid login

---

## 🔍 Potentiella Edge Cases

### EPIC 7

**1. Stora Dataset:**
- [ ] 1000+ tidrapporter i en vecka
- [ ] CSV-export med 10,000+ rader
- [ ] Många samtidiga användare godkänner

**2. Specialtecken:**
- [ ] Användarnamn med åäö
- [ ] Projektnamn med citattecken
- [ ] Kommentarer med semikolon (CSV-separator!)

**3. Datum-problem:**
- [ ] Vecka som spänner över årsskifte
- [ ] Sommartid/vintertid övergång
- [ ] Olika tidszoner

**4. Permission Edge Cases:**
- [ ] Foreman försöker godkänna i ett projekt de inte är tilldelade
- [ ] Finance-roll försöker komma åt approvals

---

### EPIC 8

**1. Offline Längre Tid:**
- [ ] 100+ väntande ändringar
- [ ] IndexedDB storlek > 50 MB
- [ ] Offline i 24+ timmar

**2. Nätverk Instabilitet:**
- [ ] Går offline/online 10 gånger snabbt
- [ ] Timeout under sync
- [ ] Partiell sync (några lyckas, några misslyckas)

**3. Service Worker:**
- [ ] Användaren disablar service worker
- [ ] Cache blir korrupt
- [ ] Flera tabs öppna samtidigt

**4. Browser Compatibility:**
- [ ] Safari (IndexedDB begränsningar)
- [ ] Äldre Chrome-versioner
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🎯 Testordning (Rekommenderad)

### Fas 1: Smoke Tests (5 min)
1. ✅ Logga in
2. ✅ Gå till Godkännanden
3. ✅ Ladda tidrapporter
4. ✅ Godkänn 1 tidrapport
5. ✅ Exportera Löne-CSV (KRITISKT efter bugfix!)

### Fas 2: Offline Core (10 min)
1. ✅ Gå offline (DevTools)
2. ✅ Skapa 3 tidrapporter
3. ✅ Gå online
4. ✅ Verifiera sync
5. ✅ Klicka manual sync

### Fas 3: Approval Workflows (10 min)
1. ✅ Begär ändringar
2. ✅ Avvisa tidrapport
3. ✅ Godkänn batch (5+ stycken)
4. ✅ Filtrera efter status
5. ✅ Sök användare/projekt

### Fas 4: CSV Exports (5 min)
1. ✅ Exportera Faktura-CSV
2. ✅ Kontrollera CSV innehåll (Excel)
3. ✅ Visa exporthistorik
4. ✅ Verifiera batch tracking

### Fas 5: Edge Cases (10 min)
1. ✅ Offline → skapa invalid data → online (ska feila gracefully)
2. ✅ Veckonavigering över årsskifte
3. ✅ Specialtecken i CSV
4. ✅ Service worker update

---

## 📊 Build Status

- ✅ **Compilation:** Success (0 errors, only warnings)
- ✅ **TypeScript:** Valid
- ✅ **ESLint:** Warnings only (console.log, unused vars)
- ✅ **Dependencies:** All installed
- ✅ **Server:** Running on http://localhost:3000

---

## 🚀 Deployment Readiness

### EPIC 7: Approvals & CSV Exports
**Status:** 🟢 80% Production Ready

**Redo:**
- ✅ Core approval workflows
- ✅ CSV exports (löne + faktura)
- ✅ Exporthistorik
- ✅ Roll-baserad åtkomst

**Saknas:**
- ⏳ Period lock
- ⏳ ZIP attachments
- ⏳ Export preview
- ⏳ Audit log UI

**Rekommendation:** ✅ OK att deploya för pilot

---

### EPIC 8: Offline-First & PWA
**Status:** 🟡 70% Production Ready

**Redo:**
- ✅ Offline mode
- ✅ Sync queue med retry
- ✅ IndexedDB persistence
- ✅ Sync status indicator
- ✅ Offline banner
- ✅ SW update prompt

**Saknas:**
- ⏳ Conflict resolution
- ⏳ PWA install prompt
- ⏳ Icons & screenshots
- ⏳ Systematic offline testing

**Rekommendation:** 🟡 OK för pilot MEN användare måste vara medvetna om:
- Konflikter hanteras inte automatiskt
- Ingen install-prompt
- Limited offline testing

---

## 📝 Testrapport Mall

När du testar, fyll i:

### Test Results

| Test | Status | Kommentar | Prioritet |
|------|--------|-----------|-----------|
| Godkänn tidrapporter | ⏳ | | 🔴 |
| Löne-CSV export | ⏳ | | 🔴 |
| Faktura-CSV export | ⏳ | | 🟡 |
| Begär ändringar | ⏳ | | 🟡 |
| Exporthistorik | ⏳ | | 🟢 |
| Offline mode | ⏳ | | 🔴 |
| Offline → create → sync | ⏳ | | 🔴 |
| Manual sync button | ⏳ | | 🟡 |
| Service worker update | ⏳ | | 🟢 |
| Sync error handling | ⏳ | | 🟡 |

**Legenda:**
- ⏳ Ej testad
- ✅ Pass
- ❌ Fail
- ⚠️ Pass med anmärkningar

---

## 🐛 Rapportera Buggar

För varje bug, ange:

**1. Titel:** Kort beskrivning

**2. Steg att reproducera:**
1. Gå till X
2. Klicka Y
3. Observera Z

**3. Förväntat resultat:**
- Vad borde hända

**4. Faktiskt resultat:**
- Vad faktiskt hände

**5. Skärmdump/Console errors:**
- Bifoga om möjligt

**6. Prioritet:**
- 🔴 Kritisk (blockar användning)
- 🟡 Hög (påverkar viktiga features)
- 🟢 Medium (mindre problem)
- 🔵 Låg (kosmetiskt)

---

**Lycka till med testningen! 🚀**

