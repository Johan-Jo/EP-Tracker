# EPIC 6 - Testplan & Verifiering

**Datum:** 2025-10-19  
**Status:** Testing in progress

## 📋 Testscenarier

### 1. ÄTA (Ändrings- och tilläggsarbeten)

#### Test 1.1: Worker skapar ÄTA för godkännande
**Förutsättningar:**
- Inloggad som Worker
- Minst ett projekt finns

**Steg:**
1. Navigera till "ÄTA" i menyn
2. Klicka "Ny ÄTA"
3. Välj projekt
4. Fyll i titel (t.ex. "Extra eluttag i kök")
5. Fyll i beskrivning
6. Ange antal (t.ex. "5")
7. Ange enhet (t.ex. "st")
8. Ange à-pris (t.ex. "450")
9. Ange ÄTA-nummer (valfritt)
10. Ladda upp 2-3 foton (valfritt)
11. Signera med ditt namn
12. Klicka "Skicka för godkännande"

**Förväntat resultat:**
- ✅ Toast-notifikation visas: "ÄTA skickad för godkännande!"
- ✅ Omdirigeras till ÄTA-listan efter 1 sekund
- ✅ ÄTA syns i listan med status "Väntar på godkännande"
- ✅ Badge visar "Väntar på godkännande"
- ✅ Ingen "Godkänn"-knapp syns för worker

---

#### Test 1.2: Foreman/Admin skapar ÄTA som utkast
**Förutsättningar:**
- Inloggad som Foreman eller Admin
- Minst ett projekt finns

**Steg:**
1. Navigera till "ÄTA"
2. Klicka "Ny ÄTA"
3. Fyll i alla fält (se Test 1.1)
4. Signera (valfritt för utkast)
5. Klicka "Spara som utkast"

**Förväntat resultat:**
- ✅ Toast-notifikation: "ÄTA sparad som utkast!"
- ✅ ÄTA syns med status "Utkast"
- ✅ Grå badge med "Utkast"

---

#### Test 1.3: Godkänn ÄTA
**Förutsättningar:**
- Inloggad som Foreman eller Admin
- Minst en ÄTA med status "Väntar på godkännande" finns

**Steg:**
1. Gå till ÄTA-listan
2. Hitta en pending ÄTA
3. Klicka "Godkänn"-knappen
4. I dialogen, klicka "Godkänn"
5. Lägg till kommentar (valfritt)
6. Signera med ditt namn
7. Klicka "Godkänn ÄTA"

**Förväntat resultat:**
- ✅ Dialog stängs
- ✅ ÄTA uppdateras till status "Godkänd"
- ✅ Grön badge visas
- ✅ "Godkänn"-knappen försvinner

---

#### Test 1.4: Avvisa ÄTA
**Förutsättningar:**
- Inloggad som Foreman eller Admin
- Minst en ÄTA med status "Väntar på godkännande" finns

**Steg:**
1. Gå till ÄTA-listan
2. Klicka "Godkänn" på en pending ÄTA
3. Klicka "Avvisa"
4. Ange skäl (obligatoriskt): "Priset är för högt"
5. Signera
6. Klicka "Avvisa ÄTA"

**Förväntat resultat:**
- ✅ Dialog stängs
- ✅ Status ändras till "Avvisad"
- ✅ Röd badge visas
- ✅ Kommentaren sparas

---

#### Test 1.5: Visa ÄTA-detaljer
**Förutsättningar:**
- Minst en ÄTA finns (vilken status som helst)

**Steg:**
1. Gå till ÄTA-listan
2. Klicka på öga-ikonen på en ÄTA
3. Kontrollera detaljvyn

**Förväntat resultat:**
- ✅ Titel och beskrivning visas korrekt
- ✅ Projektinformation visas
- ✅ Kostnadsuppgifter (antal, à-pris, totalt) visas korrekt
- ✅ Skapad-datum och skapad-av visas
- ✅ Status-badge visas korrekt
- ✅ Om foton finns: visas i ett rutnät
- ✅ Klicka på foto: öppnas i fullskärm
- ✅ Signaturinformation visas om den finns
- ✅ Godkännande/avvisnings-information visas korrekt med kommentar

---

#### Test 1.6: Fotogalleri i ÄTA
**Förutsättningar:**
- En ÄTA med minst 3 foton

**Steg:**
1. Öppna ÄTA-detaljvy
2. Klicka på första fotot
3. Navigera mellan foton med piltangenter eller knappar
4. Klicka "X" eller ESC för att stänga

**Förväntat resultat:**
- ✅ Fullskärmsvy öppnas
- ✅ Navigering fungerar (pilar, knappar)
- ✅ Miniatyrbilder visas längst ner
- ✅ ESC-tangent stänger galleriet
- ✅ X-knapp stänger galleriet

---

### 2. Dagbok (Daily Diary)

#### Test 2.1: Skapa dagbokspost
**Förutsättningar:**
- Inloggad som Foreman eller Admin
- Minst ett projekt finns

**Steg:**
1. Gå till "Dagbok"
2. Klicka "Ny dagbokspost"
3. Välj projekt
4. Välj datum
5. Fyll i väder (t.ex. "Soligt")
6. Fyll i temperatur (t.ex. "22")
7. Fyll i antal personer (t.ex. "8")
8. Fyll i "Utfört arbete"
9. Fyll i "Hinder och problem" (valfritt)
10. Fyll i "Säkerhetsnoteringar" (valfritt)
11. Fyll i "Leveranser" (valfritt)
12. Fyll i "Besökare" (valfritt)
13. Ladda upp 2-3 foton
14. Signera med ditt namn (obligatoriskt)
15. Klicka "Spara dagbokspost"

**Förväntat resultat:**
- ✅ Toast: "Dagbokspost sparad!"
- ✅ Omdirigeras till dagbok-listan efter 1 sekund
- ✅ Ny post syns i listan
- ✅ Foto-antal visas korrekt

---

#### Test 2.2: Dagbok med tomma numeriska fält
**Förutsättningar:**
- Inloggad som Foreman eller Admin

**Steg:**
1. Skapa ny dagbokspost
2. Välj projekt och datum
3. Lämna "Temperatur" och "Antal personer" tomma
4. Fyll endast "Utfört arbete"
5. Signera och spara

**Förväntat resultat:**
- ✅ Ingen "invalid input syntax" error
- ✅ Sparas utan fel
- ✅ Toast-notifikation visas

---

#### Test 2.3: Dagbok utan signatur
**Förutsättningar:**
- Inloggad som Foreman eller Admin

**Steg:**
1. Skapa ny dagbokspost
2. Fyll i alla fält
3. Försök spara UTAN att signera

**Förväntat resultat:**
- ✅ Toast-fel: "Signatur krävs för att spara dagboksposten"
- ✅ Dagboksposten sparas INTE

---

#### Test 2.4: Visa dagboksdetaljer
**Förutsättningar:**
- Minst en dagbokspost finns

**Steg:**
1. Gå till Dagbok-listan
2. Klicka på en post för att öppna detaljvyn

**Förväntat resultat:**
- ✅ Titel med projekt och datum
- ✅ Väder och temperatur visas korrekt
- ✅ Antal personer visas
- ✅ Alla textfält visas korrekt
- ✅ Foton visas i galleri
- ✅ Klicka på foto: fullskärmsvy
- ✅ Signaturinformation visas

---

#### Test 2.5: Worker försöker komma åt Dagbok
**Förutsättningar:**
- Inloggad som Worker

**Steg:**
1. Försök navigera till `/dashboard/diary`

**Förväntat resultat:**
- ✅ Omdirigeras till `/dashboard`
- ✅ "Dagbok"-länken syns INTE i menyn för worker

---

### 3. Checklistor

#### Test 3.1: Skapa checklista från mall
**Förutsättningar:**
- Inloggad som Foreman eller Admin
- Minst ett projekt finns

**Steg:**
1. Gå till "Checklistor"
2. Klicka "Ny checklista"
3. Välj projekt
4. Välj mall: "Säkerhetskontroll"
5. Se att titel och punkter läses in automatiskt
6. Checka av 2-3 punkter
7. Lägg till anteckningar på en punkt
8. Signera INTE än (inte alla punkter checkade)
9. Klicka "Spara checklista"

**Förväntat resultat:**
- ✅ Checklista sparas som "Pågående"
- ✅ Progress visas korrekt (t.ex. "3/10 punkter, 30%")
- ✅ Ingen signatur krävs för ofullständiga checklistor

---

#### Test 3.2: Slutför checklista med signatur
**Förutsättningar:**
- En pågående checklista finns

**Steg:**
1. Öppna checklistan för editering (eller skapa ny)
2. Checka av ALLA punkter
3. Se att signaturfältet visas
4. Signera
5. Spara

**Förväntat resultat:**
- ✅ Signaturfältet dyker upp när alla punkter är checkade
- ✅ Status: "Klar"
- ✅ Progress: "10/10 (100%)"
- ✅ Grön badge

---

#### Test 3.3: Skapa egen checklista
**Förutsättningar:**
- Inloggad som Foreman eller Admin

**Steg:**
1. Ny checklista
2. Välj projekt
3. Välj INGEN mall
4. Skriv egen titel: "Kontroll av verktyg"
5. Klicka "Lägg till punkt" 3 gånger
6. Skriv text för varje punkt:
   - "Kontrollera skruvdragare"
   - "Kontrollera borrmaskiner"
   - "Kontrollera slipverktyg"
7. Checka av alla
8. Signera
9. Spara

**Förväntat resultat:**
- ✅ Egna punkter fungerar
- ✅ Sparas korrekt
- ✅ Status: "Klar"

---

#### Test 3.4: Visa checklistdetaljer
**Förutsättningar:**
- Minst en checklista finns

**Steg:**
1. Gå till Checklists-listan
2. Klicka på en checklista

**Förväntat resultat:**
- ✅ Titel och projektinfo visas
- ✅ Progress badge visas korrekt
- ✅ Alla punkter visas med checkmark-status
- ✅ Anteckningar visas för punkter som har det
- ✅ Signatur visas om checklistan är slutförd
- ✅ Template-information visas om en mall användes

---

#### Test 3.5: Testa alla mallar
**Förutsättningar:**
- Inloggad som Foreman eller Admin

**Steg:**
1. Skapa en checklista från varje mall:
   - Säkerhetskontroller
   - Kvalitetskontroller
   - Miljökontroller
   - Materialinventeringar

**Förväntat resultat:**
- ✅ Alla mallar laddar punkter korrekt
- ✅ Rätt kategori visas för varje mall
- ✅ Inga tomma eller trasiga punkter

---

### 4. Roll-baserad åtkomst

#### Test 4.1: Worker-behörigheter
**Förutsättningar:**
- Inloggad som Worker

**Menysynlighet:**
- ✅ "ÄTA" - SYNS
- ✅ "Dagbok" - SYNS INTE
- ✅ "Checklistor" - SYNS INTE

**Funktioner:**
- ✅ Kan skapa ÄTA (endast för godkännande)
- ✅ Kan INTE se "Spara som utkast"
- ✅ Kan INTE godkänna ÄTA
- ✅ Omdirigeras från `/dashboard/diary`
- ✅ Omdirigeras från `/dashboard/checklists`

---

#### Test 4.2: Foreman-behörigheter
**Förutsättningar:**
- Inloggad som Foreman

**Menysynlighet:**
- ✅ "ÄTA" - SYNS
- ✅ "Dagbok" - SYNS
- ✅ "Checklistor" - SYNS

**Funktioner:**
- ✅ Kan skapa ÄTA (både utkast och för godkännande)
- ✅ Kan godkänna/avvisa ÄTA
- ✅ Kan skapa dagboksposter
- ✅ Kan skapa checklistor

---

#### Test 4.3: Admin-behörigheter
**Förutsättningar:**
- Inloggad som Admin

**Samma som Foreman + ytterligare:**
- ✅ Kan komma åt "Organisation"-inställningar
- ✅ Kan komma åt "Användare"-hantering

---

#### Test 4.4: Finance-behörigheter
**Förutsättningar:**
- Inloggad som Finance

**Menysynlighet:**
- ✅ "ÄTA" - SYNS INTE
- ✅ "Dagbok" - SYNS INTE
- ✅ "Checklistor" - SYNS INTE

**Funktioner:**
- ✅ Omdirigeras från `/dashboard/ata`

---

### 5. UI/UX & Bekräftelser

#### Test 5.1: Toast-notifikationer
**Testa att följande toasts visas:**
- ✅ "ÄTA skickad för godkännande!" (worker skickar ÄTA)
- ✅ "ÄTA sparad som utkast!" (admin/foreman sparar draft)
- ✅ "Dagbokspost sparad!" (dagbok sparas)
- ✅ "Signatur krävs..." (dagbok utan signatur)
- ✅ "Max 10 foton tillåtna" (för många foton)
- ✅ Felmeddelanden vid API-fel

---

#### Test 5.2: Navigation och tillbaka-knappar
**Testa:**
- ✅ Tillbaka-pil från "Ny ÄTA" → går till ÄTA-listan
- ✅ Tillbaka-pil från "Ny dagbokspost" → går till Dagbok-listan
- ✅ Tillbaka-pil från "Ny checklista" → går till Checklists-listan
- ✅ Tillbaka-pil från detaljvyer → går till respektive lista

---

#### Test 5.3: Responsiv design
**Testa på mobil och desktop:**
- ✅ Formulär fungerar på mobil
- ✅ Listor visas korrekt
- ✅ Fotogalleri fungerar på mobil
- ✅ Dialogen (godkännande) fungerar på mobil
- ✅ Navigation (bottom nav på mobil, sidebar på desktop)

---

### 6. Fotouppladdning & Galleri

#### Test 6.1: Ladda upp foton
**Testa i både ÄTA och Dagbok:**
- ✅ Välj 1 foto - fungerar
- ✅ Välj 5 foton samtidigt - fungerar
- ✅ Försök ladda upp 11 foton - får felmeddelande
- ✅ Preview visas för valda foton
- ✅ Ta bort foto före uppladdning - fungerar

---

#### Test 6.2: Visa foton i detaljvy
**Testa:**
- ✅ Foton visas i rutnät
- ✅ 2-3 kolumner beroende på skärmstorlek
- ✅ Klicka på foto - öppnas fullskärm
- ✅ Bilder laddar korrekt (ingen "brutna bilder"-ikon)

---

#### Test 6.3: Fullskärms-galleri
**Testa:**
- ✅ Höger pil - nästa bild
- ✅ Vänster pil - föregående bild
- ✅ Klicka på miniatyrbild - hoppar till den bilden
- ✅ ESC-tangent - stänger galleriet
- ✅ X-knapp - stänger galleriet
- ✅ Klicka utanför bild - stänger galleriet

---

### 7. Edge Cases & Felhantering

#### Test 7.1: Tomma fält
**Testa:**
- ✅ Skapa ÄTA utan beskrivning (valfritt fält) - fungerar
- ✅ Dagbok med endast obligatoriska fält - fungerar
- ✅ Tomma numeriska fält behandlas som null - ingen error

---

#### Test 7.2: Långa texter
**Testa:**
- ✅ ÄTA-beskrivning med 500+ tecken - fungerar och visas korrekt
- ✅ Dagbok "Utfört arbete" med mycket text - fungerar
- ✅ Checklista-punkt med lång text - fungerar

---

#### Test 7.3: Specialtecken
**Testa:**
- ✅ ÄTA-titel med åäö - fungerar
- ✅ Beskrivning med citattecken, kommatecken - fungerar
- ✅ Nummer med decimaler (t.ex. 12.50) - fungerar

---

## 📊 Testresultat

**Datum:** _Fylls i efter testning_

| Test | Status | Kommentar |
|------|--------|-----------|
| 1.1 - Worker skapar ÄTA | ⏳ Ej testad | |
| 1.2 - Admin skapar utkast | ⏳ Ej testad | |
| 1.3 - Godkänn ÄTA | ⏳ Ej testad | |
| 1.4 - Avvisa ÄTA | ⏳ Ej testad | |
| 1.5 - ÄTA-detaljer | ⏳ Ej testad | |
| 1.6 - ÄTA-fotogalleri | ⏳ Ej testad | |
| 2.1 - Skapa dagbok | ⏳ Ej testad | |
| 2.2 - Dagbok tomma fält | ⏳ Ej testad | |
| 2.3 - Dagbok utan signatur | ⏳ Ej testad | |
| 2.4 - Dagbok-detaljer | ⏳ Ej testad | |
| 2.5 - Worker åtkomst dagbok | ⏳ Ej testad | |
| 3.1 - Checklista från mall | ⏳ Ej testad | |
| 3.2 - Slutför checklista | ⏳ Ej testad | |
| 3.3 - Egen checklista | ⏳ Ej testad | |
| 3.4 - Checklista-detaljer | ⏳ Ej testad | |
| 3.5 - Alla mallar | ⏳ Ej testad | |
| 4.1 - Worker-behörigheter | ⏳ Ej testad | |
| 4.2 - Foreman-behörigheter | ⏳ Ej testad | |
| 4.3 - Admin-behörigheter | ⏳ Ej testad | |
| 4.4 - Finance-behörigheter | ⏳ Ej testad | |
| 5.1 - Toast-notifikationer | ⏳ Ej testad | |
| 5.2 - Navigation | ⏳ Ej testad | |
| 5.3 - Responsiv design | ⏳ Ej testad | |
| 6.1 - Ladda upp foton | ⏳ Ej testad | |
| 6.2 - Visa foton | ⏳ Ej testad | |
| 6.3 - Fullskärms-galleri | ⏳ Ej testad | |
| 7.1 - Tomma fält | ⏳ Ej testad | |
| 7.2 - Långa texter | ⏳ Ej testad | |
| 7.3 - Specialtecken | ⏳ Ej testad | |

**Legenda:**
- ⏳ Ej testad
- ✅ Godkänd
- ❌ Fel hittades
- ⚠️ Delvis fungerande

---

## 🐛 Upptäckta buggar

Dokumentera alla buggar som hittas här:

1. **[Bugg-ID]** - Beskrivning
   - **Steg:** Hur man reproducerar
   - **Förväntat:** Vad som borde hända
   - **Faktiskt:** Vad som faktiskt hände
   - **Prioritet:** Hög/Mellan/Låg
   - **Status:** Öppen/Fixad

---

## ✅ Sign-off

När alla tester är godkända:

- [ ] Alla tester är körda
- [ ] Alla kritiska buggar är fixade
- [ ] Dokumentation är uppdaterad
- [ ] EPIC 6 är redo för produktion

**Testad av:** _________________  
**Datum:** _________________

