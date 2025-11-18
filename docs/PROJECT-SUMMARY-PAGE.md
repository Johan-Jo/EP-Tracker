# Projektdetaljsida - Omstrukturerad Sammanfattningsvy

## Översikt

En omfattande projektsammanfattningssida som ger en komplett översikt över projektstatus, tid, kostnader, team och aktiviteter. Sidan har omstrukturerats för bättre överskådlighet och logisk gruppering av information.

## Implementering

### Nya filer skapade:

1. **`app/api/projects/[id]/summary/route.ts`**
   - API-endpoint för att hämta aggregerad projektdata
   - Stöder datumfiltrering via `startDate` och `endDate` query-parametrar
   - Kombinerar data från flera tabeller (projects, time_entries, materials, expenses, mileage, diary_entries, etc.)
   - Matchar dagboksanteckningar med tidrapporter baserat på datum
   - Beräknar statistik som totala timmar, kostnader, progress per fas, etc.

2. **`components/projects/project-detail-client.tsx`**
   - Huvudkomponent för projektdetaljsidan
   - Hanterar datumfiltrering och datahämtning
   - Orkestrerar alla undersektioner

3. **`components/projects/project-date-filter.tsx`**
   - Komponent för datumfiltrering
   - Stöder: Projektstart, Denna månad, Denna vecka, Anpassat intervall

4. **`components/projects/project-time-entries-table.tsx`**
   - Visar tidrapporter tillsammans med dagboksanteckningar
   - Grupperat per datum med expanderbara rader för fullständig dagboksinformation
   - Sammanfattning per person och per fas

5. **`components/projects/project-costs-summary.tsx`**
   - Översikt över material, utgifter och körsträcka
   - Expanderbara kategorier med detaljerad lista
   - Progress bar mot budget

6. **`components/projects/project-alert-settings-display.tsx`**
   - Visar och redigerar projektets alert-inställningar
   - Collapsible sektion för bättre överskådlighet

7. **`components/projects/fixed-time-blocks-card.tsx`**
   - Hanterar fasta fakturaposter för projektet
   - Skapa, redigera och ta bort fasta poster

### Modifierade filer:

1. **`app/dashboard/projects/[id]/page.tsx`**
   - Server Component som hämtar initial data
   - Renderar `ProjectDetailClient` med initial summary data
   - Korrekt bakgrundsfärg för light/dark mode

## Funktioner

### 1. Projektinformation Header
- Projektnamn, nummer och status
- Klient och platsadress
- Redigera projekt-knapp (admin/arbetsledare)

### 2. Datumfilter
- **Projektstart**: All data från projektets startdatum
- **Denna månad**: Data för aktuell månad
- **Denna vecka**: Data för aktuell vecka
- **Anpassat intervall**: Välj start- och slutdatum manuellt
- Alla sektioner uppdateras automatiskt baserat på valt filter

### 3. Snabbåtkomst-knappar
- **Logga tid**: Navigerar till tidrapportering
- **Material**: Navigerar till materialhantering
- **ÄTA**: Navigerar till ÄTA-hantering
- **Dagbok**: Navigerar till dagboksanteckningar

### 4. Översiktskort
Tre kort som visar:

#### Belopp intjänat:
- Beräknat som: timmar × timpris (projekt_hourly_rate_sek)
- Visar totalt belopp i SEK
- Visar även timmar och timpris för transparens
- Om inget timpris finns, visas endast timmar med budgetprocent

#### Totalt Material & Utgifter:
- Totala kostnader (material + expenses + mileage)
- Procent av budget
- Progress bar visar budgetanvändning

#### Antal faser:
- Totalt antal faser i projektet

### 5. Tidrapportering & Dagböcker
- Tidrapporter visas tillsammans med dagboksanteckningar per dag
- Grupperat per datum, person och fas
- Klicka på en rad för att expandera och se fullständig dagboksinformation
- Sammanfattning per person och per fas längst ner
- Sorterbar tabell (datum, person, fas, timmar)

### 6. Material & Kostnader
- Översikt över alla material, utgifter och körsträcka
- Klicka på en kategori för att expandera och se detaljerad lista
- Se totalt belopp och jämför med budget
- Progress bar visar hur mycket av budgeten som används
- Kategorier:
  - **Material**: Antal artiklar, total kostnad, detaljerad lista
  - **Utgifter**: Antal utgifter, total kostnad, detaljerad lista
  - **Körsträcka**: Antal resor, total kostnad, detaljerad lista

### 7. Projektfaser
- Lista alla faser med nummer
- Visa loggad tid vs budget per fas
- Progress bar per fas
- Budget i kronor per fas
- Edit/delete-knappar (om användaren har rättigheter)

### 8. Fasta poster
- Hantera fasta fakturaposter för projektet
- Skapa poster med belopp, moms, period och artikelnummer
- Används för fakturering av fasta belopp
- Status: draft, active, invoiced

### 9. Team
- Lista teammedlemmar med deras roller
- Visa loggade timmar per person
- Hantera teammedlemmar (admin/arbetsledare)

### 10. Alert-inställningar
- Collapsible sektion för bättre överskådlighet
- Konfigurera notifieringar och påminnelser för projektet
- Sätt arbetsdag start/slut-tid
- Aktivera real-time notifieringar för check-in/out
- Konfigurera påminnelser och varningar
- Välj vem som ska få notiser

## API-endpoint

### GET `/api/projects/[id]/summary`

**Query Parameters:**
- `startDate` (optional): Startdatum för filtrering (YYYY-MM-DD)
- `endDate` (optional): Slutdatum för filtrering (YYYY-MM-DD)

**Response format:**
```json
{
  "project": {
    "id": "uuid",
    "name": "string",
    "projectNumber": "string",
    "status": "active|paused|completed|archived",
    "clientName": "string",
    "siteAddress": "string",
    "budgetMode": "none|hours|amount|ep_sync",
    "budgetHours": 120,
    "budgetAmount": 125000,
    "estimatedEndDate": "2025-11-14",
    "createdAt": "2025-01-01T00:00:00Z",
    "projectHourlyRateSek": 650
  },
  "time": {
    "totalHours": 78,
    "budgetHours": 120,
    "remainingHours": 42,
    "percentage": 65,
    "byUser": [
      { "userId": "uuid", "userName": "Johan Johansson", "hours": 28 }
    ]
  },
  "timeEntries": [
    {
      "id": "uuid",
      "date": "2025-01-15",
      "user": {
        "id": "uuid",
        "name": "Johan Johansson"
      },
      "phase": {
        "id": "uuid",
        "name": "Förberedelse"
      },
      "hours": 8.0,
      "taskLabel": "Rivning",
      "diary": {
        "id": "uuid",
        "work_performed": "Rivning av väggar...",
        "weather": "Soligt",
        "temperature_c": 15,
        "crew_count": 3
      }
    }
  ],
  "costs": {
    "materials": 45000,
    "expenses": 8500,
    "mileage": 2500,
    "total": 56000,
    "budgetAmount": 125000,
    "remaining": 69000,
    "percentage": 45
  },
  "costsByCategory": {
    "materials": {
      "total": 45000,
      "count": 24,
      "items": [
        {
          "id": "uuid",
          "description": "Betong",
          "qty": 10,
          "unitPrice": 4500,
          "total": 45000,
          "createdAt": "2025-01-15T10:00:00Z"
        }
      ]
    },
    "expenses": {
      "total": 8500,
      "count": 5,
      "items": [...]
    },
    "mileage": {
      "total": 2500,
      "count": 3,
      "items": [...]
    },
    "total": 56000
  },
  "phases": [
    {
      "id": "uuid",
      "name": "Förberedelse och rivning",
      "sort_order": 0,
      "budgetHours": 16,
      "budgetAmount": 12000,
      "loggedHours": 14,
      "hoursPercentage": 88
    }
  ],
  "team": [
    {
      "userId": "uuid",
      "userName": "Johan Johansson",
      "role": "Projektledare",
      "loggedHours": 28
    }
  ],
  "activities": [
    {
      "id": "uuid",
      "type": "time_entry",
      "description": "Tidrapport created",
      "created_at": "2025-10-27T10:30:00Z",
      "user_name": "Johan Johansson",
      "data": { "duration_min": 240 }
    }
  ],
  "deadline": {
    "date": "2025-11-14",
    "daysRemaining": 19,
    "isPastDue": false
  }
}
```

## Användning

Navigera till: `http://localhost:3000/dashboard/projects/[project-id]`

Sidan visar automatiskt en komplett översikt med alla sektioner i en scrollbar vy.

## Designöverensstämmelse

✅ Header med navigation och projektinfo
✅ Datumfilter för flexibel datafiltrering
✅ Snabbåtkomst-knappar (4 stycken)
✅ Översiktskort (Belopp intjänat, Material & Utgifter, Antal faser)
✅ Tidrapportering & Dagböcker med expanderbara rader
✅ Material & Kostnader med expanderbara kategorier
✅ Projektfaser med numrering och progress
✅ Fasta poster för fakturering
✅ Team-sektion med roller och timmar
✅ Alert-inställningar (collapsible)
✅ Korrekt bakgrundsfärg för light/dark mode

## Teknisk stack

- **Framework**: Next.js 15 (App Router)
- **Rendering**: Server Components för initial data, Client Components för interaktivitet
- **State**: React useState, useEffect, useCallback, useMemo
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data fetching**: Supabase REST API med parallella queries
- **Internationalization**: date-fns med svenskt locale
- **Performance**: Caching med Cache-Control headers, revalidate

## Förbättringar från tidigare version

- ✅ Omstrukturerad layout för bättre överskådlighet
- ✅ Datumfiltrering implementerad
- ✅ Tidrapporter och dagböcker integrerade i samma vy
- ✅ Belopp intjänat beräknas automatiskt (timmar × timpris)
- ✅ Expanderbara sektioner för bättre användarupplevelse
- ✅ Collapsible alert-inställningar
- ✅ Korrekt dark mode support
- ✅ Bättre gruppering av relaterad information

## Framtida förbättringar

- [ ] Real-time uppdateringar med Supabase Realtime
- [ ] Exportera sammanfattning som PDF
- [ ] Jämföra flera projekt
- [ ] Grafer och visualiseringar för trender
- [ ] Export av filtrerad data
- [ ] Spara favoritdatumfilter
