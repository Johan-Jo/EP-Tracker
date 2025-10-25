![EP Tracker](./public/images/eptrackerfront.png)

# Omfattande Testplan

**Version:** 1.0  
**Datum:** 2025-10-24  
**Status:** Production Ready Testing  
**Testmiljö:** http://localhost:3000 (utveckling) | Vercel (produktion)

---

## 📋 Innehållsförteckning

1. [Testöversikt](#testöversikt)
2. [Testmiljö & Setup](#testmiljö--setup)
3. [Testanvändare](#testanvändare)
4. [Funktionell Testning](#funktionell-testning)
5. [Säkerhetstestning](#säkerhetstestning)
6. [Prestandatestning](#prestandatestning)
7. [Kompatibilitetstestning](#kompatibilitetstestning)
8. [Offline & PWA-testning](#offline--pwa-testning)
9. [Användbarhetstestning](#användbarhetstestning)
10. [Integrationstestning](#integrationstestning)
11. [Testrapportering](#testrapportering)

---

## Testöversikt

### Systemöversikt
EP Tracker är en offline-first PWA för tidrapportering, projekthantering och fältoperationer i svensk byggbransch.

### Omfattning
Denna testplan täcker:
- ✅ **Phase 1 MVP:** Alla kärnfunktioner (EPIC 1-9)
- ✅ **Phase 2 Super Admin:** Alla administratörsfunktioner (EPIC 10-21)
- ✅ **Phase 2.1 Planning:** Veckoplanering & mobil dagvy (EPIC 22-24)

### Testtyper
- **Funktionell testning:** Alla features och användarflöden
- **Säkerhetstestning:** RBAC, RLS, multi-tenancy
- **Prestandatestning:** Laddningstider, responstider, skalbarhet
- **Kompatibilitetstestning:** Webbläsare, enheter, skärmstorlekar
- **Offline-testning:** PWA, sync, offline-läge
- **Användbarhetstestning:** UX, accessibility, språkstöd
- **Integrationstestning:** Stripe, Resend, Supabase

### Testmetodik
- **Exploratory Testing:** Fri utforskning av systemet
- **Scripted Testing:** Definierade testfall och steg
- **Regression Testing:** Verifiera att tidigare fungerande features fortfarande fungerar
- **Acceptance Testing:** Verifiera att systemet möter krav

---

## Testmiljö & Setup

### Utvecklingsmiljö

```bash
# Starta dev server
npm run dev

# Server körs på:
http://localhost:3000
```

### Testanvändare
Se [Testanvändare](#testanvändare) nedan.

### Webbläsare för testning
- ✅ Chrome 130+ (primär)
- ✅ Firefox 131+
- ✅ Edge 130+
- ✅ Safari 17+ (iOS & macOS)
- ✅ Mobile Safari (iOS 16+)
- ✅ Chrome Mobile (Android 12+)

### Testdata
- **Organisationer:** Minst 3 test-organisationer
- **Användare:** Minst 10 användare med olika roller
- **Projekt:** Minst 15 aktiva projekt
- **Tidrapporter:** Minst 100 tidrapporter
- **Material/Utlägg:** Minst 50 poster

---

## Testanvändare

### Admin-användare
- **Email:** `admin@testorg.se`
- **Lösenord:** `[Se testmiljö]`
- **Roll:** Admin
- **Behörigheter:** Full åtkomst till allt

### Foreman-användare
- **Email:** `foreman@testorg.se`
- **Lösenord:** `[Se testmiljö]`
- **Roll:** Foreman
- **Behörigheter:** Kan se all data, starta bemanning

### Worker-användare
- **Email:** `worker@testorg.se`
- **Lösenord:** `[Se testmiljö]`
- **Roll:** Worker
- **Behörigheter:** Ser endast egen data

### Finance-användare
- **Email:** `finance@testorg.se`
- **Lösenord:** `[Se testmiljö]`
- **Roll:** Finance
- **Behörigheter:** Read-only för all data

### Super Admin-användare
- **Email:** `superadmin@eptracker.se`
- **Lösenord:** `[Se testmiljö]`
- **Roll:** Super Admin
- **Behörigheter:** Global systemåtkomst

---

## Funktionell Testning

### 1. Autentisering & Onboarding

#### 1.1 Registrering (Sign-up)
**Test ID:** AUTH-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 5 min

**Teststeg:**
1. Navigera till `/sign-up`
2. Fyll i email: `testuser@example.com`
3. Fyll i lösenord: `Test123!@#`
4. Fyll i namn: `Test Användare`
5. Klicka "Registrera"
6. Kontrollera email-inkorg för verifieringslänk
7. Klicka på verifieringslänk
8. Logga in med de nya uppgifterna

**Förväntat resultat:**
- ✅ Användare skapas i Supabase Auth
- ✅ Verifieringsemail skickas (via Resend)
- ✅ Efter verifiering kan användaren logga in
- ✅ Omdirigeras till onboarding-flow
- ✅ Profil skapas i `profiles` tabell

**Testdata:**
```
Email: testuser+[timestamp]@example.com
Lösenord: Test123!@#
Namn: Test User
```

---

#### 1.2 Inloggning (Sign-in)
**Test ID:** AUTH-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 3 min

**Teststeg:**
1. Navigera till `/sign-in`
2. Fyll i email: `admin@testorg.se`
3. Fyll i lösenord
4. Klicka "Logga in"

**Förväntat resultat:**
- ✅ Användare loggas in
- ✅ Session skapas (cookie)
- ✅ Omdirigeras till `/dashboard`
- ✅ Användarnamn visas i top nav

---

#### 1.3 Magic Link Inloggning
**Test ID:** AUTH-003  
**Prioritet:** Medel  
**Förväntad tid:** 5 min

**Teststeg:**
1. Navigera till `/sign-in`
2. Klicka "Skicka magic link"
3. Fyll i email
4. Kontrollera email-inkorg
5. Klicka på magic link
6. Verifiera inloggning

**Förväntat resultat:**
- ✅ Magic link-email skickas
- ✅ Länk är giltig i 60 minuter
- ✅ Användare loggas in automatiskt
- ✅ Omdirigeras till dashboard

---

#### 1.4 Onboarding Flow
**Test ID:** AUTH-004  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som ny användare (första gången)
2. Följ onboarding-stegen:
   - Välkommen-skärm
   - Feature tour
   - Quick start checklist
3. Slutför onboarding
4. Verifiera att välkomstmodal inte visas igen

**Förväntat resultat:**
- ✅ Välkomstmodal visas första gången
- ✅ Feature tour visar alla nyckelfeatures
- ✅ Quick start checklist är synlig
- ✅ Onboarding-status sparas (localStorage)
- ✅ Vid nästa inloggning: ingen modal

---

### 2. Dashboard & Navigation

#### 2.1 Dashboard Översikt
**Test ID:** DASH-001  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. Logga in som Admin
2. Verifiera dashboard-innehåll:
   - Statskort (projekt, tidrapporter, material, etc.)
   - Senaste aktivitet
   - Snabbåtgärder
3. Klicka på olika statskort
4. Verifiera navigation

**Förväntat resultat:**
- ✅ Dashboard laddas < 2 sekunder
- ✅ Alla statskort visar korrekt data
- ✅ Klick på statskort navigerar till rätt sida
- ✅ Användarnamn och avatar visas korrekt

---

#### 2.2 Desktop Navigation
**Test ID:** NAV-001  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. Öppna app i desktop-läge (>768px bredd)
2. Verifiera sidebar:
   - Logo och organisation
   - Navigation items
   - Aktiv route highlightad
   - Settings section
3. Klicka på varje navigation item
4. Verifiera routing

**Förväntat resultat:**
- ✅ Sidebar alltid synlig på desktop
- ✅ Aktiv route visuellt markerad
- ✅ Hover-effekter fungerar
- ✅ Icons och labels tydliga
- ✅ Rollbaserade items synliga (admin ser alla)

---

#### 2.3 Mobile Navigation
**Test ID:** NAV-002  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. Öppna app i mobile-läge (<768px bredd)
2. Verifiera bottom navigation:
   - 5 huvudnavigation items
   - Icons och labels
   - Aktiv route highlightad
3. Navigera mellan sidor
4. Verifiera att bottom nav alltid är synlig

**Förväntat resultat:**
- ✅ Sidebar dold på mobile
- ✅ Bottom navigation alltid synlig
- ✅ Stor touch-area på knappar (min 44x44px)
- ✅ Smooth transitions
- ✅ Timer widget ovanför bottom nav

---

### 3. Projekthantering

#### 3.1 Projektlista
**Test ID:** PROJ-001  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. Navigera till `/dashboard/projects`
2. Verifiera projektlista:
   - Alla aktiva projekt visas
   - Projektkort visar: namn, klient, status, färg
   - Färgindikator på varje kort
3. Använd sökfunktion
4. Använd filter (status, klient)
5. Klicka på ett projekt

**Förväntat resultat:**
- ✅ Alla projekt laddas korrekt
- ✅ Sökning filtrerar i realtid
- ✅ Filter fungerar
- ✅ Klick öppnar projektdetaljer
- ✅ Empty state visas om inga projekt

---

#### 3.2 Skapa Projekt
**Test ID:** PROJ-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 8 min

**Teststeg:**
1. Navigera till `/dashboard/projects`
2. Klicka "Nytt projekt"
3. Fyll i formulär:
   - **Projektnamn:** "Test Projekt ABC"
   - **Klient:** "Test Klient AB"
   - **Projektnummer:** "TP-2025-001"
   - **Status:** Aktiv
   - **Färg:** Välj blå
   - **Adress:** "Testgatan 1, Stockholm"
   - **Daglig kapacitet:** 3 personer
4. Klicka "Spara"
5. Verifiera att projekt skapas

**Förväntat resultat:**
- ✅ Formulärvalidering fungerar
- ✅ Projekt skapas i databas
- ✅ Omdirigeras till projektdetaljer
- ✅ Success-meddelande visas
- ✅ Projekt synligt i projektlista

**Testdata:**
```json
{
  "name": "Test Projekt ABC",
  "client_name": "Test Klient AB",
  "project_number": "TP-2025-001",
  "status": "active",
  "color": "#3B82F6",
  "address": "Testgatan 1, Stockholm",
  "daily_capacity": 3
}
```

---

#### 3.3 Projektdetaljer
**Test ID:** PROJ-003  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna ett projekt
2. Verifiera tabs:
   - **Översikt:** Projektinfo, statistik
   - **Faser:** Lista över faser
   - **Arbetsorder:** Lista över arbetsorder
   - **Team:** Tilldelade användare
3. Testa varje tab
4. Redigera projektinfo
5. Spara ändringar

**Förväntat resultat:**
- ✅ Alla tabs laddas korrekt
- ✅ Data visas korrekt
- ✅ Edit-funktionalitet fungerar
- ✅ Ändringar sparas i databas

---

#### 3.4 Faser (Phases)
**Test ID:** PROJ-004  
**Prioritet:** Medel  
**Förväntad tid:** 8 min

**Teststeg:**
1. Öppna projekt → Faser-tab
2. Klicka "Lägg till fas"
3. Fyll i fasnamn: "Grundarbete"
4. Spara
5. Verifiera att fas skapas
6. Redigera fasnamn
7. Ta bort fas (om möjligt)

**Förväntat resultat:**
- ✅ Fas skapas
- ✅ Visas i lista
- ✅ Kan redigeras
- ✅ Kan tas bort (om inga relaterade poster)

---

#### 3.5 Arbetsorder (Work Orders)
**Test ID:** PROJ-005  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna projekt → Arbetsorder-tab
2. Klicka "Lägg till arbetsorder"
3. Fyll i formulär:
   - **Namn:** "Betonggjutning"
   - **Beskrivning:** "Gjutning av grund"
   - **Fas:** Välj "Grundarbete"
   - **Status:** Planerad
4. Spara
5. Verifiera arbetsorder i lista
6. Ändra status (Pågående → Klar)
7. Redigera arbetsorder
8. Ta bort arbetsorder

**Förväntat resultat:**
- ✅ Arbetsorder skapas
- ✅ Status uppdateras
- ✅ Kan redigeras
- ✅ Kan tas bort

---

#### 3.6 Projektteam
**Test ID:** PROJ-006  
**Prioritet:** Medel  
**Förväntad tid:** 8 min

**Teststeg:**
1. Öppna projekt → Team-tab
2. Klicka "Lägg till teammedlem"
3. Välj användare från lista
4. Spara
5. Verifiera att användare läggs till
6. Ta bort användare från team
7. Verifiera borttagning

**Förväntat resultat:**
- ✅ Användare kan läggas till projekt
- ✅ Endast org-medlemmar visas i lista
- ✅ Användare kan tas bort från projekt
- ✅ Project-level access control fungerar

---

### 4. Tidrapportering

#### 4.1 Timer Widget - Grundläggande
**Test ID:** TIME-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som vilken användare
2. Verifiera timer widget:
   - Synlig längst ner till höger (desktop)
   - Ovanför mobile nav (mobile)
3. Expandera timer widget
4. Välj projekt
5. Klicka "Starta tid"
6. Verifiera att timer räknar (HH:MM:SS)
7. Navigera till annan sida
8. Verifiera att timer fortfarande räknar
9. Klicka "Stopp"
10. Verifiera att tidrapport skapas

**Förväntat resultat:**
- ✅ Timer widget alltid synlig
- ✅ Timer räknar korrekt
- ✅ Timer fortsätter vid sidnavigation
- ✅ Tidrapport skapas vid stopp
- ✅ Tidrapport visas i lista

---

#### 4.2 Timer Widget - Persistence
**Test ID:** TIME-002  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. Starta timer
2. Vänta 30 sekunder
3. Refresh sidan (F5)
4. Verifiera att timer fortsätter räkna
5. Verifiera att tid är korrekt

**Förväntat resultat:**
- ✅ Timer-state sparas (localStorage)
- ✅ Timer fortsätter efter refresh
- ✅ Tid räknas korrekt (ingen tid förloras)

---

#### 4.3 Manuell Tidrapport
**Test ID:** TIME-003  
**Prioritet:** Hög  
**Förväntad tid:** 8 min

**Teststeg:**
1. Navigera till `/dashboard/time`
2. Klicka tab "Lägg till tid"
3. Fyll i formulär:
   - **Projekt:** Välj projekt
   - **Fas:** Välj fas (om projekt har faser)
   - **Arbetsorder:** Välj arbetsorder (om finns)
   - **Datum:** Idag
   - **Starttid:** 08:00
   - **Sluttid:** 16:00
   - **Paus:** 30 min
   - **Uppgift:** "Testarbete"
   - **Anteckningar:** "Test notes"
4. Klicka "Spara"
5. Verifiera tidrapport i "Översikt"-tab

**Förväntat resultat:**
- ✅ Formulär valideras korrekt
- ✅ Tidrapport skapas
- ✅ Duration beräknas: 7.5 timmar
- ✅ Visas i lista med alla detaljer
- ✅ Status: "Utkast"

---

#### 4.4 Tidrapport-lista & Filter
**Test ID:** TIME-004  
**Prioritet:** Medel  
**Förväntad tid:** 8 min

**Teststeg:**
1. Navigera till `/dashboard/time`
2. Tab "Översikt"
3. Verifiera lista:
   - Grupperad per datum
   - Datum headers på svenska
   - Dagliga summor
4. Använd filter:
   - **Projekt:** Filtrera på specifikt projekt
   - **Status:** Filtrera på "Utkast"
5. Verifiera att lista uppdateras
6. Rensa filter

**Förväntat resultat:**
- ✅ Tidrapporter grupperade per datum
- ✅ Summor beräknas korrekt
- ✅ Filter fungerar
- ✅ URL params uppdateras
- ✅ Data refetchas vid filterändring

---

#### 4.5 Redigera Tidrapport
**Test ID:** TIME-005  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. I tidrapport-lista, hitta en "Utkast"-tidrapport
2. Klicka "Redigera"
3. Ändra sluttid
4. Spara
5. Verifiera att duration uppdateras
6. Försök redigera godkänd tidrapport (som worker)

**Förväntat resultat:**
- ✅ Utkast kan redigeras
- ✅ Ändringar sparas
- ✅ Duration uppdateras automatiskt
- ✅ Godkända tidrapporter kan INTE redigeras (workers)
- ✅ Admin kan redigera godkända

---

#### 4.6 Ta bort Tidrapport
**Test ID:** TIME-006  
**Prioritet:** Medel  
**Förväntad tid:** 3 min

**Teststeg:**
1. Hitta en utkast-tidrapport
2. Klicka "Ta bort"
3. Bekräfta i dialog
4. Verifiera att tidrapport försvinner
5. Försök ta bort godkänd tidrapport (som worker)

**Förväntat resultat:**
- ✅ Utkast kan tas bort
- ✅ Bekräftelsedialog visas
- ✅ Tidrapport raderas från databas
- ✅ Godkända tidrapporter kan INTE tas bort (workers)

---

#### 4.7 Starta Bemanning (Crew Clock-in)
**Test ID:** TIME-007  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som Admin eller Foreman
2. Navigera till `/dashboard/time`
3. Klicka tab "Starta bemanning"
4. Välj användare (checka 3 st)
5. Välj projekt
6. Välj fas (om finns)
7. Klicka "Starta tid för valda"
8. Verifiera success-meddelande
9. Gå till "Översikt"-tab
10. Verifiera att 3 tidrapporter skapats

**Förväntat resultat:**
- ✅ Tab synlig endast för admin/foreman
- ✅ Användarlista visar alla org-medlemmar
- ✅ Kan välja flera användare
- ✅ "Välj alla" / "Rensa" fungerar
- ✅ Tidrapporter skapas för alla valda
- ✅ Samma starttid för alla

**Rolltest:**
- ✅ Worker ser INTE "Starta bemanning"-tab
- ✅ Finance ser INTE "Starta bemanning"-tab

---

### 5. Material, Utlägg & Milersättning

#### 5.1 Material - Skapa med Foto
**Test ID:** MAT-001  
**Prioritet:** Hög  
**Förväntad tid:** 8 min

**Teststeg:**
1. Navigera till `/dashboard/materials`
2. Tab "Material"
3. Fyll i formulär:
   - **Beskrivning:** "Trävirke för takstolar"
   - **Antal:** 45
   - **Enhet:** Välj "m"
   - **Pris/enhet:** 125.50
   - **Projekt:** Välj projekt
   - **Fas:** Välj fas (optional)
4. Klicka "📷 Ta foto/välj"
5. Välj bild från dator (eller ta foto på mobil)
6. Verifiera fotoförhandsvisning
7. Klicka "Spara Material"
8. Verifiera i lista nedan

**Förväntat resultat:**
- ✅ Foto laddas upp till Supabase Storage
- ✅ Förhandsvisning visas under knapp
- ✅ Material skapas med foto-URL
- ✅ Total beräknas: 45 × 125.50 = 5,647.50 kr
- ✅ Material visas i lista med thumbnail
- ✅ Klick på thumbnail öppnar lightbox

---

#### 5.2 Material - Utan Foto
**Test ID:** MAT-002  
**Prioritet:** Medel  
**Förväntad tid:** 5 min

**Teststeg:**
1. Fyll i materialformulär
2. Skippa foto
3. Spara
4. Verifiera att material skapas utan foto

**Förväntat resultat:**
- ✅ Material skapas utan foto
- ✅ Ingen foto-placeholder i lista
- ✅ Alla andra fält sparas korrekt

---

#### 5.3 Material - Filter & Totalsummor
**Test ID:** MAT-003  
**Prioritet:** Medel  
**Förväntad tid:** 5 min

**Teststeg:**
1. Skapa flera material för olika projekt
2. Använd filter:
   - **Projekt:** Filtrera på specifikt projekt
   - **Status:** Filtrera på "Draft"
3. Verifiera att lista uppdateras
4. Verifiera att totalsummor uppdateras

**Förväntat resultat:**
- ✅ Filter fungerar
- ✅ Endast filtrerade material visas
- ✅ Totalsumma beräknas för filtrerade poster
- ✅ Kan rensa filter

---

#### 5.4 Material - Ta bort
**Test ID:** MAT-004  
**Prioritet:** Medel  
**Förväntad tid:** 3 min

**Teststeg:**
1. Hitta utkast-material
2. Klicka "🗑️ Ta bort"
3. Bekräfta
4. Verifiera borttagning

**Förväntat resultat:**
- ✅ Material tas bort
- ✅ Foto raderas från Storage
- ✅ Totalsumma uppdateras

---

#### 5.5 Utlägg - Skapa med Kvitto
**Test ID:** EXP-001  
**Prioritet:** Hög  
**Förväntad tid:** 8 min

**Teststeg:**
1. Tab "Utlägg"
2. Fyll i formulär:
   - **Kategori:** "Drivmedel"
   - **Beskrivning:** "Bensin för arbetsfordon"
   - **Belopp:** 850.00
   - **Moms inkluderad:** ✓
   - **Projekt:** Välj projekt
3. Ladda upp kvittobild
4. Spara
5. Verifiera i lista

**Förväntat resultat:**
- ✅ Utlägg skapas
- ✅ Kvitto laddas upp
- ✅ Kategori-badge visas
- ✅ "Inkl. moms"-tag visas
- ✅ Totalsumma uppdateras

---

#### 5.6 Milersättning - Standard Rate
**Test ID:** MIL-001  
**Prioritet:** Hög  
**Förväntad tid:** 8 min

**Teststeg:**
1. Tab "Milersättning"
2. Fyll i formulär:
   - **Projekt:** Välj projekt
   - **Datum:** Idag
   - **Kilometer:** 150
   - **Pris/km:** Klicka "Standard" (1.85 kr/km)
   - **Från:** "Kontoret, Stockholm"
   - **Till:** "Byggplats, Uppsala"
   - **Anteckningar:** "Materialinköp"
3. Verifiera auto-kalkylering: 150 × 1.85 = 277.50 kr
4. Spara
5. Verifiera i lista: "150.0 km (15.0 mil)"

**Förväntat resultat:**
- ✅ Standard rate: 1.85 kr/km
- ✅ Info-text: "Skatteverkets schablon 2025: 18.50 kr/mil"
- ✅ Total beräknas korrekt
- ✅ Km → mil konvertering: 150 km = 15.0 mil
- ✅ Visas korrekt i lista

---

### 6. ÄTA (Change Orders)

#### 6.1 Skapa ÄTA
**Test ID:** ATA-001  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Navigera till `/dashboard/ata`
2. Klicka "Ny ÄTA"
3. Fyll i formulär:
   - **Titel:** "Tilläggsisolering"
   - **Beskrivning:** "Extra isolering i taket"
   - **Kategori:** "Tilläggsarbete"
   - **Uppskattad kostnad:** 15000
   - **Projekt:** Välj projekt
4. Ladda upp 3 foton
5. Spara
6. Verifiera i ÄTA-lista

**Förväntat resultat:**
- ✅ ÄTA skapas
- ✅ Foton laddas upp
- ✅ Status: "Draft"
- ✅ Visas i lista

---

#### 6.2 ÄTA Godkännande
**Test ID:** ATA-002  
**Prioritet:** Hög  
**Förväntad tid:** 8 min

**Teststeg:**
1. Öppna en draft-ÄTA
2. Klicka "Skicka för godkännande"
3. Signera digitalt (om implementerat)
4. Bekräfta
5. Verifiera status-ändring: Draft → Pending Approval
6. Logga in som Admin
7. Godkänn ÄTA
8. Verifiera status: Pending Approval → Approved

**Förväntat resultat:**
- ✅ Kan skickas för godkännande
- ✅ Status uppdateras
- ✅ Admin kan godkänna
- ✅ Godkänd ÄTA kan inte redigeras (worker)

---

### 7. Dagbok (Diary)

#### 7.1 Skapa Dagboksinlägg
**Test ID:** DIARY-001  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. Navigera till `/dashboard/diary`
2. Klicka "Nytt inlägg"
3. Fyll i formulär:
   - **Datum:** Idag
   - **Projekt:** Välj projekt
   - **Väder:** Soligt
   - **Temperatur:** 18°C
   - **Antal arbetare:** 5
   - **Utfört arbete:** "Betonggjutning färdigställd"
   - **Anteckningar:** "Inga problem"
4. Ladda upp 2 foton
5. Spara
6. Verifiera i dagbokslista

**Förväntat resultat:**
- ✅ Dagboksinlägg skapas
- ✅ Väder sparas
- ✅ Foton laddas upp
- ✅ Visas i lista/kalender

---

### 8. Checklistor

#### 8.1 Skapa Checklist från Mall
**Test ID:** CHECK-001  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. Navigera till `/dashboard/checklists`
2. Klicka "Ny checklista"
3. Välj mall: "Säkerhetskontroll"
4. Välj projekt & arbetsorder
5. Spara
6. Öppna checklista
7. Checka av 3 items
8. Lägg till anteckning på ett item
9. Spara
10. Verifiera progress (3/10 klara)

**Förväntat resultat:**
- ✅ Checklist skapas från mall
- ✅ Alla items kopieras
- ✅ Items kan checkas av
- ✅ Anteckningar kan läggas till
- ✅ Progress beräknas korrekt

---

### 9. Godkännanden & Export

#### 9.1 Veckovis Godkännande
**Test ID:** APPR-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Logga in som Admin eller Foreman
2. Navigera till `/dashboard/approvals`
3. Välj vecka (föregående vecka)
4. Granska:
   - Tidrapporter
   - Material
   - Utlägg
   - Milersättning
5. Klicka "Godkänn vecka"
6. Bekräfta
7. Verifiera att alla poster får status "Approved"
8. Verifiera att period låses (kan inte redigeras)

**Förväntat resultat:**
- ✅ Alla poster för veckan visas
- ✅ Summor beräknas korrekt
- ✅ Kan godkänna hela veckan
- ✅ Status uppdateras för alla poster
- ✅ Period låses (no more edits)

---

#### 9.2 Export till CSV
**Test ID:** APPR-002  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Efter godkänd vecka
2. Klicka "Exportera lönerapport"
3. CSV-fil laddas ner
4. Öppna fil i Excel
5. Verifiera innehåll:
   - Alla tidrapporter för veckan
   - Användare, projekt, timmar
   - Summor per användare
6. Klicka "Exportera fakturaunderlag"
7. Verifiera innehåll:
   - Tidrapporter grupperade per projekt
   - Material & utlägg per projekt
   - Totalsummor

**Förväntat resultat:**
- ✅ CSV genereras korrekt
- ✅ Alla data inkluderas
- ✅ Summor stämmer
- ✅ Öppnas korrekt i Excel
- ✅ Svenska tecken visas korrekt (UTF-8)

---

### 10. Planering (Planning System)

#### 10.1 Veckoplanering - Desktop
**Test ID:** PLAN-001  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. Logga in som Admin/Foreman
2. Navigera till `/dashboard/planning`
3. Verifiera veckogrid:
   - 7 dagar (Mån-Sön)
   - Användare i rader
   - Projekt-filter chips längst upp
4. Klicka "Lägg till tilldelning"
5. Fyll i:
   - **Användare:** Välj användare
   - **Projekt:** Välj projekt
   - **Datum:** Välj dag
   - **Tid:** 08:00 - 16:00
   - **Anteckningar:** "Test tilldelning"
6. Spara
7. Verifiera att kort visas i grid

**Förväntat resultat:**
- ✅ Grid visar aktuell vecka
- ✅ Kan navigera mellan veckor
- ✅ Tilldelningar visas som kort
- ✅ Projekt-färger visas på kort
- ✅ Kapacitetsindikatorer visas

---

#### 10.2 Drag-and-Drop Tilldelning
**Test ID:** PLAN-002  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. I planning grid
2. Dra ett tilldelningskort till annan dag
3. Verifiera att kort flyttas
4. Verifiera att databas uppdateras
5. Refresh sidan
6. Verifiera att ändring sparats

**Förväntat resultat:**
- ✅ Kort kan dras till annan dag
- ✅ Optimistic update (instant UI)
- ✅ API-call i bakgrund
- ✅ Rollback vid fel
- ✅ Ändringar persisteras

---

#### 10.3 Mobile Today - Dagens jobb
**Test ID:** PLAN-003  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som Worker på mobil
2. Navigera till `/dashboard/planning/today`
3. Verifiera dagens jobb-lista:
   - Alla tilldelningar för idag visas
   - Projekt, klient, adress, tid
4. Klicka "Checka in" på ett jobb
5. Verifiera status-ändring: Planned → In Progress
6. Klicka "Checka ut"
7. Verifiera status: In Progress → Done

**Förväntat resultat:**
- ✅ Dagens jobb visas
- ✅ Touch-friendly UI
- ✅ Check-in/out fungerar
- ✅ Optimistic updates
- ✅ Status uppdateras i databas

---

#### 10.4 Navigation till Arbetsplats
**Test ID:** PLAN-004  
**Prioritet:** Medel  
**Förväntad tid:** 5 min

**Teststeg:**
1. I Mobile Today-lista
2. Klicka "Navigera" på ett jobb med adress
3. Verifiera att Google Maps öppnas
4. Verifiera att destination är korrekt

**Förväntat resultat:**
- ✅ Google Maps öppnas i ny flik/app
- ✅ Destination satt korrekt
- ✅ Fungerar på iOS och Android

---

### 11. Super Admin Panel

#### 11.1 Organization Management
**Test ID:** SADMIN-001  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som Super Admin
2. Navigera till `/super-admin/organizations`
3. Verifiera organisationslista
4. Klicka på en organisation
5. Granska:
   - Org info
   - Användare (antal)
   - Projekt (antal)
   - Prenumeration
6. Redigera org-namn
7. Spara

**Förväntat resultat:**
- ✅ Alla orgs visas
- ✅ Kan öppna org-detaljer
- ✅ Data visas korrekt
- ✅ Kan redigera org

---

#### 11.2 User Management (Global)
**Test ID:** SADMIN-002  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. Navigera till `/super-admin/users`
2. Sök efter användare
3. Öppna användardetaljer
4. Granska:
   - Profil
   - Org-medlemskap
   - Roll
   - Aktivitet
5. Ändra roll för användare
6. Spara
7. Inaktivera användare
8. Verifiera att användare inte kan logga in

**Förväntat resultat:**
- ✅ Alla användare (alla orgs) visas
- ✅ Sökning fungerar
- ✅ Kan ändra roller
- ✅ Kan inaktivera användare

---

#### 11.3 Billing & Stripe Integration
**Test ID:** SADMIN-003  
**Prioritet:** Kritisk  
**Förväntad tid:** 20 min

**Teststeg:**
1. Navigera till `/super-admin/billing`
2. Välj en organisation
3. Granska:
   - Prenumerationsstatus
   - Plan (Free/Pro/Enterprise)
   - Antal användare (seats)
   - Nästa fakturadatum
4. Klicka "Hantera prenumeration"
5. Verifiera att Stripe Customer Portal öppnas
6. (I Stripe test-läge) Ändra plan
7. Verifiera webhook-hantering

**Förväntat resultat:**
- ✅ Billing-data visas korrekt
- ✅ Stripe Customer Portal öppnas
- ✅ Plan-ändringar reflekteras
- ✅ Webhooks hanteras korrekt
- ✅ Databas uppdateras

---

#### 11.4 System Analytics
**Test ID:** SADMIN-004  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. Navigera till `/super-admin/analytics`
2. Granska:
   - DAU/WAU/MAU (Daily/Weekly/Monthly Active Users)
   - Användarväxt (graf)
   - Feature adoption (vilka features används mest)
   - Innehållsväxt (projekt, tidrapporter, etc.)
3. Ändra tidsintervall
4. Verifiera att grafer uppdateras

**Förväntat resultat:**
- ✅ Analytics-data visas
- ✅ Grafer renderas korrekt
- ✅ Tidsintervall-filter fungerar

---

### 12. Inställningar & Användarhantering

#### 12.1 Organisationsinställningar (Admin)
**Test ID:** SETT-001  
**Prioritet:** Medel  
**Förväntad tid:** 8 min

**Teststeg:**
1. Logga in som Admin
2. Navigera till `/dashboard/settings/organization`
3. Redigera:
   - **Org-namn:** "Test Organization AB"
   - **Org-nummer:** "556123-4567"
   - **Adress:** "Testgatan 1, Stockholm"
4. Spara
5. Verifiera att ändringar sparas

**Förväntat resultat:**
- ✅ Endast admin ser denna sida
- ✅ Ändringar sparas
- ✅ Org-namn uppdateras i sidebar

---

#### 12.2 Användarhantering (Invite)
**Test ID:** SETT-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Navigera till `/dashboard/settings/users`
2. Klicka "Bjud in användare"
3. Fyll i:
   - **Email:** `newuser@example.com`
   - **Roll:** Worker
   - **Timpris:** 250 SEK
4. Skicka inbjudan
5. Kontrollera email-inkorg
6. Klicka på inbjudningslänk
7. Slutför registrering
8. Verifiera att användare läggs till org

**Förväntat resultat:**
- ✅ Inbjudningsemail skickas
- ✅ Länk fungerar
- ✅ Användare skapas och läggs till org
- ✅ Roll tilldelas korrekt
- ✅ Visas i användarlista

---

#### 12.3 Användarhantering (Edit Role)
**Test ID:** SETT-003  
**Prioritet:** Hög  
**Förväntad tid:** 5 min

**Teststeg:**
1. I användarlista
2. Klicka "Redigera" på en användare
3. Ändra roll: Worker → Foreman
4. Spara
5. Logga in som den användaren
6. Verifiera nya behörigheter (kan se "Starta bemanning")

**Förväntat resultat:**
- ✅ Roll kan ändras
- ✅ Behörigheter uppdateras omedelbart
- ✅ UI uppdateras efter roll

---

#### 12.4 Profil-inställningar
**Test ID:** SETT-004  
**Prioritet:** Medel  
**Förväntad tid:** 8 min

**Teststeg:**
1. Navigera till `/dashboard/settings/profile`
2. Redigera:
   - **Namn:** Ändra till "Test Användarnamn"
   - **Telefon:** "070-123 45 67"
   - **Avatar:** Ladda upp bild
3. Spara
4. Verifiera att ändringar sparas
5. Verifiera att avatar uppdateras i top nav

**Förväntat resultat:**
- ✅ Alla användare kan redigera egen profil
- ✅ Avatar laddas upp till Supabase Storage
- ✅ Ändringar reflekteras i UI

---

## Säkerhetstestning

### 1. Role-Based Access Control (RBAC)

#### 1.1 Worker Permissions
**Test ID:** SEC-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Logga in som Worker
2. Försök:
   - ✅ Skapa egen tidrapport (ska fungera)
   - ❌ Se andras tidrapporter (ska INTE fungera)
   - ❌ Redigera andras tidrapporter (ska INTE fungera)
   - ❌ Se "Starta bemanning"-tab (ska INTE synas)
   - ❌ Navigera till `/dashboard/settings/users` (ska redirecta)
   - ❌ Navigera till `/dashboard/settings/organization` (ska redirecta)
3. Försök direkt API-call:
   ```javascript
   fetch('/api/time/entries?user_id=OTHER_USER_ID')
   ```
4. Verifiera 403 Forbidden

**Förväntat resultat:**
- ✅ Worker ser ENDAST egen data
- ✅ API returnerar 403 för obehöriga requests
- ✅ RLS policies blockerar andra användares data

---

#### 1.2 Foreman Permissions
**Test ID:** SEC-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Logga in som Foreman
2. Verifiera:
   - ✅ Kan se alla tidrapporter (read-only för andras)
   - ✅ Kan starta bemanning (crew clock-in)
   - ❌ Kan INTE redigera andras tidrapporter
   - ❌ Kan INTE godkänna tidrapporter
   - ❌ Kan INTE bjuda in användare
3. Försök redigera andras tidrapport via API
4. Verifiera 403

**Förväntat resultat:**
- ✅ Foreman kan se all org-data
- ✅ Kan endast redigera egen data
- ✅ Kan starta bemanning
- ✅ API blockerar obehöriga edits

---

#### 1.3 Finance Read-Only
**Test ID:** SEC-003  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Logga in som Finance
2. Verifiera:
   - ✅ Kan se alla tidrapporter (read-only)
   - ✅ Kan se alla material/utlägg (read-only)
   - ✅ Kan se alla projekt (read-only)
   - ❌ Kan INTE skapa tidrapport
   - ❌ Kan INTE redigera tidrapport
   - ❌ Kan INTE skapa material
3. Försök POST request till `/api/time/entries`
4. Verifiera 403

**Förväntat resultat:**
- ✅ Finance har read-only åtkomst
- ✅ API blockerar alla create/update/delete

---

### 2. Multi-Tenancy Isolation

#### 2.1 Org Isolation
**Test ID:** SEC-004  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Skapa 2 test-organisationer: Org A och Org B
2. Skapa användare i vardera org
3. Skapa projekt i vardera org
4. Logga in som Org A user
5. Försök:
   - Hämta Org B's projekt via API
   - Navigera till Org B's projekt-URL
6. Verifiera att ingen data från Org B visas
7. Testa motsatt: Org B user försöker se Org A data

**Förväntat resultat:**
- ✅ Användare ser ENDAST sin egen org's data
- ✅ RLS policies blockerar cross-org access
- ✅ API returnerar 404 för cross-org requests

---

### 3. XSS & Injection Testing

#### 3.1 XSS i Text Fields
**Test ID:** SEC-005  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Försök injicera XSS i olika fält:
   - Projektnamn: `<script>alert('XSS')</script>`
   - Beskrivning: `<img src=x onerror=alert(1)>`
   - Anteckningar: `javascript:alert(1)`
2. Spara
3. Verifiera att kod INTE exekveras
4. Verifiera att text renderas som text (escaped)

**Förväntat resultat:**
- ✅ Alla inputs saniteras
- ✅ XSS-försök renderas som ren text
- ✅ Ingen kod exekveras

---

### 4. Session & Authentication

#### 4.1 Session Timeout
**Test ID:** SEC-006  
**Prioritet:** Medel  
**Förväntad tid:** 5 min

**Teststeg:**
1. Logga in
2. Vänta 60 minuter (eller modifiera session timeout)
3. Försök utföra en åtgärd
4. Verifiera att session är invalid
5. Verifiera redirect till `/sign-in`

**Förväntat resultat:**
- ✅ Session timeout efter X minuter
- ✅ Redirectas till login
- ✅ Måste logga in igen

---

#### 4.2 Logout
**Test ID:** SEC-007  
**Prioritet:** Hög  
**Förväntad tid:** 3 min

**Teststeg:**
1. Logga in
2. Klicka "Logga ut"
3. Försök navigera till `/dashboard`
4. Verifiera redirect till `/sign-in`
5. Tryck "Tillbaka" i browser
6. Verifiera att dashboard inte är åtkomlig

**Förväntat resultat:**
- ✅ Session raderas
- ✅ Cookie tas bort
- ✅ Kan inte komma åt skyddade sidor

---

## Prestandatestning

### 1. Laddningstider

#### 1.1 Initial Page Load
**Test ID:** PERF-001  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna Chrome DevTools
2. Network tab → Disable cache
3. Navigera till `/dashboard`
4. Mät laddningstid (DOMContentLoaded)
5. Upprepa 5 gånger
6. Beräkna medelvärde

**Acceptanskriterier:**
- ✅ **Mål:** < 2 sekunder
- ⚠️ **Varning:** 2-4 sekunder
- ❌ **Fail:** > 4 sekunder

**Förväntat resultat:**
- ✅ Dashboard laddas < 2 sek
- ✅ Lighthouse Performance Score > 90

---

#### 1.2 Navigation Between Pages
**Test ID:** PERF-002  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. I dashboard, mät tid för navigation:
   - Dashboard → Projects
   - Projects → Time
   - Time → Materials
2. Mät med Performance API
3. Upprepa 5 gånger per route

**Acceptanskriterier:**
- ✅ **Mål:** < 500 ms
- ⚠️ **Varning:** 500-1000 ms
- ❌ **Fail:** > 1000 ms

---

### 2. API Response Times

#### 2.1 GET Endpoints
**Test ID:** PERF-003  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. Mät response time för:
   - `GET /api/time/entries` (100 entries)
   - `GET /api/materials` (50 entries)
   - `GET /api/projects` (20 projects)
2. Använd browser DevTools Network tab
3. Eller Postman
4. Upprepa 10 gånger per endpoint

**Acceptanskriterier:**
- ✅ **Mål:** < 500 ms
- ⚠️ **Varning:** 500-1000 ms
- ❌ **Fail:** > 1000 ms

---

### 3. Large Dataset Testing

#### 3.1 Time Entries List with 1000+ Entries
**Test ID:** PERF-004  
**Prioritet:** Medel  
**Förväntad tid:** 20 min

**Teststeg:**
1. Skapa 1000 tidrapporter via script
2. Navigera till `/dashboard/time`
3. Mät laddningstid
4. Scrolla genom lista
5. Verifiera smooth scrolling
6. Använd filter
7. Mät filter response time

**Acceptanskriterier:**
- ✅ Lista laddas < 3 sek
- ✅ Scrolling är smooth (60 FPS)
- ✅ Filter < 1 sek

**Optimeringar om behövs:**
- Pagination
- Virtual scrolling
- Lazy loading

---

## Kompatibilitetstestning

### 1. Webbläsare

#### 1.1 Desktop Browsers
**Test ID:** COMP-001  
**Prioritet:** Hög  
**Förväntad tid:** 60 min

**Webbläsare att testa:**
- ✅ Chrome 130+
- ✅ Firefox 131+
- ✅ Edge 130+
- ✅ Safari 17+ (macOS)

**Testområden:**
- Layout & styling
- Formulär & validering
- JavaScript-funktionalitet
- Drag-and-drop (planning)
- Photo upload

**Förväntat resultat:**
- ✅ Fungerar identiskt i alla browsers
- ✅ Inga console errors
- ✅ CSS renderas korrekt

---

#### 1.2 Mobile Browsers
**Test ID:** COMP-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 60 min

**Enheter/Browsers att testa:**
- ✅ iOS Safari (iPhone 12+)
- ✅ Chrome Mobile (Android 12+)
- ✅ Samsung Internet (Galaxy S21+)

**Testområden:**
- Responsiv layout
- Touch interactions
- Camera capture
- PWA installation
- Offline mode

**Förväntat resultat:**
- ✅ Perfekt mobil UX
- ✅ Kamera fungerar
- ✅ PWA installeras

---

### 2. Skärmstorlekar

#### 2.1 Breakpoints Testing
**Test ID:** COMP-003  
**Prioritet:** Hög  
**Förväntad tid:** 30 min

**Skärmstorlekar att testa:**
- 📱 **Mobile:** 375px (iPhone SE)
- 📱 **Mobile:** 390px (iPhone 12 Pro)
- 📱 **Mobile:** 414px (iPhone 12 Pro Max)
- 📱 **Tablet:** 768px (iPad)
- 💻 **Desktop:** 1024px
- 💻 **Desktop:** 1920px
- 🖥️ **Large:** 2560px

**Testområden:**
- Navigation (sidebar vs bottom nav)
- Grid layouts
- Forms
- Tables/lists
- Modals/dialogs

**Förväntat resultat:**
- ✅ Responsiv design fungerar
- ✅ Ingen horizontal scrolling
- ✅ Touch targets > 44x44px (mobile)

---

## Offline & PWA-testning

### 1. PWA Installation

#### 1.1 Install PWA on iOS
**Test ID:** PWA-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna app i Safari (iPhone)
2. Klicka Share → Add to Home Screen
3. Namnge app: "EP Tracker"
4. Lägg till på hemskärm
5. Öppna från hemskärm
6. Verifiera att app öppnas i fullscreen (utan Safari-bar)

**Förväntat resultat:**
- ✅ App kan installeras
- ✅ Icon visas på hemskärm
- ✅ Öppnas i fullscreen
- ✅ Manifest fungerar (namn, färg, etc.)

---

#### 1.2 Install PWA on Android
**Test ID:** PWA-002  
**Prioritet:** Kritisk  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna app i Chrome (Android)
2. Klicka "Install app" prompt
3. Installera
4. Öppna från hemskärm
5. Verifiera fullscreen

**Förväntat resultat:**
- ✅ Install prompt visas
- ✅ App installeras
- ✅ Icon på hemskärm
- ✅ Fullscreen mode

---

### 2. Offline Mode

#### 2.1 Offline Queue - Create Entry
**Test ID:** OFFLINE-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Öppna DevTools → Network → Set to "Offline"
2. Verifiera "Offline"-badge i top nav
3. Skapa tidrapport
4. Verifiera att den läggs till i offline queue
5. Verifiera "Pending count" uppdateras
6. Set Network → "Online"
7. Vänta på auto-sync
8. Verifiera att pending count går till 0
9. Verifiera att tidrapport nu finns i databas

**Förväntat resultat:**
- ✅ Kan skapa entries offline
- ✅ Läggs i IndexedDB queue
- ✅ Auto-syncar vid reconnect
- ✅ Data sparas korrekt

---

#### 2.2 Offline Queue - Multiple Entries
**Test ID:** OFFLINE-002  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. Gå offline
2. Skapa 5 tidrapporter
3. Verifiera pending count: 5
4. Gå online
5. Observera sync progress
6. Verifiera att alla 5 syncar

**Förväntat resultat:**
- ✅ Flera entries kan queuas
- ✅ Syncas i ordning
- ✅ Ingen data förloras

---

#### 2.3 Service Worker Caching
**Test ID:** OFFLINE-003  
**Prioritet:** Medel  
**Förväntad tid:** 10 min

**Teststeg:**
1. Öppna app online
2. Navigera mellan sidor
3. Gå offline
4. Navigera mellan sidor igen
5. Verifiera att sidor laddas från cache

**Förväntat resultat:**
- ✅ Service worker installeras
- ✅ Statiska assets cachas
- ✅ Sidor laddas offline (från cache)

---

## Användbarhetstestning

### 1. UX & Accessibility

#### 1.1 Keyboard Navigation
**Test ID:** UX-001  
**Prioritet:** Medel  
**Förväntad tid:** 15 min

**Teststeg:**
1. Navigera genom app endast med tangentbord:
   - Tab för att navigera mellan element
   - Enter för att klicka
   - Esc för att stänga modaler
2. Verifiera:
   - Focus states är synliga
   - Tab order är logisk
   - Alla interaktiva element är åtkomliga

**Förväntat resultat:**
- ✅ Allt kan nås med tangentbord
- ✅ Focus states tydliga
- ✅ Tab order logisk

---

#### 1.2 Screen Reader Compatibility
**Test ID:** UX-002  
**Prioritet:** Medel  
**Förväntad tid:** 20 min

**Teststeg:**
1. Aktivera screen reader (VoiceOver på macOS/iOS, TalkBack på Android)
2. Navigera genom app
3. Verifiera:
   - Alt-texter på bilder
   - ARIA-labels på knappar
   - Heading hierarchy (h1, h2, etc.)
   - Form labels

**Förväntat resultat:**
- ✅ Screen reader kan läsa allt innehåll
- ✅ Semantisk HTML används
- ✅ ARIA-attribut korrekt

---

### 2. Språkstöd (i18n)

#### 2.1 Swedish Language (Primary)
**Test ID:** LANG-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 15 min

**Teststeg:**
1. Verifiera att all text är på svenska:
   - Navigation
   - Formulär
   - Felmeddelanden
   - Success-meddelanden
   - Knappar
2. Kontrollera att ingen engelsk text visas

**Förväntat resultat:**
- ✅ All text på svenska
- ✅ Inga engelska fallbacks synliga

---

#### 2.2 English Fallback
**Test ID:** LANG-002  
**Prioritet:** Låg  
**Förväntad tid:** 10 min

**Teststeg:**
1. Ändra browser language till English
2. Refresh app
3. Verifiera att text ändras till engelska

**Förväntat resultat:**
- ✅ Text översätts till engelska
- ✅ Alla strings har engelska fallbacks

---

### 3. Felhantering

#### 3.1 Formulärvalidering
**Test ID:** ERR-001  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. Försök skapa tidrapport utan att fylla i alla obligatoriska fält
2. Verifiera felmeddelanden:
   - Projekt: "Projekt är obligatoriskt"
   - Starttid: "Starttid är obligatoriskt"
3. Fyll i ogiltiga värden:
   - Sluttid före starttid
   - Negativa tal
4. Verifiera felmeddelanden

**Förväntat resultat:**
- ✅ Validering fungerar
- ✅ Felmeddelanden tydliga
- ✅ Svenska felmeddelanden

---

#### 3.2 Network Error Handling
**Test ID:** ERR-002  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Simulera API-fel (stäng av Supabase tillfälligt)
2. Försök skapa tidrapport
3. Verifiera felmeddelande
4. Verifiera att data läggs i offline queue

**Förväntat resultat:**
- ✅ Användarvänligt felmeddelande
- ✅ Data queuas för senare sync
- ✅ Ingen data förloras

---

## Integrationstestning

### 1. Stripe Integration

#### 1.1 Subscription Creation
**Test ID:** STRIPE-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 20 min

**Teststeg:**
1. Logga in som Super Admin
2. Skapa ny organisation
3. Navigera till Billing
4. Välj "Pro Plan"
5. Använd Stripe test card: `4242 4242 4242 4242`
6. Slutför betalning
7. Verifiera subscription skapas i Stripe
8. Verifiera subscription status uppdateras i databas

**Förväntat resultat:**
- ✅ Stripe Checkout fungerar
- ✅ Subscription skapas
- ✅ Webhook hanteras
- ✅ Databas uppdateras

---

#### 1.2 Webhook Handling
**Test ID:** STRIPE-002  
**Prioritet:** Hög  
**Förväntad tid:** 15 min

**Teststeg:**
1. I Stripe Dashboard, trigga webhook manuellt:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
2. Verifiera att `/api/stripe/webhook` hanterar events
3. Verifiera databas-uppdateringar

**Förväntat resultat:**
- ✅ Webhooks tas emot
- ✅ Event types hanteras korrekt
- ✅ Databas uppdateras

---

### 2. Resend Email Integration

#### 2.1 Welcome Email
**Test ID:** EMAIL-001  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Skapa ny användare (sign-up)
2. Kontrollera email-inkorg
3. Verifiera welcome email:
   - Korrekt avsändare
   - Korrekt mottagare
   - Svensk text
   - Verifieringslänk fungerar

**Förväntat resultat:**
- ✅ Email skickas via Resend
- ✅ Innehåll korrekt
- ✅ Länkar fungerar

---

#### 2.2 Invitation Email
**Test ID:** EMAIL-002  
**Prioritet:** Hög  
**Förväntad tid:** 10 min

**Teststeg:**
1. Bjud in ny användare
2. Kontrollera email
3. Verifiera inbjudningslänk
4. Slutför registrering

**Förväntat resultat:**
- ✅ Invitation email skickas
- ✅ Länk är giltig
- ✅ Användare kan registrera sig

---

### 3. Supabase Storage

#### 3.1 Photo Upload
**Test ID:** STORAGE-001  
**Prioritet:** Kritisk  
**Förväntad tid:** 10 min

**Teststeg:**
1. Skapa material med foto
2. Verifiera att foto laddas upp till:
   - Bucket: `material-photos`
   - Path: `{org_id}/{material_id}/{photo_id}.jpg`
3. Verifiera att URL sparas i databas
4. Öppna foto i lightbox
5. Verifiera att bild visas

**Förväntat resultat:**
- ✅ Foto laddas upp
- ✅ Korrekt bucket & path
- ✅ URL fungerar
- ✅ RLS policies tillåter åtkomst

---

## Testrapportering

### Testrapport-mall

**Testomgång ID:** TR-001  
**Datum:** YYYY-MM-DD  
**Testare:** [Namn]  
**Miljö:** Development / Production  
**Version:** 1.0

#### Sammanfattning
- **Totalt antal testfall:** 100
- **Genomförda:** 95
- **Godkända:** 88
- **Misslyckade:** 7
- **Blockerade:** 5

#### Kritiska buggar
1. **Bug ID: BUG-001**
   - **Titel:** Timer fortsätter inte efter page refresh
   - **Severity:** Kritisk
   - **Steg:**
     1. Starta timer
     2. Refresh sidan
     3. Timer återställs till 00:00:00
   - **Förväntat:** Timer ska fortsätta räkna
   - **Faktiskt:** Timer återställs
   - **Skärmdump:** [Bifoga]

#### Mindre buggar
[Lista mindre buggar]

#### Förbättringsförslag
[Lista UX-förbättringar]

#### Testmiljö
- **OS:** Windows 10 / macOS 14 / iOS 17
- **Browser:** Chrome 130 / Safari 17
- **Skärmstorlek:** 1920x1080 / iPhone 12 Pro

#### Nästa steg
- Fixa kritiska buggar
- Re-test misslyckade testfall
- Regression test

---

## Test Checklist - Snabb översikt

### Innan testing
- [ ] Development server körs (`npm run dev`)
- [ ] Testanvändare skapade (Admin, Foreman, Worker, Finance)
- [ ] Testdata finns (projekt, tidrapporter, etc.)
- [ ] Webbläsare uppdaterade
- [ ] DevTools redo

### Under testing
- [ ] Dokumentera alla buggar
- [ ] Ta skärmdumpar
- [ ] Notera steg för reproduktion
- [ ] Testa i olika browsers
- [ ] Testa på olika enheter

### Efter testing
- [ ] Sammanställ testrapport
- [ ] Prioritera buggar
- [ ] Skapa GitHub issues
- [ ] Kommunicera resultat

---

## Kontakt & Support

**Frågor om testplan:**
- Kontakta utvecklingsteam

**Rapportera buggar:**
- Skapa GitHub issue med label `bug`
- Inkludera: Steg, förväntat, faktiskt, skärmdump

**Testverktyg:**
- Chrome DevTools
- Firefox Developer Tools
- Lighthouse
- Postman (API testing)

---

**Testplan Version:** 1.0  
**Senast uppdaterad:** 2025-10-24  
**Nästa review:** Efter varje major release

---

**Lycka till med testningen! 🚀**

