# Löneunderlag - Process Guide (Steg för steg)

## Översikt
Denna guide förklarar hela processen från tidsregistrering till löneunderlag-beräkning i EP-Tracker.

---

## Steg 1: Tidsregistrering

### 1.1 Användare registrerar tid
- **Vad:** Användare checkar in/ut via dashboard-slider eller registrerar tid manuellt
- **Var:** `/dashboard` (Översikt-sidan)
- **Vad skapas:** En ny `time_entry` i databasen
- **Status:** Automatiskt satt till `draft` (utkast)

### 1.2 Exempel på data som skapas:
```sql
time_entries:
- id: uuid
- user_id: uuid (användarens ID)
- project_id: uuid (projekt-ID)
- start_at: 2025-01-15T08:00:00Z
- stop_at: 2025-01-15T17:00:00Z
- status: 'draft'
- org_id: uuid
```

---

## Steg 2: Godkännande av tidsregistreringar

### 2.1 Admin/Foreman granskar tidsregistreringar
- **Vad:** Gå till Godkännanden-sidan
- **Var:** `/dashboard/approvals`
- **Vem:** Endast Admin och Foreman kan se denna sida
- **Vad visas:** Alla tidsregistreringar för vald vecka, grupperade efter status

### 2.2 Filtrera och välj
- Filtrera efter status: "Väntar" (`submitted`) eller "Utkast" (`draft`)
- Sök efter specifik användare eller projekt om behövt
- Markera flera poster med checkboxar för batch-godkännande

### 2.3 Godkänn poster
- **Vad:** Klicka på "Godkänn"-knappen
- **Vad händer:**
  - Status ändras från `draft`/`submitted` → `approved`
  - `approved_by` sätts till godkännarens ID
  - `approved_at` sätts till aktuellt datum/tid
  - Användaren får notifikation om godkännande

### 2.4 Exempel på godkänd data:
```sql
time_entries:
- id: uuid
- user_id: uuid
- project_id: uuid
- start_at: 2025-01-15T08:00:00Z
- stop_at: 2025-01-15T17:00:00Z
- status: 'approved' ✅
- approved_by: uuid (admin/foreman ID)
- approved_at: 2025-01-16T10:30:00Z
- org_id: uuid
```

---

## Steg 3: Bygga närvaroregistreringar (Valfritt men rekommenderat)

### 3.1 Automatisk byggning
- **Vad:** Systemet försöker automatiskt bygga `attendance_session` från `time_entries`
- **När:** När du klickar på "Beräkna om" på löneunderlag-sidan
- **Var:** `/dashboard/payroll`
- **Vad händer:**
  - Systemet kontrollerar om det finns `attendance_session` för perioden
  - Om INGA finns, försöker det automatiskt konvertera `time_entries` → `attendance_session`
  - Funktionen `buildAttendanceSessions()` körs i bakgrunden

### 3.2 Manuell byggning (Alternativ)
- **Vad:** Manuellt bygga närvaroregistreringar
- **Var:** API-endpoint `/api/attendance/build`
- **När:** Om automatisk byggning misslyckas eller om du vill köra det manuellt
- **Vad skapas:** `attendance_session` poster från `time_entries`

### 3.3 Exempel på närvaroregistrering:
```sql
attendance_session:
- id: uuid
- org_id: uuid
- person_id: uuid (samma som user_id i time_entries)
- project_id: uuid
- check_in_ts: 2025-01-15T08:00:00Z
- check_out_ts: 2025-01-15T17:00:00Z
- source_first: 'time_entry'
- source_last: 'time_entry'
- immutable_hash: sha256 hash
- corrected: false
```

---

## Steg 4: Konfigurera löneregler

### 4.1 Gå till Löneregler
- **Var:** `/dashboard/payroll` → Tab "Löneregler"
- **Vem:** Admin och Foreman
- **Vad:** Konfigurera regler för löneberäkning

### 4.2 Konfigurera inställningar
- **Normal arbetstid per vecka:** Standard 40h (övertid börjar efter detta)
- **Övertidsmultiplikator:** Standard 1.5 (50% extra lön)
- **Automatisk rast:** 
  - Efter hur många timmar: Standard 6h
  - Rastlängd: Standard 30 minuter
- **OB-rates (Overtid/Belöningspengar):**
  - Natt: Standard 1.2x
  - Helg: Standard 1.5x
  - Helgdag: Standard 2.0x

### 4.3 Spara regler
- Klicka på "Spara regler"
- Regler sparas i `payroll_rules` tabellen
- Används automatiskt vid beräkning

---

## Steg 5: Beräkna löneunderlag

### 5.1 Välj period
- **Var:** `/dashboard/payroll` → Tab "Löneunderlag"
- **Vad:** Välj start- och slutdatum för perioden du vill beräkna
- **Exempel:** 2025-01-01 till 2025-01-31

### 5.2 Klicka på "Beräkna om"
- **Vad händer i bakgrunden:**

#### 5.2.1 Hämta data
```typescript
// Försök hämta attendance_session först
attendance_session WHERE 
  org_id = X AND
  check_in_ts >= periodStart AND
  check_in_ts <= periodEnd AND
  check_out_ts IS NOT NULL (kompletta sessioner)

// Om inga attendance_session finns, hämta time_entries som fallback
time_entries WHERE
  org_id = X AND
  status = 'approved' AND
  start_at >= periodStart AND
  start_at <= periodEnd AND
  stop_at IS NOT NULL (kompletta entries)
```

#### 5.2.2 Gruppera per person och vecka
- Alla sessioner/entries grupperas per person (`person_id`/`user_id`)
- Sedan grupperas de per vecka (måndag-söndag)
- Varje vecka beräknas separat för övertidsberäkning

#### 5.2.3 Beräkna timmar
För varje vecka per person:
```
1. Beräkna totala timmar:
   totalHours = summa av alla sessioner (check_out - check_in)

2. Beräkna OB-timmar (natt/helg/helgdag):
   obHours = calculateOBHours(checkIn, checkOut, ob_rates)
   - Natt (22:00-06:00): obHours * 1.2
   - Helg (lördag/söndag): obHours * 1.5
   - Helgdag: obHours * 2.0

3. Beräkna rasttimmar:
   breakHours = calculateBreakHours(sessionHours, rules)
   - Om sessionHours >= auto_break_after_hours (6h)
     → Lägg till auto_break_duration (30 min)

4. Beräkna nettotimmar:
   netHours = totalHours - breakHours

5. Dela upp i normaltid och övertid:
   hoursNorm = min(netHours, normal_hours_threshold) // Max 40h/vecka
   hoursOvertime = max(0, netHours - normal_hours_threshold) // Över 40h
```

#### 5.2.4 Spara resultat
- Resultat sparas i `payroll_basis` tabellen
- En post per person per vecka
- Upsert (uppdatera om redan finns, annars skapa ny)

### 5.3 Exempel på beräknat löneunderlag:
```sql
payroll_basis:
- id: uuid
- org_id: uuid
- person_id: uuid
- period_start: 2025-01-13 (måndag)
- period_end: 2025-01-19 (söndag)
- hours_norm: 40.00
- hours_overtime: 5.50
- ob_hours: 2.00
- break_hours: 1.00
- total_hours: 44.50
- locked: false
```

---

## Steg 6: Granska löneunderlag

### 6.1 Visa resultat
- **Var:** `/dashboard/payroll` → Tab "Löneunderlag"
- **Vad visas:** Alla beräknade löneunderlag för vald period
- **Information:**
  - Personens namn och e-post
  - Period (vecka)
  - Normaltid, övertid, OB-timmar, rast, totalt

### 6.2 Låsa löneunderlag (Valfritt)
- **Vad:** Låsa löneunderlag för att förhindra ändringar
- **Varför:** När du är klar med granskning och vill exportera
- **Vad händer:**
  - `locked` sätts till `true`
  - `locked_by` sätts till din ID
  - `locked_at` sätts till aktuellt datum/tid
  - Löneunderlag kan inte längre ändras (tills det låses upp)

---

## Steg 7: Exportera löneunderlag

### 7.1 Exportera CSV
- **Var:** `/dashboard/payroll` → Klicka på "Exportera CSV"
- **Vad:** Exporterar alla löneunderlag för vald period till CSV-fil
- **Format:** CSV med semicolon-separator (för Excel-kompatibilitet)
- **Innehåll:**
  - Person, E-post, Period Start, Period Slut
  - Normaltid, Övertid, OB-timmar, Rast, Totalt
  - Låst-status

### 7.2 Exportera endast låsta (Valfritt)
- Filtrera exporten till endast låsta löneunderlag
- Användbart när du vill exportera endast godkända perioder

---

## Felhantering och Felsökning

### Problem: "Inga löneunderlag hittades"
**Möjliga orsaker:**
1. Inga godkända tidsregistreringar för perioden
   - **Lösning:** Gå till `/dashboard/approvals` och godkänn tidsregistreringar
2. Inga närvaroregistreringar och inga godkända tidsregistreringar
   - **Lösning:** Kontrollera att tidsregistreringar är godkända (`status = 'approved'`)
3. Perioden är felaktig
   - **Lösning:** Kontrollera start- och slutdatum

### Problem: "Failed to refresh payroll basis"
**Möjliga orsaker:**
1. Databasfel (RLS-policy, permissions)
   - **Lösning:** Kontrollera att du är Admin/Foreman
2. Fel i beräkningslogiken
   - **Lösning:** Kontrollera konsolen för detaljerade felmeddelanden
3. Inga data att beräkna från
   - **Lösning:** Använd debug-knappen för att se vad som finns i databasen

### Debug-verktyg
- **Debug-knapp:** Klicka på "Debug: Visa vad som finns i databasen" på löneunderlag-sidan
- **Vad visas:**
  - Antal närvaroregistreringar (totalt och kompletta)
  - Antal tidsregistreringar (totalt och godkända)
  - Rekommendationer om vad som saknas

---

## Checklista för löneunderlag-beräkning

- [ ] 1. Tidsregistreringar är skapade (`time_entries` med `status = 'draft'`)
- [ ] 2. Tidsregistreringar är godkända (`status = 'approved'`)
- [ ] 3. Löneregler är konfigurerade (`payroll_rules` tabellen)
- [ ] 4. Period är vald på löneunderlag-sidan
- [ ] 5. "Beräkna om" är klickad
- [ ] 6. Löneunderlag visas korrekt
- [ ] 7. (Valfritt) Löneunderlag är låst
- [ ] 8. (Valfritt) Löneunderlag är exporterat

---

## Teknisk översikt

### Databastabeller i processen:
1. `time_entries` - Tidsregistreringar
2. `attendance_session` - Närvaroregistreringar (valfritt)
3. `payroll_rules` - Löneregler per organisation
4. `payroll_basis` - Beräknat löneunderlag

### API-endpoints:
- `GET /api/time/entries` - Hämta tidsregistreringar
- `POST /api/approvals/time-entries/approve` - Godkänn tidsregistreringar
- `POST /api/attendance/build` - Bygg närvaroregistreringar från tidsregistreringar
- `GET /api/payroll/rules` - Hämta löneregler
- `POST /api/payroll/rules` - Uppdatera löneregler
- `POST /api/payroll/basis/refresh` - Beräkna löneunderlag
- `GET /api/payroll/basis` - Hämta löneunderlag
- `POST /api/payroll/basis/lock` - Låsa/upplåsa löneunderlag
- `GET /api/payroll/basis/export` - Exportera löneunderlag

### Funktioner i kod:
- `buildAttendanceSessions()` - Bygger närvaroregistreringar från tidsregistreringar
- `refreshPayrollBasis()` - Beräknar löneunderlag från närvaroregistreringar/tidsregistreringar
- `calculateOBHours()` - Beräknar OB-timmar baserat på tidpunkt
- `calculateBreakHours()` - Beräknar rasttimmar baserat på sessionlängd

---

## Ytterligare resurser

- Hjälp-sektion: `/dashboard/help#payroll`
- FAQ: Se "Löneunderlag"-sektionen i hjälpen
- Debug-endpoint: `/api/payroll/basis/debug?start=YYYY-MM-DD&end=YYYY-MM-DD`

