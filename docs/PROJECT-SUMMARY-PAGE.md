# Projektdetaljsida - Sammanfattningsvy

## Översikt

En omfattande projektsammanfattningssida som ger en komplett översikt över projektstatus, tid, kostnader, team och aktiviteter.

## Implementering

### Nya filer skapade:

1. **`app/api/projects/[id]/summary/route.ts`**
   - API-endpoint för att hämta aggregerad projektdata
   - Kombinerar data från flera tabeller (projects, time_entries, materials, expenses, mileage, etc.)
   - Beräknar statistik som totala timmar, kostnader, progress per fas, etc.

2. **`components/projects/project-summary-view.tsx`**
   - Client-side React-komponent för att visa projektsammanfattning
   - Fullt responsive design
   - Inkluderar alla sektioner från Figma-designen

### Modifierade filer:

1. **`app/dashboard/projects/[id]/page.tsx`**
   - Lade till "Sammanfattning" som ny tab (standard)
   - Integrerar den nya `ProjectSummaryView`-komponenten

## Funktioner

### 1. Projektinformation Header
- Projektnamn, nummer och status
- Klient och platsadress
- Tillbaka-knapp och inställningar-meny

### 2. Total framsteg
- Kombinerad progress bar (medelvärde av tid och kostnad)
- Orange progress bar som matchar designen

### 3. Snabbåtkomst-knappar
- **Logga tid**: Navigerar till tidrapportering
- **Material**: Navigerar till materialhantering
- **ÄTA**: Navigerar till ÄTA-hantering
- **Dagbok**: Navigerar till dagboksanteckningar

### 4. Tid- och Kostnadsöversikt
Två stora kort som visar:

#### Tidkort:
- Totala loggade timmar
- Procent av budget
- Uppskattat totalt
- Återstående tid
- Deadline med dagar kvar

#### Kostnadskort:
- Totala kostnader (material + expenses + mileage)
- Procent av budget
- Uppskattat totalt
- Kvar av budget (grön/röd baserat på status)

### 5. Projektfaser
- Lista alla faser med nummer
- Visa loggad tid vs budget per fas
- Progress bar per fas
- Budget i kronor per fas
- Edit/delete-knappar (om användaren har rättigheter)
- Sammanfattning längst ner (totalt timmar, total budget, antal faser)

### 6. Team
- Lista teammedlemmar med initialer i cirkel
- Namn och roll
- Loggade timmar per person
- "Bjud in" knapp för att lägga till nya medlemmar

### 7. Material-sammanfattning
- Antal artiklar
- Total kostnad
- Antal väntande (för framtida implementation)
- "Se alla" knapp för att navigera till full materiallista

### 8. Senaste aktiviteter
- De 10 senaste aktiviteterna för projektet
- Ikoner baserat på aktivitetstyp (tid, material, dagbok, etc.)
- Användarnamn och tidsstämpel ("X sedan")
- Relevanta detaljer (timmar, kostnad, etc.)

## API-endpoint

### GET `/api/projects/[id]/summary`

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
    "estimatedEndDate": "2025-11-14"
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
  "costs": {
    "materials": 45000,
    "expenses": 8500,
    "mileage": 2500,
    "total": 56000,
    "budgetAmount": 125000,
    "remaining": 69000,
    "percentage": 45
  },
  "materials": {
    "count": 24,
    "totalCost": 45000
  },
  "phases": [
    {
      "id": "uuid",
      "name": "Förberedelse och rivning",
      "sortOrder": 0,
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

Sidan laddar automatiskt "Sammanfattning"-tabben som standard.

## Designöverensstämmelse

✅ Header med navigation och projektinfo
✅ Total progress bar (orange)
✅ Snabbåtkomst-knappar (4 stycken)
✅ Tid- och kostnadsöversikt kort
✅ Projektfaser med numrering och progress
✅ Team-sektion med initialer
✅ Material-sammanfattning
✅ Senaste aktiviteter med ikoner och tidsstämplar

## Teknisk stack

- **Framework**: Next.js 15 (App Router)
- **Rendering**: Client-side rendering (RSC för parent page)
- **State**: React useState + useEffect
- **Styling**: Tailwind CSS + shadcn/ui components
- **Data fetching**: Supabase RPC + REST API
- **Internationalization**: date-fns med svenskt locale

## Framtida förbättringar

- [ ] Real-time uppdateringar med Supabase Realtime
- [ ] Exportera sammanfattning som PDF
- [ ] Jämföra flera projekt
- [ ] Grafer och visualiseringar för trender
- [ ] Filter för tidsperiod (sista veckan, månaden, etc.)
- [ ] "Väntande material" funktionalitet

