# EPIC 48: Fakturaunderlag – Stegbaserat flöde med rollstöd

## Context/Goal

Vi har en befintlig Fakturaunderlag-sida, men den är förvirrande. Målgruppen är svenska byggare med låg finansiell förmåga. Vi måste:

1. Göra flödet stegbaserat, mycket tydligt och linjärt.
2. Stödja två roller:
   - **Admin** – fullständiga rättigheter: godkänna poster, redigera fakturauppgifter, låsa fakturaunderlag, exportera.
   - **Finance** – skrivskyddad på underlag, kan inte godkänna/neka poster eller låsa fakturor, men kan skicka påminnelser till Admin för att få poster godkända och kan exportera låsta fakturor.

Vi antar att det redan finns:
- En organisationsmodell med inställningar.
- Tidrapporter, material, resor/miltal, utlägg och ÄTA-rader, varje med godkännandeflaggor kompatibla med vårt löneflöde.

## User Flow (high-level)

### Step 0 – One-time onboarding (per organization)
Visas första gången någon användare öppnar Fakturaunderlag-sidan för en organisation.

**Mål:** Säkerställ att org-info och bank/betalningsinfo är konfigurerad.

**UI:**
- Titel: "Innan du skapar ditt första fakturaunderlag"
- Två kryssrutor med länkar:
  - "Företagsuppgifter klara"
    - Text: Kontrollera att org-namn, adress, org.nr, kontaktinfo etc. är korrekt.
    - Knapp: "Öppna organisationsinställningar"
  - "Bank- och betaluppgifter klara"
    - Text: Kontrollera att bankgiro/plusgiro/IBAN/Swish etc. är korrekt.
    - Knapp: "Öppna betalinställningar"
- Primärknapp: "Fortsätt till fakturaunderlag" aktiverad endast när båda kryssrutorna är ikryssade.

**Persistence:**
- Lägg till flagga på organizations, t.ex. `invoice_onboarding_completed_at timestamptz NULL`.
- Onboarding visas endast om flaggan är NULL. När användaren klickar "Fortsätt", sätt flaggan och visa sedan riktig Fakturaunderlag UI vid efterföljande besök.
- Både Admin och Finance kan slutföra denna onboarding.

### Step 1 – Select project(s) and period
Detta ersätter den nuvarande översta filterraden.

**Krav:**
- Obligatorisk projektväljare (multi-select).
  - Etikett: "Projekt"
  - Användaren måste välja ett eller flera projekt.
- Obligatoriskt datumintervall: "Från" och "Till".
  - Etikett: "Period"
  - Används för att begränsa poster efter datum.
- Primärknapp: "Hämta underlag"

**Validering:**
- Knapp inaktiverad tills minst ett projekt och båda datum är satta.
- Säkerställ från <= till.
- Vid submit:
  - Anropa en server-API för att hämta ett fakturaunderlag-payload för valda projekt och period.

### Step 2 – Check approvals (Godkännanden)
Efter "Hämta underlag" returnerar servern:

- Alla relevanta rader (tid, material, resor, utlägg, ÄTA) för valda projekt och period, uppdelade i:
  - `approved` – redo för fakturering.
  - `pending` – ännu inte godkända / nekade.

**Om det finns pending-rader:**

Visning av en tydlig varning längst upp:
"Det finns poster som inte är godkända. Du kan inte skapa fakturaunderlag förrän de är hanterade."

Visa en "Pending approvals" sektion som grupperar rader per typ:
- Tid (time)
- Material
- Mil/Resor (travel)
- Utlägg (expenses)
- ÄTA

För varje typ:
- Visa en hopfällbar block / accordion med en enkel tabell:
  - Viktiga kolumner endast: datum, arbetare/UE (för tid), projekt, beskrivning, belopp/timmar, status.
  - Sammanfattningsrad per typ: Antal poster: X | Total ex moms: Y kr.

**Rollbeteende:**

**Admin (canApprove = true):**
- Kan välja rader med kryssrutor.
- Åtgärder per typ:
  - "Godkänn markerade"
  - "Neka markerade"
  - "Godkänn alla"
- Godkännande ska uppdatera befintliga godkännandefält på underliggande rader (återanvänd nuvarande lönegodkännandemönster, t.ex. `approved_at`, `approved_by`).
- Efter godkännande/nekan ska pending-listan uppdateras (hämta fakturaunderlag igen).
- När inga pending-rader återstår över alla typer:
  - Visa grön banner: "Alla poster för vald period är godkända."
  - Visa knapp: "Gå vidare till fakturaunderlag" som scrollar eller fokuserar Step 3.

**Finance (canApprove = false):**
- Ser samma grupperade tabeller men inga kryssrutor, inga godkänn/neka-knappar.
- Längst upp i Pending-sektionen visar:
  - "Det finns X poster som inte är godkända. Kontakta en administratör eller skicka en påminnelse."
- Visa knapp: "Skicka påminnelse till admin"

**Påminnelsebeteende:**
- När Finance klickar "Skicka påminnelse till admin":
  - Visa bekräftelsemodal som summerar:
    - Valda projekt, period.
    - Antal och totalbelopp per typ av pending-rader.
    - Vilka Admin-användare som kommer att få e-post.
  - Vid bekräftelse, anropa en API för att skicka e-post till alla admins i org.
  - E-postmeddelandet innehåller:
    - Ämne: "EP-Tracker – Ogodkänt underlag för fakturering [Projekt… / Period…]"
    - Kort förklaring.
    - Sammanfattning per typ.
    - Djup länk till Fakturaunderlag-sidan med samma projekt(er)/period och fokus på pending approvals.
- Finance kan aldrig ändra godkännandestatus.

**Om det inte finns några pending-rader när fakturaunderlag hämtas:**
- Hoppa över varningen och visa helt enkelt en grön banner:
  - "Alla relevanta poster för vald period är godkända."
- Visa direkt Step 3 preview.

### Step 3 – Preview of invoice basis (Fakturaunderlag)
Detta är huvudvyn för faktura, visas när godkända data finns.

Lägg till en enkel stegindikator längst upp på sidan:
1. Välj projekt & period
2. Kontrollera godkännanden
3. Fakturaunderlag
4. Lås & exportera (koppla till befintlig EPIC 34 senare)

**Layout för Step 3:**

**Summary card:**
- Visar:
  - Projekt som ingår (namn).
  - Period (från/till).
  - Kundnamn (från projekts kund).

**Fakturainfo card:**
- Fält:
  - Serie
  - Fakturanummer
  - Fakturadatum
  - Förfallodatum
  - Betalvillkor (dagar)
  - OCR
  - Valuta
  - Kostnadsställe
  - Resultatenhet
  - ROT/RUT-flagga
  - Omvänd byggmoms
- Lägg till tooltips för svåra fält med enkla svenska förklaringar.
- Beteende:
  - Admin: alla fält redigerbara.
  - Finance: skrivskyddad.

**Line items (radlista):**
- Använd godkända data och gruppera i sektioner per typ:
  - Tid, Material, ÄTA, Mil/Resor, Utlägg.
- För varje rad visa:
  - artikel/kod, beskrivning, antal, enhet, á-pris, moms, konto, summa exkl/inkl moms.
- Beteende:
  - Admin: kan redigera beskrivningar (och alla andra fält vi redan tillåter redigering idag). Ändringar sparas som del av fakturautkastet.
  - Finance: skrivskyddad.

**Diary and ÄTA descriptions:**
- En sektion längst ner:
  - Titel: "Dagboksrader och ÄTA-beskrivningar (ingår i fakturatext)"
  - Visa dagboks/ÄTA-texter som kommer att inkluderas på fakturan/export.
- Skrivskyddad för nu; vi kan senare lägga till redigering om det behövs.

Admin bör kunna spara ett utkast av detta underlag och senare låsa det (EPIC 34). Finance kan visa men inte modifiera.

### Step 4 – Lock & export (hook to existing EPIC 34 / M4)
Du behöver inte implementera den fullständiga låsnings/exportlogiken här om den redan finns i en annan epic, men:

- Behåll en synlig status på fakturaunderlaget: t.ex. "Utkast" vs "Låst" vs "Fakturerat".
- Admin:
  - Kan "Spara utkast".
  - Kan "Lås fakturaunderlag" → anropar befintlig EPIC 34-logik för serie, fakturanummer, hash, etc.
  - Kan exportera till Fortnox när fakturaunderlaget är låst.
- Finance:
  - Ser statusen och, om affärsregler tillåter, kan exportera låsta fakturor (Fortnox/SIE/CSV/PDF).
  - Kan inte låsa upp eller modifiera.

**Statusindikatorer:**
- **Utkast (kan redigeras)** - Fakturaunderlaget är inte låst, kan redigeras
- **Låst [datum]** - Fakturaunderlaget är låst och redo för export
- **Fakturerat [datum]** - Fakturan har exporterats till Fortnox

**Stegindikator:**
- Visar fyra steg: Välj projekt & period, Kontrollera godkännanden, Fakturaunderlag, Lås & exportera
- När export lyckas, markeras steg 4 som "Klart" (completed)

## Permissions Matrix

Implementera en enkel hjälpfunktion för roller och återanvänd på sidan.

| Action | Admin | Finance |
|--------|-------|---------|
| Complete onboarding | ✅ | ✅ |
| Select project(s) and period | ✅ | ✅ |
| View pending approvals | ✅ | ✅ |
| Approve/deny rows | ✅ | ❌ |
| Send reminder email | ✅ | ✅ |
| Edit invoice header/metadata | ✅ | ❌ |
| Edit line-item descriptions | ✅ | ❌ |
| Save draft | ✅ | ❌ |
| Lock invoice basis | ✅ | ❌ |
| Export locked invoice | ✅ | ✅* |

(* Export-behörighet kan justeras senare om det behövs.)

## Implementation Tasks

### 1. Add DB flag & types
- [ ] Migration: lägg till `invoice_onboarding_completed_at timestamptz` till organizations.
- [ ] Uppdatera TS-typer för Organization.

### 2. Onboarding helpers & API
- [ ] Hjälpfunktioner för att läsa/sätta onboarding-flagga.
- [ ] API-rutt: POST `/api/invoice/onboarding` som sätter flaggan (auth + org-check).
- [ ] UI-komponent för onboarding-panel/modal och integration i `app/dashboard/invoice-basis/page.tsx`:
  - Om flagga är null → visa onboarding istället för huvudvyn.

### 3. Invoice basis API + hook
- [ ] API-rutt POST `/api/invoice/basis`:
  - Input: `{ projectIds: string[], from: string, to: string }`
  - Output: `{ approved: {...}, pending: {...} }`, varje grupperad per typ (tid, material, resor, utlägg, ata).
- [ ] Implementera Supabase-frågor och återanvänd befintliga godkännandefält.
- [ ] Lägg till React-hook `useInvoiceBasis(params)` med TanStack Query (eller nuvarande data-fetching-mönster).

### 4. Step 1 UI – project & period filter
- [ ] Bygg en filtersektion med multi-select projekt + datumintervall + "Hämta underlag".
- [ ] Koppla till `useInvoiceBasis`.

### 5. Step 2 UI – Pending approvals panel
- [ ] Rollhjälpfunktioner: `isAdmin(profile)`, `isFinance(profile)` etc.
- [ ] Komponent som:
  - Visar grupperade pending-rader med sammanfattning per typ.
  - För Admin: kryssrutor, "Godkänn markerade", "Neka markerade", "Godkänn alla".
  - För Finance: ingen redigering, men en "Skicka påminnelse till admin"-knapp.

### 6. Approve/deny APIs
- [ ] En rutt (t.ex. POST `/api/invoice/approve`) med `{ type, ids }`.
- [ ] Uppdatera underliggande rader därefter och hämta igen.

### 7. Reminder email feature
- [ ] API-rutt POST `/api/invoice/remind-approvals`:
  - Input: projectIds, from, to, sammanfattning (per typ).
  - Hitta alla Admin-användare i org.
  - Skicka e-post via Resend (eller befintlig e-postinfrastruktur) med sammanfattning + djup länk till Fakturaunderlag-vyn.
- [ ] Koppla till Finance-knappen "Skicka påminnelse".

### 8. Step 3 UI – Preview
- [ ] Lägg till en enkel stepper på sidan.
- [ ] Bygg InvoicePreview-komponent:
  - Sammanfattningskort (projekt/period/kund).
  - Fakturainfo-kort (redigerbart för Admin, skrivskyddat för Finance).
  - Radposter grupperade per typ baserat på godkända data; Admin kan redigera beskrivningar.
  - Dagbok/ÄTA-text-område (skrivskyddat för nu).
- [ ] Använd befintlig fakturaunderlag eller skapa en minimal "utkast"-representation så att redigeringar kan sparas senare.

### 9. Step 4 placeholders – Save draft & lock
- [ ] Lägg till knappar "Spara utkast" och "Lås fakturaunderlag" endast för Admin.
- [ ] Koppla till befintliga eller nya APIs enligt EPIC 34:
  - Utkast: spara fakturaunderlag meta + rader.
  - Lås: ändra status till LOCKED, tilldela fakturanummer/serie/hash.
- [ ] Visa tydlig status i UI.

### 10. General
- [ ] Använd befintliga mönster för auth, Supabase-klient och shadcn/ui-styling.
- [ ] Gör layouten mobilvänlig (tabeller kan kollapsa till kort på små skärmar).
- [ ] Lägg till tydliga kommentarer där vi senare kan utöka med:
  - Merge/split fakturarader.
  - Mer avancerade exportalternativ.

## Acceptance Criteria

- [ ] Steg 0: Onboarding visas första gången för varje organisation och kan slutföras av Admin eller Finance.
- [ ] Steg 1: Multi-select projekt + datumintervall filter med validering.
- [ ] Steg 2: Pending approvals-panel visar rader per typ med Admin/Finance-rollspecifika åtgärder.
- [ ] Admin kan godkänna/neka rader via checkbox-val och bulk-åtgärder.
- [ ] Finance kan skicka påminnelser till Admin med e-post sammanfattning och djup länk.
- [ ] Steg 3: Preview visar fakturaunderlag med redigerbara fält för Admin, skrivskyddat för Finance.
- [ ] Steg 4: Status och lås/export-knappar fungerar enligt befintlig EPIC 34-logik.
- [ ] Alla roller kan navigera genom hela flödet med tydliga visuella indikatorer.
- [ ] Mobilvänlig layout med kollapsbara tabeller/kort.

## Technical Notes

- Återanvänd befintliga approval-fält: `approved_by`, `approved_at`, `status` på `time_entries`, `materials`, `expenses`, `mileage`, `ata`.
- För e-post, använd Resend (eller befintlig e-postinfrastruktur) med mallar.
- Rollbaserad åtkomst kontrolleras både på frontend (conditional rendering) och backend (API-validering).
- Data fetching använder TanStack Query för caching och automatisk uppdatering.

## Related Epics

- EPIC 34: Fakturaunderlag – vy, låsning, export (M4)
- EPIC (tbd): Email notifications system

