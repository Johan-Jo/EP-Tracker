# EP-Tracker - Testplan (Kompakt)
**Version:** 2.1 | **Datum:** 2025-01-28 | **Status:** Production Testing

---

## 1. Testmiljö

**Produktion:** https://eptracker.vercel.app  
**Webbläsare:** Chrome 130+, Safari 17+, Mobile Safari iOS 16+  
**Enheter:** Desktop (1920x1080), iPhone 13+, iPad Air

---

## 2. Testanvändare

| Roll | Email | Behörigheter |
|------|-------|--------------|
| **Admin** | admin@testorg.se | Full åtkomst |
| **Arbetsledare** | foreman@testorg.se | Planering, godkännanden |
| **Arbetare** | worker@testorg.se | Endast egna projekt |
| **Ekonomi** | finance@testorg.se | Läsbehörighet, export |

---

## 3. Autentisering & Navigation

### TEST-001: Registrering & Inloggning
**Prioritet:** 🔴 Kritisk | **Tid:** 10 min

**Steg:**
1. Registrera ny användare via startsidan
2. Verifiera email
3. Logga in med email + lösenord
4. Verifiera Dashboard visas

**Förväntat:**
- ✅ Användare skapas och kan logga in
- ✅ Rätt meny baserat på roll
- ✅ Magic link fungerar (test separat)

---

## 4. Projekt

### TEST-020: Skapa & Hantera Projekt
**Prioritet:** 🔴 Kritisk | **Tid:** 10 min

**Steg:**
1. Skapa projekt: Namn, projektnummer, kund, datum
2. Lägg till arbetare i teamet
3. Skapa arbetsorder/fas
4. **NYT:** Konfigurera alert-inställningar (arbetsdag 07:00-16:00)
5. Verifiera att alert-inställningar visas på projektsidan

**Förväntat:**
- ✅ Projekt skapas med alla fält
- ✅ Team kan tilldelas
- ✅ Alert settings sparas och visas
- ✅ Endast Admin/Arbetsledare kan redigera

---

## 5. Tidrapportering

### TEST-030: Starta, Stoppa & Redigera Tid
**Prioritet:** 🔴 Kritisk | **Tid:** 15 min

**Steg:**
1. Starta tidrapport på projekt
2. Stoppa efter 2 minuter
3. Registrera manuell tid (bakåt i tiden)
4. Redigera tidrapport
5. Ta bort tidrapport

**Förväntat:**
- ✅ Timer räknar korrekt
- ✅ Manuell tid valideras (slut > start)
- ✅ OB, restid, traktamente fungerar
- ✅ Veckosammanställning visar korrekt

---

## 6. Material & Utlägg

### TEST-040: Registrera Material & Kvitton
**Prioritet:** 🔴 Kritisk | **Tid:** 10 min

**Steg:**
1. Lägg till material: artikel, antal, pris
2. Ladda upp kvittobild (mobil: ta foto)
3. Registrera utlägg (resa, parkering)
4. Verifiera material-översikt per projekt

**Förväntat:**
- ✅ Totalpris beräknas (antal × pris)
- ✅ Kvitto laddas upp till Supabase
- ✅ Material visas per projekt
- ✅ Kan godkännas

---

## 7. Planering

### TEST-050: Veckoplanering & Mobil Dagvy
**Prioritet:** 🟠 Hög | **Tid:** 15 min

**Steg:**
1. Skapa uppdrag i veckoplanering (grid-vy)
2. Dra-och-släpp uppdrag till annan dag
3. Öppna mobil dagvy som Worker
4. Swipe mellan dagar
5. Starta tidrapport direkt från uppdrag

**Förväntat:**
- ✅ Grid visar alla användare + dagar
- ✅ Drag-and-drop fungerar
- ✅ Mobil dagvy optimerad för touch
- ✅ Färgkodning per projekt

---

## 8. Dagbok & ÄTA

### TEST-060: Dagbok & ÄTA med Foton
**Prioritet:** 🟠 Hög | **Tid:** 10 min

**Steg:**
1. Skapa dagboksanteckning: väder, temperatur, text
2. Lägg till foto (mobil: ta bild)
3. Skapa ÄTA: titel, belopp, tid
4. Godkänn ÄTA som Admin

**Förväntat:**
- ✅ Dagbok kopplas till projekt
- ✅ Foton laddas upp (flera samtidigt)
- ✅ ÄTA kan godkännas
- ✅ Lightbox för bilder

---

## 9. Checklistor

### TEST-070: Checklistor från Mall
**Prioritet:** 🟡 Medel | **Tid:** 10 min

**Steg:**
1. Skapa checklista från mall (t.ex. "Besiktning VVS")
2. Bocka av punkter
3. Lägg till kommentar och foto
4. Slutför checklista

**Förväntat:**
- ✅ Mall kopieras korrekt
- ✅ Progress visas (8/15 klara)
- ✅ Status blir "Slutförd" när allt avbockat

---

## 10. Godkännanden

### TEST-080: Godkänn & Exportera
**Prioritet:** 🔴 Kritisk | **Tid:** 10 min

**Steg:**
1. Gå till Godkännanden → Tidrapporter
2. Godkänn en tidrapport
3. Massgodkänn flera tidrapporter
4. Godkänn material/utlägg
5. Exportera till CSV

**Förväntat:**
- ✅ Status ändras till "Godkänd"
- ✅ Massgodkännande fungerar
- ✅ CSV-fil genereras korrekt
- ✅ Endast Admin/Arbetsledare kan godkänna

---

## 11. Inställningar

### TEST-090: Användare & Organisation
**Prioritet:** 🔴 Kritisk | **Tid:** 15 min

**Steg:**
1. Bjud in ny användare (email + roll)
2. Verifiera inbjudningsemail
3. Ändra användarroll
4. Uppdatera organisationsinformation
5. Byt lösenord

**Förväntat:**
- ✅ Inbjudan skickas inom 1 minut
- ✅ Roll påverkar behörigheter direkt
- ✅ Endast Admin kan bjuda in

---

## 12. Push-Notiser & Projekt-Alerts ⭐ **NYT**

### TEST-096: Aktivera Push-Notiser
**Prioritet:** 🔴 Kritisk | **Tid:** 5 min

**Steg:**
1. Inställningar → Notiser → Aktivera
2. Acceptera webbläsarprompt
3. Skicka test-notis

**Förväntat:**
- ✅ FCM token sparas
- ✅ Test-notis visas inom 3 sek
- ✅ Klick öppnar Dashboard

---

### TEST-097: Projekt Alert-inställningar ⭐ **NYT**
**Prioritet:** 🔴 Kritisk | **Tid:** 5 min

**Steg:**
1. Öppna projekt → Alert-inställningar
2. Sätt arbetsdag: 07:00-16:00
3. Aktivera "Notifiera vid check-in/out"
4. Spara och verifiera visning

**Förväntat:**
- ✅ Settings sparas korrekt
- ✅ Visas på projektsidan
- ✅ Kan redigeras via modal

---

### TEST-098: Check-in/out Notiser (Real-time) ⭐ **NYT**
**Prioritet:** 🔴 Kritisk | **Tid:** 10 min

**Steg:**
1. Admin aktiverar notiser (enhet 1)
2. Worker checkar in på projekt (enhet 2)
3. Verifiera Admin får notis (namn, projekt, tid)
4. Worker checkar ut
5. Verifiera Admin får notis med arbetad tid

**Förväntat:**
- ✅ Check-in notis inom 3 sek
- ✅ Check-out notis visar timmar
- ✅ Klick navigerar till projekt
- ✅ Notis endast till Admin/Foreman

---

### TEST-099: Avaktivera Alerts ⭐ **NYT**
**Prioritet:** 🟠 Hög | **Tid:** 3 min

**Steg:**
1. Avaktivera "Notifiera vid check-in"
2. Worker checkar in
3. Verifiera att INGEN notis skickas

**Förväntat:**
- ✅ Ingen notis när avaktiverad
- ✅ Check-out notis fungerar fortfarande

---

## 13. PWA & Offline

### TEST-100: PWA-installation & Offline-funktionalitet
**Prioritet:** 🔴 Kritisk | **Tid:** 20 min

**Steg:**
1. Installera PWA på mobil ("Lägg till på hemskärmen")
2. Stäng av nätverk (flygplansläge)
3. Skapa tidrapport offline
4. Skapa material med foto offline
5. Aktivera nätverk
6. Verifiera synkronisering

**Förväntat:**
- ✅ PWA installeras som app
- ✅ Data sparas lokalt när offline
- ✅ Synkar automatiskt när online
- ✅ "Väntar på synk"-indikator visas

---

## 14. Säkerhet & RBAC

### TEST-110: Rollbaserade Behörigheter
**Prioritet:** 🔴 Kritisk | **Tid:** 15 min

**Steg:**
1. Logga in som Worker → verifiera begränsad meny
2. Försök besöka /dashboard/settings/users (ska blockas)
3. Verifiera endast egna tidrapporter visas
4. Logga in som Admin → verifiera full åtkomst
5. Testa multi-tenancy (Org A ser inte Org B:s data)

**Förväntat:**
- ✅ Worker ser endast egna data
- ✅ Admin/Arbetsledare ser all data
- ✅ Direct URL-access blockeras (403)
- ✅ RLS policies filtrerar per organisation

---

### TEST-115: XSS-skydd
**Prioritet:** 🟠 Hög | **Tid:** 5 min

**Steg:**
1. Skapa tidrapport med kommentar: `<script>alert('XSS')</script>`
2. Skapa projekt med namn: `<img src=x onerror="alert('XSS')">`
3. Visa data

**Förväntat:**
- ✅ Script körs INTE
- ✅ Data escapas korrekt
- ✅ Ingen alert-popup

---

## 15. Prestanda

### TEST-120: Sidladdning & API-respons
**Prioritet:** 🟠 Hög | **Tid:** 10 min

**Mät med Chrome DevTools:**
- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3s
- **API GET requests:** < 500ms
- **API POST requests:** < 1s

**Testa med:**
- 100+ projekt
- 10 foton samtidig uppladdning
- 20 min navigering (memory leaks)

---

## 16. Kompatibilitet

### TEST-130: Cross-browser & Responsive
**Prioritet:** 🔴 Kritisk | **Tid:** 30 min

**Testa i:**
- ✅ Chrome 130+ (Desktop)
- ✅ Safari 17+ (Desktop & iOS)
- ✅ Firefox 131+
- ✅ Mobile Safari (iPhone 13+)
- ✅ Chrome Mobile (Android)

**Responsiv:**
- ✅ Mobile (375px portrait)
- ✅ Tablet (768px)
- ✅ Desktop (1920px)
- ✅ Touch-gester (swipe, drag-and-drop)

---

## Testrapportering

### Prioritering av Buggar

| Prioritet | Beskrivning | SLA |
|-----------|-------------|-----|
| 🔴 **Kritisk** | Blockerar kärnfunktion | Fix omedelbart |
| 🟠 **Hög** | Påverkar viktiga funktioner | Fix inom 24h |
| 🟡 **Medel** | Mindre problem | Fix inom vecka |
| 🟢 **Låg** | Kosmetiska | Backlog |

### Acceptanskriterier

För godkänd release:
- ✅ **Kritiska tester (🔴):** 100% godkända
- ✅ **Höga tester (🟠):** Minst 95% godkända
- ✅ **Medelprioritet (🟡):** Minst 90% godkända
- ✅ **Prestanda:** LCP < 2.5s
- ✅ **Säkerhet:** RBAC + RLS verifierad

---

## Testsammanfattning

| Kategori | Antal Tester | Kritiska |
|----------|--------------|----------|
| Autentisering | 1 | 1 |
| Projekt | 1 | 1 |
| Tidrapportering | 1 | 1 |
| Material | 1 | 1 |
| Planering | 1 | 0 |
| Dagbok/ÄTA | 1 | 0 |
| Checklistor | 1 | 0 |
| Godkännanden | 1 | 1 |
| Inställningar | 1 | 1 |
| **Push-Notiser** ⭐ | **4** | **3** |
| PWA/Offline | 1 | 1 |
| Säkerhet | 2 | 1 |
| Prestanda | 1 | 0 |
| Kompatibilitet | 1 | 1 |
| **TOTALT** | **18** | **12** |

---

**Version:** 2.1 - Kompakt Edition  
**Sidor:** ~8 (vs 40+ i original)  
**EstimatePro AB © 2025**

