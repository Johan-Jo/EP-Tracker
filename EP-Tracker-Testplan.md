---
title: "EP-Tracker - Testplan"
subtitle: "Komplett testning för tidrapportering och projekthantering"
version: "2.0"
date: "2025-01-24"
author: "EstimatePro AB"
website: "https://eptracker.vercel.app"
---

<div style="page-break-after: always;"></div>

# EP-Tracker
## Omfattande Testplan

**Version:** 2.0  
**Datum:** 24 januari 2025  
**Status:** Production Testing  
**Produktions-URL:** https://eptracker.vercel.app

---

## Dokumentöversikt

Detta dokument beskriver den kompletta testplanen för EP-Tracker - en offline-first PWA för tidrapportering, projekthantering och fältoperationer i svensk byggbransch.

### Omfattning

Denna testplan täcker:
- ✅ **Kärnfunktioner:** Tidrapportering, projekt, material
- ✅ **Användarroller:** Admin, Arbetsledare, Arbetare, Ekonomi
- ✅ **Planering:** Veckoplanering och mobil dagvy
- ✅ **PWA:** Offline-funktionalitet och synkronisering
- ✅ **Integration:** Betalningar och email

### Målgrupp

Denna testplan riktar sig till:
- QA-testare
- Produktansvariga
- Utvecklingsteam
- Kundacceptanstestare

---

<div style="page-break-after: always;"></div>

## Innehållsförteckning

1. [Testmiljö & Förberedelser](#testmiljö--förberedelser)
2. [Testanvändare & Roller](#testanvändare--roller)
3. [Autentisering](#autentisering)
4. [Dashboard & Navigation](#dashboard--navigation)
5. [Projekt & Arbetsorder](#projekt--arbetsorder)
6. [Tidrapportering](#tidrapportering)
7. [Material & Utlägg](#material--utlägg)
8. [Planering](#planering)
9. [Dagbok & ÄTA](#dagbok--äta)
10. [Checklistor](#checklistor)
11. [Godkännanden](#godkännanden)
12. [Inställningar](#inställningar)
13. [Push-Notiser & Projekt-Alerts](#push-notiser--projekt-alerts) ⭐ **NYT**
14. [PWA & Offline](#pwa--offline)
15. [Säkerhet & Behörigheter](#säkerhet--behörigheter)
16. [Prestanda](#prestanda)
17. [Kompatibilitet](#kompatibilitet)
18. [Testrapportering](#testrapportering)

---

<div style="page-break-after: always;"></div>

## 1. Testmiljö & Förberedelser

### 1.1 Testmiljöer

#### Produktionsmiljö
- **URL:** https://eptracker.vercel.app
- **Databas:** Supabase Production
- **Email:** Resend Production API
- **Betalningar:** Stripe Production (test mode)

#### Lokal utvecklingsmiljö
- **URL:** http://localhost:3000
- **Databas:** Supabase Development
- **Instruktioner:** Kör `npm run dev`

### 1.2 Webbläsare för testning

Testa i följande webbläsare:

| Webbläsare | Version | Prioritet |
|------------|---------|-----------|
| Chrome | 130+ | Hög |
| Firefox | 131+ | Medel |
| Safari | 17+ | Hög |
| Edge | 130+ | Låg |
| Mobile Safari (iOS) | 16+ | Hög |
| Chrome Mobile (Android) | Latest | Hög |

### 1.3 Enheter för testning

- 💻 **Desktop:** 1920x1080, 1366x768
- 📱 **Mobile:** iPhone 13/14/15, Samsung Galaxy S21+
- 📱 **Tablet:** iPad Air, iPad Pro

### 1.4 Testdata

Innan testning, se till att ha:
- ✅ Minst 3 testorganisationer
- ✅ Minst 10 testanvändare med olika roller
- ✅ Minst 15 aktiva projekt
- ✅ Minst 50 tidrapporter
- ✅ Minst 30 material/utläggsposter

---

<div style="page-break-after: always;"></div>

## 2. Testanvändare & Roller

### 2.1 Rollöversikt

| Roll | Beskrivning | Behörigheter |
|------|-------------|--------------|
| **Admin** | Organisationsadministratör | Full åtkomst, kan hantera användare och projekt |
| **Arbetsledare** | Projektledare och planering | Kan se all data, godkänna rapporter, planera |
| **Arbetare** | Fältarbetare | Ser endast sina egna projekt och rapporter |
| **Ekonomi** | Ekonomiavdelning | Läsbehörighet, kan godkänna och exportera |

### 2.2 Testanvändare

#### Admin
- **Email:** `admin@testorg.se`
- **Roll:** Admin
- **Behörigheter:** Full åtkomst till organisation

#### Arbetsledare
- **Email:** `foreman@testorg.se`
- **Roll:** Arbetsledare (Foreman)
- **Behörigheter:** Kan planera, godkänna och se all projektdata

#### Arbetare
- **Email:** `worker@testorg.se`
- **Roll:** Arbetare (Worker)
- **Behörigheter:** Ser endast tilldelade projekt och egen data

#### Ekonomi
- **Email:** `finance@testorg.se`
- **Roll:** Ekonomi (Finance)
- **Behörigheter:** Read-only åtkomst, kan godkänna och exportera

---

<div style="page-break-after: always;"></div>

## 3. Autentisering

### TEST-001: Registrering (Sign-up)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till startsidan → Klicka **"Prova gratis"** eller **"Registrera"**
2. **Steg 1 - Personuppgifter:**
   - Fyll i email: `testuser@example.com`
   - Fyll i lösenord: `Test123!@#`
   - Fyll i namn: `Test Användare`
   - Klicka **"Nästa"**

3. **Steg 2 - Företagsuppgifter:**
   - Företagsnamn: `Test AB`
   - Org.nummer: `556677-8899`
   - Telefon: `070-123 45 67`
   - Adress: `Testgatan 1`
   - Postnummer: `123 45`
   - Ort: `Stockholm`
   - Klicka **"Slutför registrering"**

4. Verifiera att du redirectas till **Email Verification**-sidan
5. Kontrollera inbox för verifieringsmail
6. Klicka på verifieringslänken i emailet
7. Verifiera automatisk inloggning

#### Förväntat resultat

- ✅ Användare skapas i systemet
- ✅ Verifieringsmail skickas inom 1 minut
- ✅ Efter email-verifiering skapas session automatiskt
- ✅ Användare redirectas direkt till Dashboard
- ✅ Organisation och membership skapas korrekt
- ✅ Welcome-meddelande visas

#### Testdata
```
Email: testuser+[timestamp]@example.com
Lösenord: Test123!@#
Namn: Test User
Företag: Test AB
Org.nr: 556677-8899
```

---

### TEST-002: Inloggning (Sign-in)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Navigera till inloggningssidan via **"Logga in"**-knappen
2. Fyll i email: `admin@testorg.se`
3. Fyll i lösenord
4. Klicka **"Logga in"**

#### Förväntat resultat

- ✅ Användare loggas in
- ✅ Session skapas (cookie)
- ✅ Redirect till Dashboard
- ✅ Användarnamn och roll visas i navigation
- ✅ Rätt meny visas baserat på användarroll

---

### TEST-003: Magic Link Inloggning

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till inloggningssidan
2. Klicka på **"Glömt lösenord?"** eller **"Skicka magic link"**
3. Fyll i email
4. Klicka **"Skicka länk"**
5. Kontrollera email-inbox
6. Klicka på magic link i emailet

#### Förväntat resultat

- ✅ Magic link-email skickas inom 1 minut
- ✅ Länken är giltig i 60 minuter
- ✅ Klick på länk loggar in användaren automatiskt
- ✅ Redirect till Dashboard
- ✅ Utgången länk visar felmeddelande

---

### TEST-004: Utloggning (Sign-out)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 2 minuter

#### Teststeg

1. Logga in som valfri användare
2. Klicka på **användarmenyn** (högst upp till höger)
3. Klicka **"Logga ut"**

#### Förväntat resultat

- ✅ Session avslutas
- ✅ Cookies rensas
- ✅ Redirect till startsidan eller inloggningssidan
- ✅ Försök att besöka Dashboard redirectar till inloggning

---

<div style="page-break-after: always;"></div>

## 4. Dashboard & Navigation

### TEST-010: Dashboard - Admin

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Admin**
2. Verifiera Dashboard-vy

#### Förväntat resultat

Dashboard visar:
- ✅ **Snabbstatistik:**
  - Aktiva projekt (antal)
  - Pågående tidrapporter
  - Väntande godkännanden
  - Veckans timmar

- ✅ **Snabbåtkomst:**
  - Starta tidrapport
  - Skapa projekt
  - Lägg till material
  - Se planering

- ✅ **Senaste aktiviteter:**
  - Nya tidrapporter
  - Godkännanden
  - Skapade projekt

- ✅ **Navigation synlig:**
  - Dashboard
  - Tid
  - Projekt
  - Material
  - Planering
  - Dagbok
  - ÄTA
  - Checklistor
  - Godkännanden
  - Inställningar

---

### TEST-011: Dashboard - Arbetsledare

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Arbetsledare**
2. Verifiera Dashboard-vy

#### Förväntat resultat

Dashboard visar:
- ✅ Alla projekt (inte bara tilldelade)
- ✅ Planeringswidget för veckan
- ✅ Väntande godkännanden
- ✅ Teamets timmar (sammanlagt)
- ✅ Full navigationsmeny

---

### TEST-012: Dashboard - Arbetare

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Arbetare**
2. Verifiera Dashboard-vy

#### Förväntat resultat

Dashboard visar:
- ✅ **Endast tilldelade projekt**
- ✅ Dagens uppdrag
- ✅ Egen pågående tidrapport
- ✅ Egna timmar denna vecka
- ✅ **Begränsad navigation:**
  - Dashboard
  - Tid (endast egen)
  - Material (endast egen)
  - Dagbok (endast egen)
- ✅ Inget Projekt-hantering
- ✅ Inga Godkännanden
- ✅ Ingen Planering

---

### TEST-013: Mobil Navigation

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna appen på mobil (eller mobilläge i webbläsare)
2. Verifiera hamburgermeny
3. Testa alla navigationslänkar

#### Förväntat resultat

- ✅ Hamburger-ikon synlig (top-left)
- ✅ Meny öppnas/stängs smooth
- ✅ Alla menyalternativ fungerar
- ✅ Aktiv sida highlightas
- ✅ Swipe-gester fungerar (öppna/stänga meny)

---

<div style="page-break-after: always;"></div>

## 5. Projekt & Arbetsorder

### TEST-020: Skapa Projekt

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Navigera till **Projekt** via menyn
2. Klicka **"Nytt projekt"** eller **"+ Skapa projekt"**
3. Fyll i projektinformation:
   - Projektnamn: `Renovering Storgatan 15`
   - Projektnummer: `2025-001`
   - Kund: `AB Fastigheter`
   - Startdatum: `2025-02-01`
   - Slutdatum: `2025-04-30`
   - Beskrivning: `Totalrenovering av kontor`
   - Välj färg (valfri)
4. Klicka **"Skapa projekt"**

#### Förväntat resultat

- ✅ Projekt skapas och visas i projektlistan
- ✅ Success-meddelande visas
- ✅ Projektet har status "Aktiv"
- ✅ Projektet syns för alla med behörighet
- ✅ Färgkodning appliceras korrekt

---

### TEST-021: Redigera Projekt

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Gå till **Projekt**
2. Klicka på ett befintligt projekt
3. Klicka **"Redigera"** eller ✏️-ikonen
4. Ändra projektnamn och beskrivning
5. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Ändringar sparas direkt
- ✅ Success-meddelande visas
- ✅ Uppdaterade data visas omedelbart
- ✅ Projekthistorik loggas (om implementerat)

---

### TEST-022: Lägg till Arbetare i Projekt

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna ett projekt
2. Gå till **"Team"** eller **"Medlemmar"**-fliken
3. Klicka **"Lägg till medlem"** eller **"Hantera team"**
4. Välj en eller flera arbetare från listan
5. Klicka **"Lägg till"**

#### Förväntat resultat

- ✅ Arbetare läggs till i projektet
- ✅ Arbetare kan nu se projektet i sin vy
- ✅ Arbetare får tillgång att rapportera tid på projektet
- ✅ Lista uppdateras med tillagda medlemmar

---

### TEST-023: Ta bort Arbetare från Projekt

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Öppna projekt med medlemmar
2. Gå till **"Team"**-fliken
3. Klicka **"Ta bort"** eller ❌ bredvid en medlem
4. Bekräfta borttagningen

#### Förväntat resultat

- ✅ Medlem tas bort från projektet
- ✅ Medlem ser inte längre projektet i sin vy
- ✅ Historiska tidrapporter påverkas inte
- ✅ Bekräftelsedialog visas

---

### TEST-024: Skapa Arbetsorder (Fas)

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna ett projekt
2. Gå till **"Faser"** eller **"Arbetsorder"**
3. Klicka **"Ny arbetsorder"**
4. Fyll i:
   - Namn: `VVS-installation`
   - Beskrivning: `Installation av nya rör`
   - Startdatum: `2025-02-15`
   - Slutdatum: `2025-03-01`
   - Budget (timmar): `120`
5. Klicka **"Skapa"**

#### Förväntat resultat

- ✅ Arbetsorder skapas under projektet
- ✅ Visas i projektvy
- ✅ Kan tilldelas arbetare
- ✅ Kan rapporteras tid mot

---

### TEST-025: Projektöversikt & Status

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Öppna projektdetaljer
2. Verifiera översiktsvy

#### Förväntat resultat

Översikt visar:
- ✅ Projektstatus (Planerad/Pågående/Avslutad)
- ✅ Tidsåtgång (totalt & per fas)
- ✅ Budget vs. faktisk tid
- ✅ Tilldelade medlemmar
- ✅ Senaste aktivitet
- ✅ Faser/arbetsorder

---

<div style="page-break-after: always;"></div>

## 6. Tidrapportering

### TEST-030: Starta Tidrapport

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Navigera till **Tid** eller klicka **"Starta tid"** från Dashboard
2. Välj projekt från lista
3. Välj fas/arbetsorder (om tillämpligt)
4. Klicka **"Starta"** eller ▶️

#### Förväntat resultat

- ✅ Timer startar och räknar upp
- ✅ Pågående tidrapport visas i Dashboard
- ✅ **Badge/indikator** visar "Pågående"
- ✅ Starttid loggas korrekt
- ✅ Kan se elapsed time i realtid

---

### TEST-031: Stoppa Tidrapport

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 2 minuter

#### Teststeg

1. Med pågående tidrapport
2. Klicka **"Stoppa"** eller ⏹️
3. Lägg till kommentar (valfritt)
4. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Timer stoppas
- ✅ Total tid beräknas korrekt
- ✅ Tidrapport sparas med status "Godkänd" eller "Väntande"
- ✅ Tidrapport visas i historik
- ✅ Success-meddelande visas

---

### TEST-032: Registrera Manuell Tidrapport

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Tid**
2. Klicka **"Registrera manuellt"** eller **"+ Lägg till tid"**
3. Fyll i:
   - Datum: `2025-01-20`
   - Projekt: Välj från lista
   - Starttid: `08:00`
   - Sluttid: `16:30`
   - Paus: `30 min`
   - Kommentar: `Montering av VVS`
4. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Tidrapport skapas med korrekt total tid (8h)
- ✅ Pausberäkning fungerar korrekt
- ✅ Datum kan vara i det förflutna
- ✅ Validering: Sluttid måste vara efter starttid

---

### TEST-033: Redigera Tidrapport

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Gå till **Tid** → **"Historik"** eller **"Mina timmar"**
2. Hitta en tidrapport (status: Väntande eller Utkast)
3. Klicka **"Redigera"** eller ✏️
4. Ändra tid eller lägg till kommentar
5. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ **Endast egna** tidrapporter kan redigeras (Worker)
- ✅ Admin/Foreman kan redigera alla
- ✅ Godkända tidrapporter kräver extra bekräftelse

---

### TEST-034: Ta bort Tidrapport

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 2 minuter

#### Teststeg

1. Hitta en tidrapport i historik
2. Klicka **"Ta bort"** eller 🗑️
3. Bekräfta borttagning

#### Förväntat resultat

- ✅ Tidrapport tas bort
- ✅ Bekräftelsedialog visas
- ✅ Success-meddelande efter borttagning
- ✅ Kan inte tas bort om redan godkänd (eller varning visas)

---

### TEST-035: Tidrapport med OB/Restid/Traktamente

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Skapa eller redigera tidrapport
2. Markera **"OB"** (ob-tid)
3. Lägg till **"Restid"** (t.ex. 1.5h)
4. Lägg till **"Traktamente"** (hel/halv dag)
5. Spara

#### Förväntat resultat

- ✅ OB markeras och visas tydligt
- ✅ Restid läggs till separat från arbetstid
- ✅ Traktamente registreras
- ✅ Total tid beräknas korrekt (inklusive OB & restid)
- ✅ Rapporter visar alla tillägg

---

### TEST-036: Veckosammanställning

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Gå till **Tid** → **"Veckoöversikt"**
2. Verifiera veckovy

#### Förväntat resultat

- ✅ Alla dagens timrapporter visas per dag
- ✅ Total tid per dag
- ✅ Total tid för veckan
- ✅ Navigera mellan veckor (← →)
- ✅ Färgkodning per projekt

---

<div style="page-break-after: always;"></div>

## 7. Material & Utlägg

### TEST-040: Registrera Material

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Navigera till **Material** via menyn
2. Klicka **"+ Lägg till material"** eller **"Registrera"**
3. Fyll i:
   - Projekt: Välj från lista
   - Artikel: `Kopparrör 15mm`
   - Antal: `25`
   - Enhet: `meter`
   - Pris: `45.00`
   - Leverantör: `Ahlsell`
   - Datum: `2025-01-20`
4. Ladda upp kvitto (valfritt)
5. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Material skapas och kopplas till projekt
- ✅ Totalpris beräknas automatiskt (antal × pris)
- ✅ Kvitto laddas upp till Supabase Storage
- ✅ Material visas i materiallista
- ✅ Success-meddelande visas

---

### TEST-041: Skanna Kvitto (Mobil)

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna appen på **mobil enhet**
2. Gå till **Material** → **"+ Lägg till"**
3. Klicka **"Scanna kvitto"** eller 📷
4. Ta foto av ett kvitto
5. Beskär/justera bilden
6. Klicka **"Använd bild"**
7. Fyll i resterande info
8. Spara

#### Förväntat resultat

- ✅ Kamera öppnas (eller filväljare)
- ✅ Foto tas och förhandsgranskas
- ✅ Bilden laddas upp
- ✅ Kvitto visas i materialposter
- ✅ Kvitto kan öppnas/visas senare

---

### TEST-042: Redigera Material

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Gå till **Material**
2. Klicka på en materialpost
3. Klicka **"Redigera"** eller ✏️
4. Ändra antal eller pris
5. Spara

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ Totalpris uppdateras automatiskt
- ✅ Success-meddelande visas

---

### TEST-043: Ta bort Material

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 2 minuter

#### Teststeg

1. Hitta materialpost
2. Klicka **"Ta bort"** eller 🗑️
3. Bekräfta

#### Förväntat resultat

- ✅ Material tas bort
- ✅ Kvitto raderas från storage
- ✅ Bekräftelsedialog visas

---

### TEST-044: Registrera Utlägg

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Material** eller **"Utlägg/Expenses"**
2. Välj **"Utlägg"** tab
3. Klicka **"+ Lägg till utlägg"**
4. Fyll i:
   - Projekt: Välj
   - Typ: `Resa`, `Mat`, `Parkering`, etc.
   - Belopp: `250.00`
   - Beskrivning: `Parkering byggarbetsplats`
   - Datum: `2025-01-20`
5. Ladda upp kvitto
6. Spara

#### Förväntat resultat

- ✅ Utlägg skapas och kopplas till projekt
- ✅ Kvitto laddas upp
- ✅ Visas separat från material
- ✅ Kan godkännas av admin/foreman

---

### TEST-045: Material-översikt per Projekt

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Öppna ett projekt
2. Gå till **"Material"**-fliken

#### Förväntat resultat

- ✅ Alla material för projektet visas
- ✅ Totalkostnad beräknas
- ✅ Kvitton kan öppnas
- ✅ Filtrera efter datum/typ

---

<div style="page-break-after: always;"></div>

## 8. Planering

### TEST-050: Veckoplanering - Översikt

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Navigera till **Planering** via menyn
2. Verifiera veckovy

#### Förväntat resultat

- ✅ Kalendergrid visas (Mån-Sön)
- ✅ Alla användare listade på Y-axeln
- ✅ Alla uppdrag för veckan visas
- ✅ Kan navigera mellan veckor (← →)
- ✅ Dagens datum highlightas

---

### TEST-051: Skapa Uppdrag i Planering

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Planering**
2. Klicka **"+ Nytt uppdrag"** eller klicka på en cell i grid
3. Fyll i:
   - Datum: Välj dag
   - Användare: Välj arbetare
   - Projekt: Välj projekt
   - Beskrivning: `Montering VVS badrum 3-4`
   - Tid: `08:00 - 16:00`
4. Klicka **"Skapa"**

#### Förväntat resultat

- ✅ Uppdrag skapas i planeringen
- ✅ Visas i grid på rätt dag och användare
- ✅ Färgkodas efter projekt
- ✅ Användare ser uppdraget i sin mobila dagvy

---

### TEST-052: Dra-och-släpp Uppdrag

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. I **Planering**-vyn
2. Dra ett befintligt uppdrag till en annan dag
3. Eller dra till en annan användare

#### Förväntat resultat

- ✅ Uppdrag flyttas smooth
- ✅ Datum uppdateras automatiskt
- ✅ Användartilldelning uppdateras
- ✅ Success-meddelande eller visuell feedback

---

### TEST-053: Redigera Uppdrag

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Klicka på ett uppdrag i planeringen
2. Klicka **"Redigera"**
3. Ändra tid eller beskrivning
4. Spara

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ Grid uppdateras direkt
- ✅ Användare ser ändringarna

---

### TEST-054: Ta bort Uppdrag

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 2 minuter

#### Teststeg

1. Klicka på uppdrag
2. Klicka **"Ta bort"** eller 🗑️
3. Bekräfta

#### Förväntat resultat

- ✅ Uppdrag tas bort från planeringen
- ✅ Grid uppdateras
- ✅ Bekräftelsedialog visas

---

### TEST-055: Mobil Dagvy (Worker)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Arbetare** på **mobil**
2. Gå till **Planering** eller **"Mina uppdrag"**

#### Förväntat resultat

- ✅ **Dagens uppdrag** visas tydligt
- ✅ Swipe för att se andra dagar (← →)
- ✅ Varje uppdrag visar:
  - Projekt (färgkodat)
  - Tid (start - slut)
  - Beskrivning
  - Plats (om angiven)
- ✅ Knapp för **"Starta tidrapport"** direkt från uppdrag
- ✅ Optimerad för touch/mobil

---

<div style="page-break-after: always;"></div>

## 9. Dagbok & ÄTA

### TEST-060: Skapa Dagboksanteckning

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Navigera till **Dagbok** via menyn
2. Klicka **"+ Ny anteckning"**
3. Fyll i:
   - Datum: `2025-01-20`
   - Projekt: Välj projekt
   - Väder: Välj (Sol/Moln/Regn/Snö)
   - Temperatur: `5°C`
   - Text: `Fortsatt arbete med VVS-installation. Inga problem.`
4. Lägg till foto (valfritt)
5. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Dagbokspost skapas
- ✅ Kopplas till projekt
- ✅ Foto laddas upp
- ✅ Visas i dagboken sorterad efter datum

---

### TEST-061: Redigera Dagboksanteckning

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Öppna en dagbokspost
2. Klicka **"Redigera"**
3. Ändra text eller lägg till foto
4. Spara

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ Redigeringshistorik loggas (om implementerat)
- ✅ Success-meddelande

---

### TEST-062: Skapa ÄTA (Ändrings- och Tilläggsarbete)

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Navigera till **ÄTA** via menyn
2. Klicka **"+ Ny ÄTA"**
3. Fyll i:
   - Projekt: Välj projekt
   - Titel: `Tilläggsarbete - Extra eluttag`
   - Beskrivning: `Kunden vill ha 3 extra eluttag i kök`
   - Beräknad kostnad: `8500 kr`
   - Beräknad tid: `12 timmar`
4. Lägg till foto/dokumentation
5. Klicka **"Skapa"**

#### Förväntat resultat

- ✅ ÄTA skapas med status "Utkast" eller "Väntande"
- ✅ Kopplas till projekt
- ✅ Visas i ÄTA-listan
- ✅ Kan godkännas senare

---

### TEST-063: Godkänn ÄTA

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Öppna en ÄTA med status "Väntande"
2. Logga in som **Admin** eller **Arbetsledare**
3. Klicka **"Godkänn"**
4. Bekräfta

#### Förväntat resultat

- ✅ Status ändras till "Godkänd"
- ✅ Timestamp loggas
- ✅ Success-meddelande
- ✅ Kan nu exporteras/faktureras

---

### TEST-064: Lägg till Foto i Dagbok/ÄTA (Mobil)

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna appen på **mobil**
2. Skapa dagbokspost eller ÄTA
3. Klicka **"Lägg till foto"** eller 📷
4. Ta foto eller välj från galleri
5. Lägg till fler foton (max 5-10)
6. Spara

#### Förväntat resultat

- ✅ Foton laddas upp till Supabase Storage
- ✅ Visas som miniatyrer
- ✅ Kan öppnas i fullskärm (lightbox)
- ✅ Kan tas bort innan sparning

---

<div style="page-break-after: always;"></div>

## 10. Checklistor

### TEST-070: Skapa Checklista från Mall

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Navigera till **Checklistor**
2. Klicka **"+ Ny checklista"**
3. Välj **"Använd mall"**
4. Välj t.ex. `Besiktning VVS`
5. Koppla till projekt
6. Klicka **"Skapa"**

#### Förväntat resultat

- ✅ Checklista skapas från mall
- ✅ Alla punkter kopieras
- ✅ Status: "Ej påbörjad"
- ✅ Kopplas till projekt

---

### TEST-071: Fylla i Checklista

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna en checklista
2. Bocka av punkter en i taget
3. Lägg till kommentar på vissa punkter
4. Lägg till foto vid behov
5. Klicka **"Slutför"** när alla punkter är avbockade

#### Förväntat resultat

- ✅ Punkter bockas av (✓)
- ✅ Progress visas (t.ex. "8/15 klara")
- ✅ Kommentarer sparas
- ✅ Foton laddas upp
- ✅ Status ändras till "Slutförd" när allt är klart

---

### TEST-072: Skapa Mall för Checklista

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Gå till **Checklistor** → **"Mallar"**
2. Klicka **"Skapa mall"**
3. Namnge mall: `Besiktning VVS`
4. Lägg till punkter:
   - `Kontrollera läckage`
   - `Testa tryck i system`
   - `Verifiera vattenlås`
   - etc. (10-15 punkter)
5. Klicka **"Spara mall"**

#### Förväntat resultat

- ✅ Mall skapas och sparas
- ✅ Kan återanvändas för nya checklistor
- ✅ Endast Admin/Arbetsledare kan skapa mallar

---

<div style="page-break-after: always;"></div>

## 11. Godkännanden

### TEST-080: Godkänn Tidrapport

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Logga in som **Admin** eller **Arbetsledare**
2. Navigera till **Godkännanden**
3. Öppna fliken **"Tidrapporter"**
4. Välj en tidrapport med status "Väntande"
5. Klicka **"Godkänn"** (✓)

#### Förväntat resultat

- ✅ Status ändras till "Godkänd"
- ✅ Timestamp och godkännare loggas
- ✅ Tidrapport flyttas till "Godkända"
- ✅ Success-meddelande visas

---

### TEST-081: Avvisa Tidrapport

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Som **Admin/Arbetsledare**
2. Gå till **Godkännanden** → **"Tidrapporter"**
3. Välj en tidrapport
4. Klicka **"Avvisa"** (✗)
5. Fyll i kommentar: `Fel projekt valt`
6. Bekräfta

#### Förväntat resultat

- ✅ Status ändras till "Avvisad"
- ✅ Kommentar sparas
- ✅ Användare får notifiering (om implementerat)
- ✅ Tidrapport måste redigeras och skickas in igen

---

### TEST-082: Massgodkänn Tidrapporter

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Gå till **Godkännanden** → **"Tidrapporter"**
2. Markera flera tidrapporter (checkboxes)
3. Klicka **"Godkänn valda"**
4. Bekräfta

#### Förväntat resultat

- ✅ Alla valda tidrapporter godkänns samtidigt
- ✅ Success-meddelande med antal godkända
- ✅ Lista uppdateras

---

### TEST-083: Godkänn Material/Utlägg

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Godkännanden** → **"Material"** eller **"Utlägg"**
2. Öppna en post med status "Väntande"
3. Verifiera kvitto och belopp
4. Klicka **"Godkänn"**

#### Förväntat resultat

- ✅ Material/utlägg godkänns
- ✅ Status ändras till "Godkänd"
- ✅ Kan nu inkluderas i export/faktura

---

### TEST-084: Exportera Godkända Rapporter

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Godkännanden**
2. Välj tidsperiod (t.ex. "Senaste veckan")
3. Markera godkända poster
4. Klicka **"Exportera"** eller **"Ladda ner CSV"**

#### Förväntat resultat

- ✅ CSV- eller PDF-fil genereras
- ✅ Innehåller alla valda poster
- ✅ Korrekt formatering för import till lönesystem
- ✅ Fil laddas ner till enhet

---

<div style="page-break-after: always;"></div>

## 12. Inställningar

### TEST-090: Redigera Organisationsinformation

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Admin**
2. Gå till **Inställningar** → **"Organisation"**
3. Redigera:
   - Företagsnamn
   - Telefon
   - Adress
4. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ Uppdaterad info visas direkt
- ✅ Success-meddelande
- ✅ Endast Admin kan redigera

---

### TEST-091: Bjud in Användare

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Som **Admin**, gå till **Inställningar** → **"Användare"**
2. Klicka **"Bjud in användare"**
3. Fyll i:
   - Email: `newuser@example.com`
   - Namn: `Ny Användare`
   - Roll: Välj `Arbetare`
4. Klicka **"Skicka inbjudan"**
5. Kontrollera att email skickas
6. Öppna email och klicka på inbjudningslänk
7. Sätt lösenord
8. Logga in

#### Förväntat resultat

- ✅ Inbjudningsemail skickas
- ✅ Användare kan sätta lösenord via länk
- ✅ Användare läggs till i organisationen med rätt roll
- ✅ Användare kan logga in direkt

---

### TEST-092: Ändra Användarroll

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Som **Admin**, gå till **Inställningar** → **"Användare"**
2. Hitta en användare
3. Klicka **"Redigera"** eller ✏️
4. Ändra roll från `Arbetare` till `Arbetsledare`
5. Spara

#### Förväntat resultat

- ✅ Roll uppdateras
- ✅ Användarens behörigheter ändras direkt
- ✅ Användare ser nya menyalternativ efter nästa inloggning

---

### TEST-093: Inaktivera Användare

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Som **Admin**, gå till **Användare**
2. Hitta en användare
3. Klicka **"Inaktivera"** eller markera som inaktiv
4. Bekräfta

#### Förväntat resultat

- ✅ Användare inaktiveras
- ✅ Kan inte längre logga in
- ✅ Historisk data bevaras
- ✅ Kan återaktiveras senare

---

### TEST-094: Uppdatera Profil

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 3 minuter

#### Teststeg

1. Som valfri användare
2. Klicka på **användarmeny** (top-right)
3. Välj **"Profil"** eller **"Inställningar"**
4. Ändra namn eller lägg till profilbild
5. Klicka **"Spara"**

#### Förväntat resultat

- ✅ Ändringar sparas
- ✅ Profilbild laddas upp och visas
- ✅ Uppdaterat namn visas i navigation

---

### TEST-095: Byt Lösenord

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Profil** → **"Säkerhet"**
2. Klicka **"Byt lösenord"**
3. Fyll i:
   - Nuvarande lösenord
   - Nytt lösenord: `NewPass123!`
   - Bekräfta nytt lösenord: `NewPass123!`
4. Klicka **"Uppdatera"**
5. Logga ut och logga in med nytt lösenord

#### Förväntat resultat

- ✅ Lösenord uppdateras
- ✅ Success-meddelande
- ✅ Kan logga in med nytt lösenord
- ✅ Gammalt lösenord fungerar inte längre

---

<div style="page-break-after: always;"></div>

## 13. Push-Notiser & Projekt-Alerts

### TEST-096: Aktivera Push-Notiser

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Gå till **Inställningar** → **"Notiser"**
2. Klicka **"Aktivera notiser"**
3. Acceptera webbläsarens notis-prompt
4. Klicka **"Skicka test-notis"**

#### Förväntat resultat

- ✅ Notis-tillstånd beviljas
- ✅ FCM token genereras och sparas
- ✅ Test-notis visas inom 3 sekunder
- ✅ Klick på notis öppnar Dashboard

---

### TEST-097: Konfigurera Projekt Alert-inställningar

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Skapa eller öppna projekt
2. Scrolla till **"Alert-inställningar"** (eller klicka "Redigera")
3. Sätt arbetsdag: Start `07:00`, Slut `16:00`
4. Aktivera **"Notifiera vid check-in"** och **"Notifiera vid check-out"**
5. Spara

#### Förväntat resultat

- ✅ Alert settings sparas korrekt
- ✅ Visas på projektsidan
- ✅ Default-värden finns för nya projekt

---

### TEST-098: Check-in/Check-out Notiser (Real-time)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Logga in som **Admin/Foreman** (enhet 1), aktivera notiser
2. Öppna inkognito, logga in som **Worker** (enhet 2)
3. Worker checkar in på projektet
4. Verifiera att Admin får notis med namn, projekt, tid
5. Worker checkar ut
6. Verifiera att Admin får notis med arbetad tid

#### Förväntat resultat

- ✅ Check-in notis inom 3 sekunder
- ✅ Check-out notis med timmar
- ✅ Klick navigerar till projekt
- ✅ Worker får INTE notis (endast admin/foreman)

---

### TEST-099: Avaktivera Projekt-Alerts

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna projekt → Alert-inställningar → Redigera
2. Avaktivera **"Notifiera vid check-in"**
3. Spara
4. Worker checkar in
5. Verifiera att INGEN notis skickas

#### Förväntat resultat

- ✅ Inställningar sparas
- ✅ Ingen check-in notis skickas
- ✅ Check-out notis fungerar fortfarande (om aktiverad)

---

<div style="page-break-after: always;"></div>

## 14. PWA & Offline

### TEST-100: Installera PWA (Mobil)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna https://eptracker.vercel.app på **mobil webbläsare** (Safari/Chrome)
2. **iOS:** Klicka "Dela" → "Lägg till på hemskärmen"
3. **Android:** Klicka "Lägg till på startskärmen" (prompt)
4. Namnge ikonen: `EP-Tracker`
5. Öppna appen från hemskärmen

#### Förväntat resultat

- ✅ PWA installeras som app
- ✅ Ikon visas på hemskärmen
- ✅ Öppnas i fullskärm (utan webbläsarUI)
- ✅ Fungerar som native app
- ✅ Splash screen visas vid start

---

### TEST-101: Offline-läge - Visa Data

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Öppna appen när **online**
2. Navigera runt (Dashboard, Projekt, Tid)
3. **Stäng av nätverk** (flygplansläge eller dev tools)
4. Försök navigera mellan sidor
5. Försök visa projekt och tidrapporter

#### Förväntat resultat

- ✅ Data som redan laddats visas korrekt
- ✅ Navigation fungerar
- ✅ Indikator visar "Offline" (t.ex. i top bar)
- ✅ Ingen krasch eller white screen

---

### TEST-102: Offline-läge - Skapa Tidrapport

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Se till att du är **offline**
2. Gå till **Tid**
3. Klicka **"Starta tid"**
4. Välj projekt
5. Starta timer
6. Stoppa efter 2 minuter
7. Lägg till kommentar
8. Spara
9. **Aktivera nätverk** igen
10. Vänta på synkronisering

#### Förväntat resultat

- ✅ Tidrapport skapas offline (sparas lokalt)
- ✅ Visas med "Väntar på synk"-indikator
- ✅ När online: Data synkas automatiskt
- ✅ Success-notis när synkad
- ✅ Data visas korrekt i backend

---

### TEST-103: Offline-läge - Skapa Material

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Gå offline
2. Gå till **Material**
3. Klicka **"+ Lägg till"**
4. Fyll i materialpost (utan kvitto)
5. Spara
6. Gå online
7. Verifiera synkronisering

#### Förväntat resultat

- ✅ Material skapas offline
- ✅ Sparas i lokal databas (IndexedDB/Dexie)
- ✅ Synkas när online
- ✅ Visas korrekt i backend

---

### TEST-104: Offline-synk med Bilder

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Gå offline
2. Skapa dagbokspost med foto
3. Ta bild från kamera
4. Spara posten
5. Gå online
6. Verifiera att foto laddas upp

#### Förväntat resultat

- ✅ Post skapas offline med foto
- ✅ Foto sparas lokalt (som blob/base64)
- ✅ När online: Foto laddas upp till Supabase Storage
- ✅ Post länkas till uppladdat foto
- ✅ Foto visas korrekt

---

### TEST-105: Synk-konflikthantering

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 15 minuter

#### Teststeg

1. Öppna appen på **två enheter** med samma användare
2. Gå offline på **enhet 1**
3. Redigera en tidrapport på **enhet 1** (offline)
4. Redigera **samma** tidrapport på **enhet 2** (online)
5. Spara båda ändringarna
6. Gå online på **enhet 1**
7. Observera konflikthantering

#### Förväntat resultat

- ✅ Konflikt detekteras
- ✅ Användare informeras (dialog eller notis)
- ✅ Välj vilken version som ska behållas
- ✅ Ingen data förloras
- ✅ Loggas (om implementerat)

---

<div style="page-break-after: always;"></div>

## 14. Säkerhet & Behörigheter

### TEST-110: RBAC - Worker kan inte se andras data

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Worker**
2. Försök navigera till **Godkännanden**
3. Försök besöka direkt URL (om möjligt)
4. Gå till **Tid** → Verifiera att endast egna rapporter visas

#### Förväntat resultat

- ✅ **Godkännanden** syns inte i menyn
- ✅ Direkt URL blockeras (redirect till Dashboard)
- ✅ Endast egna tidrapporter visas
- ✅ Kan inte se andra användares data

---

### TEST-111: RBAC - Arbetsledare kan se all data

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Arbetsledare**
2. Gå till **Tid**
3. Verifiera att alla användares tidrapporter visas
4. Gå till **Godkännanden**
5. Verifiera åtkomst

#### Förväntat resultat

- ✅ Kan se alla projekt
- ✅ Kan se alla användares tidrapporter
- ✅ Kan godkänna rapporter
- ✅ Kan planera uppdrag

---

### TEST-112: RBAC - Endast Admin kan bjuda in användare

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Logga in som **Worker** eller **Arbetsledare**
2. Försök navigera till **Inställningar** → **Användare**
3. Verifiera att "Bjud in"-knappen saknas eller är disabled
4. Logga in som **Admin**
5. Verifiera att "Bjud in"-knappen finns

#### Förväntat resultat

- ✅ Worker/Arbetsledare kan inte bjuda in
- ✅ Admin kan bjuda in
- ✅ API-anrop blockeras om inte Admin (403 Forbidden)

---

### TEST-113: RLS - Multi-tenancy (Organization Isolation)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Skapa två test-organisationer: **Org A** och **Org B**
2. Skapa användare i vardera: `userA@testorg.se` (Org A), `userB@testorg.se` (Org B)
3. Logga in som **userA** och skapa projekt/tidrapporter
4. Logga ut och logga in som **userB**
5. Försök se **Org A**:s data

#### Förväntat resultat

- ✅ **userB** ser endast **Org B**:s data
- ✅ Ingen data från **Org A** läcker
- ✅ API returnerar tom array eller 403
- ✅ Databasfrågor filtreras korrekt (RLS policies)

---

### TEST-114: Session Timeout

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 15+ minuter

#### Teststeg

1. Logga in
2. Vänta 60+ minuter (eller justera session timeout i Supabase)
3. Försök göra en åtgärd (t.ex. skapa tidrapport)

#### Förväntat resultat

- ✅ Session upphör efter timeout
- ✅ Användare omdirigeras till inloggning
- ✅ Meddelande: "Session utgången, vänligen logga in igen"
- ✅ Ingen data förloras (sparas offline om PWA)

---

### TEST-115: XSS-skydd

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Försök skapa tidrapport med kommentar:
   ```
   <script>alert('XSS')</script>
   ```
2. Försök skapa projekt med namn:
   ```
   <img src=x onerror="alert('XSS')">
   ```
3. Spara och visa data

#### Förväntat resultat

- ✅ Script körs INTE
- ✅ Data escapas korrekt (visas som text)
- ✅ Ingen alert-popup
- ✅ Data sparas och visas säkert

---

<div style="page-break-after: always;"></div>

## 15. Prestanda

### TEST-120: Sidladdningstid - Dashboard

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 5 minuter

#### Teststeg

1. Rensa cache (Ctrl+Shift+Delete)
2. Logga in
3. Mät tiden tills Dashboard är **fully interactive**
4. Använd Chrome DevTools → Performance tab

#### Förväntat resultat

- ✅ **First Contentful Paint (FCP):** < 1.5s
- ✅ **Largest Contentful Paint (LCP):** < 2.5s
- ✅ **Time to Interactive (TTI):** < 3s
- ✅ Dashboard är användbar inom 2 sekunder

---

### TEST-121: API-responstid

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Öppna **Network** tab i DevTools
2. Gör olika åtgärder:
   - Hämta projekt
   - Skapa tidrapport
   - Ladda godkännanden
3. Mät responstider

#### Förväntat resultat

- ✅ **GET-requests:** < 500ms (average)
- ✅ **POST/PUT-requests:** < 1s
- ✅ **Stora listor** (100+ items): < 1.5s

---

### TEST-122: Stora dataset - 100+ projekt

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 15 minuter

#### Teststeg

1. Skapa eller seed 100+ projekt i testorganisation
2. Logga in och navigera till **Projekt**
3. Mät laddningstid
4. Scrolla genom listan

#### Förväntat resultat

- ✅ Sidan laddar inom 3 sekunder
- ✅ Smooth scrolling (60fps)
- ✅ Virtualisering eller pagination fungerar
- ✅ Ingen frysning eller lag

---

### TEST-123: Bilduppladdning - Prestanda

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Ladda upp ett **stort foto** (5MB+) som kvitto
2. Ladda upp **10 foton** samtidigt
3. Mät uppladdningstid och respons

#### Förväntat resultat

- ✅ Bild komprimeras/resizas innan uppladdning
- ✅ Uppladdning inom 3-5 sekunder per bild
- ✅ Progress bar visas
- ✅ Ingen timeout

---

### TEST-124: Minnesanvändning (Memory Leaks)

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 20 minuter

#### Teststeg

1. Öppna **Chrome DevTools** → **Memory** tab
2. Ta en heap snapshot
3. Navigera mellan sidor i 10-15 minuter
4. Ta en ny heap snapshot
5. Jämför minnesanvändning

#### Förväntat resultat

- ✅ Minnesanvändning ökar inte dramatiskt (< 50MB ökning)
- ✅ Inga tydliga memory leaks
- ✅ Garbage collection fungerar

---

<div style="page-break-after: always;"></div>

## 16. Kompatibilitet

### TEST-130: Chrome (Desktop)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 30 minuter

#### Teststeg

1. Öppna https://eptracker.vercel.app i **Chrome 130+**
2. Gå igenom alla huvudfunktioner:
   - Registrering & Inloggning
   - Dashboard
   - Skapa projekt
   - Tidrapportering
   - Material
   - Planering
3. Notera eventuella buggar eller UI-problem

#### Förväntat resultat

- ✅ Alla funktioner fungerar
- ✅ UI renderas korrekt
- ✅ Inga konsolfel

---

### TEST-131: Safari (Desktop & Mobile)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 30 minuter

#### Teststeg

1. Testa på **Safari 17+ (macOS)** OCH **Mobile Safari (iOS 16+)**
2. Gå igenom kärnfunktioner
3. Testa PWA-installation på iOS

#### Förväntat resultat

- ✅ Alla funktioner fungerar
- ✅ PWA installeras korrekt på iOS
- ✅ Offline-funktionalitet fungerar
- ✅ Inga Safari-specifika buggar

---

### TEST-132: Firefox

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 20 minuter

#### Teststeg

1. Öppna i **Firefox 131+**
2. Testa kärnfunktioner

#### Förväntat resultat

- ✅ Alla funktioner fungerar
- ✅ UI ser korrekt ut
- ✅ Inga Firefox-specifika problem

---

### TEST-133: Responsiv Design - Mobile (Portrait)

**Prioritet:** 🔴 Kritisk  
**Förväntad tid:** 20 minuter

#### Teststeg

1. Öppna på **iPhone** eller mobil viewport (375x667)
2. Testa navigation (hamburgermeny)
3. Testa formulär och input
4. Testa tidrapportering
5. Testa planering (dagvy)

#### Förväntat resultat

- ✅ UI anpassas till mobil
- ✅ Text är läsbar (inte för liten)
- ✅ Knappar är tappbara (min 44x44px)
- ✅ Ingen horizontal scroll
- ✅ Formulär fungerar med mobil keyboard

---

### TEST-134: Responsiv Design - Tablet

**Prioritet:** 🟡 Medel  
**Förväntad tid:** 15 minuter

#### Teststeg

1. Öppna på **iPad** eller tablet viewport (768x1024)
2. Testa i både portrait och landscape
3. Verifiera UI

#### Förväntat resultat

- ✅ UI utnyttjar tablet-storlek väl
- ✅ Planering visar fler dagar synligt
- ✅ Sidebar kan vara synlig hela tiden

---

### TEST-135: Touch-gester (Mobil)

**Prioritet:** 🟠 Hög  
**Förväntad tid:** 10 minuter

#### Teststeg

1. Testa på touchscreen (mobil/tablet)
2. **Swipe** för att byta vecka i planering
3. **Swipe** för att navigera mellan dagar (dagvy)
4. **Drag-and-drop** i planeringsgrid (om möjligt)
5. **Pinch-to-zoom** på foton

#### Förväntat resultat

- ✅ Swipe-gester fungerar smooth
- ✅ Drag-and-drop fungerar på touch
- ✅ Zoom fungerar på bilder
- ✅ Ingen konflikt med scroll

---

<div style="page-break-after: always;"></div>

## 17. Testrapportering

### 17.1 Test Execution Template

När du kör tester, dokumentera resultat i följande format:

---

**Test ID:** TEST-XXX  
**Testnamn:** [Namn på test]  
**Testat av:** [Ditt namn]  
**Datum:** [YYYY-MM-DD]  
**Webbläsare/Enhet:** [Chrome 130 / iPhone 14]  
**Status:** ✅ Godkänd | ❌ Ej godkänd | ⚠️ Delvis godkänd

**Resultat:**
- [Beskriv vad som hände]

**Buggar/Problem:**
- [Lista eventuella buggar eller problem]

**Skärmdumpar:**
- [Bifoga vid behov]

**Kommentarer:**
- [Övriga kommentarer]

---

### 17.2 Prioritering av Buggar

| Prioritet | Beskrivning | Exempel |
|-----------|-------------|---------|
| 🔴 **Kritisk** | Blockerar kärnfunktion, måste fixas omedelbart | Kan inte logga in, data förloras |
| 🟠 **Hög** | Påverkar viktiga funktioner, bör fixas snabbt | Fel beräkning av timmar, saknad validering |
| 🟡 **Medel** | Mindre problem, fixas inom rimlig tid | UI-buggar, mindre UX-problem |
| 🟢 **Låg** | Kosmetiska eller edge cases | Textjustering, mindre förbättringar |

---

### 17.3 Sammanfattning av Testresultat

Efter genomförd testning, fyll i:

| Kategori | Totalt | Godkända | Ej godkända | Godkänt % |
|----------|--------|----------|-------------|-----------|
| Autentisering | 5 | | | |
| Dashboard | 4 | | | |
| Projekt | 6 | | | |
| Tid | 7 | | | |
| Material | 6 | | | |
| Planering | 6 | | | |
| Dagbok/ÄTA | 5 | | | |
| Checklistor | 3 | | | |
| Godkännanden | 5 | | | |
| Inställningar | 6 | | | |
| PWA/Offline | 6 | | | |
| Säkerhet | 6 | | | |
| Prestanda | 5 | | | |
| Kompatibilitet | 6 | | | |
| **TOTALT** | **XX** | | | |

---

### 17.4 Acceptanskriterier

För att systemet ska godkännas för produktion:

✅ **Kritiska tester (🔴):** 100% godkända  
✅ **Höga tester (🟠):** Minst 95% godkända  
✅ **Medelprioritet (🟡):** Minst 90% godkända  
✅ **Inga blockerande buggar**  
✅ **Prestanda inom gränser** (LCP < 2.5s)  
✅ **Säkerhet verifierad** (RBAC, RLS)

---

<div style="page-break-after: always;"></div>

## Appendix A: Snabbreferens

### Navigeringsstruktur

```
EP-Tracker (https://eptracker.vercel.app)
│
├── Startsida
├── Registrera
├── Logga in
│
└── Dashboard (efter inloggning)
    ├── Dashboard (översikt)
    ├── Tid
    │   ├── Starta/stoppa tid
    │   ├── Registrera manuellt
    │   ├── Historik
    │   └── Veckoöversikt
    ├── Projekt
    │   ├── Projektlista
    │   ├── Projektdetaljer
    │   │   ├── Översikt
    │   │   ├── Team (medlemmar)
    │   │   ├── Faser/Arbetsorder
    │   │   ├── Tidrapporter
    │   │   └── Material
    │   └── Skapa nytt projekt
    ├── Material
    │   ├── Materiallista
    │   ├── Registrera material
    │   └── Utlägg
    ├── Planering
    │   ├── Veckoöversikt (grid)
    │   ├── Skapa uppdrag
    │   └── Dagvy (mobil)
    ├── Dagbok
    │   ├── Lista anteckningar
    │   └── Skapa anteckning
    ├── ÄTA
    │   ├── Lista ÄTA
    │   └── Skapa ÄTA
    ├── Checklistor
    │   ├── Aktiva checklistor
    │   ├── Mallar
    │   └── Skapa checklista
    ├── Godkännanden (Admin/Foreman/Finance)
    │   ├── Tidrapporter
    │   ├── Material
    │   ├── Utlägg
    │   └── Export
    └── Inställningar (Admin)
        ├── Organisation
        ├── Användare
        │   ├── Lista användare
        │   └── Bjud in användare
        ├── Profil (alla användare)
        └── Säkerhet
```

---

## Appendix B: Testdata-generering

För att snabbt skapa testdata:

```bash
# Exempel (om seed-script finns):
npm run seed:test-data

# Eller via Supabase SQL Editor:
# Kör scripts i scripts/ -mappen
```

---

## Appendix C: Kontakter

**Support:**  
Email: support@eptracker.se  
Telefon: 070-XXX XX XX

**Teknisk support:**  
GitHub Issues: [Link till repo om public]

---

## Slutsats

Denna testplan täcker alla kritiska och viktiga funktioner i EP-Tracker. Genom att följa dessa teststeg säkerställs att systemet är redo för produktion och uppfyller kvalitetskrav.

**Lycka till med testningen! 🚀**

---

*Dokument genererat: 2025-01-24*  
*Version: 2.0*  
*EstimatePro AB © 2025*


