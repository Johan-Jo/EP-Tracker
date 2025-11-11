# EPIC 34: Fakturaunderlag – vy, låsning, export (M4)

## Context/Goal
Fakturaunderlaget ska samla tid, material, utlägg, mil, ÄTA och dagbok per projekt/period. Användaren ska kunna:

1. Välja projekt/period och granska samtliga rader.
2. Redigera header/rader innan låsning.
3. Låsa underlaget (fakturaserie, nummer, OCR, hash) och exportera CSV (Fortnox/Visma-ready).
4. Spåra alla ändringar via audit-logg.

UI finns under `Dashboard → Fakturaunderlag` (synligt för admin/arbetsledare/ekonomi).

## Scope
- **M4a (View):** Läs vy över fakturaunderlag (`/dashboard/invoice-basis`), auto-refresh från befintlig data.
- **M4b (Editing):** Inline-redigering av rader + headerfält, audit-logg på alla uppdateringar.
- **M4c (Lock & Export):** Låsa/oplåsa med OCR + hash, exportera låst snapshot som CSV.
- **M4d (Compliance/PDF/SIE):** Planerad – ej implementerad i denna iteration.
- **M4e (Fortnox/Visma integrationer):** Planerad – ej implementerad.

## Implementation Phases
1. `invoice_basis` tabell + refresh-jobb (`lib/jobs/invoice-basis-refresh.ts`) – aggregerar alla linjetyper och totals.
2. API + hooks för header/radredigering (`POST /header`, `POST /lines/[lineId]`), auditlogg.
3. Lock/Unlock API (serie/nummer/OCR/hash, auditlogg) och CSV-export som använder låst snapshot.
4. Dashboard-sida med full UI-flöde + navigation och uppdaterad hjälpsektion.

## Invoice Line Types (lines_json)
- `time` – godkända `time_entries`, timtaxa från `memberships.hourly_rate_sek`.
- `material` – godkända `materials`.
- `expense` – godkända `expenses`.
- `mileage` – godkända `mileage`.
- `ata` – godkända `ata`.
- `diary` – sanerade dagbokssammanfattningar (text-rader utan belopp).
- `attachments` – URL:er till foton/kvitton när tillgängligt.

## Data model & Migrations
- `supabase/migrations/20251108000001_invoice_basis_table.sql`
  - Headerfält: serie/nummer, datum, OCR, referenser, reverse charge, ROT/RUT, adresser, dimensioner.
  - Payload: `lines_json` (lines + diary), `totals` (per momssats + total).
  - Låsstatus: `locked`, `locked_by`, `locked_at`, `hash_signature`.

## Jobs/Schedulers

### Invoice Basis Refresh
- **Location:** `lib/jobs/invoice-basis-refresh.ts`
- **Function:** `refreshInvoiceBasis({ orgId, projectId, periodStart, periodEnd })`
- **Flow:**
  1. Hämtar godkända poster i hela perioden.
  2. Beräknar rader, moms, totals och dagbokssammanfattningar.
  3. Upsertar `invoice_basis` (så länge den inte är låst).
  4. Returnerar snapshot som används av API/UI.

## API Routes (huvudflöde)

| Endpoint | Beskrivning | Auth | Audit |
| --- | --- | --- | --- |
| `GET /api/invoice-basis/[projectId]?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD` | Hämtar (och refreshar) invoice_basis | Admin/Foreman/Finance | – |
| `POST /api/invoice-basis/[projectId]/header` | Uppdaterar headerfält, auto-beräknar förfallodatum | Admin/Foreman | ✅ |
| `POST /api/invoice-basis/[projectId]/lines/[lineId]` | Uppdaterar rad (artikel, konto, moms, á-pris, etc.) | Admin/Foreman | ✅ |
| `POST /api/invoice-basis/[projectId]/lock` | Tilldelar serie/nummer/OCR, beräknar hash, låser | Admin | ✅ |
| `POST /api/invoice-basis/[projectId]/unlock` | Låser upp (kräver motivering) | Admin | ✅ |
| `GET /api/exports/invoice?projectId=...&start=...&end=...` | Exporterar låst snapshot som CSV | Admin/Foreman/Finance | Loggas via integration_batches |

> OBS: CSV kräver `locked = true`. PDF/SIE reserverat för framtida iteration.

## UI-specifikation

### Navigation & Åtkomst
- **Entré:** `Dashboard → Fakturaunderlag` renderad av `app/dashboard/invoice-basis/page.tsx` i befintlig `DashboardShell`.
- **Roller:** Admin, arbetsledare och ekonomi har läsbehörighet; endast admin kan låsa/oplåsa. Behörigheter kontrolleras både i layouten (conditional rendering) och i API-anrop.
- **Snabbkommandon:** `⌘/Ctrl+K` öppnar kommandopalett, `⌘/Ctrl+R` triggar refresh, `⌘/Ctrl+Z` respektive `Shift+⌘/Ctrl+Z` hanterar ångra/gör om vid osparade ändringar.

### Grundlayout
- **Filterpanel:** Desktop visar vänsterspalt med projektväljare (`Select`), datumintervall (`DateRangePicker`) och manuell refresh-knapp; mobil kapslar in filtret i överliggande `Accordion` och presenterar aktiva filter som chips under sidtiteln.
- **Innehållskolumn:** `DataTable` (shadcn) driver tabellinnehållet; toppsektionen innehåller totalskort (ex moms/moms/inkl moms/antal rader) och statuschip (`Öppen`, `Låst`, `Låsning pågår`).
- **Sekundärkolumn:** När viewport ≥ `lg` används `ResizablePanelGroup` för totals- och aktivitetslogg; på mindre skärmar flyttas korten under tabellen.
- **State-hantering:** React Query ansvarar för serverdata + cache/invalidations; Zustand slice lagrar lokala utkast, filter och autosave-status.

### M4a – Läs vy
- **Tabellstruktur:** Kolumner för Typ, Beskrivning, Konto, Á-pris, Antal, Enhet, Moms %, Radbelopp och Kommentar. Rader grupperas per linjetyp med hopfällbara sektioner (accordion på mobil) och subtotal-rad.
- **Dagbok & Bilagor:** `Tabs` (`Rader`, `Dagbok`, `Bilagor`). Dagboksvyn visar datum, användare och markdown-renderad anteckning. Bilagor visas i responsivt grid (3× på desktop, 2× på mobil) med `Dialog`-lightbox och direktnedladdning.
- **Tom- och fellägen:** Tom vy visar illustration, text och CTA `"Kör uppdatering"`. Felhantering sker via `Alert` (variant `destructive`) med retry-knapp och teknisk felkod i `details`.
- **Auditindikator:** Banner visar senaste refresh, användare och datakälla; spinner (`Loader2`) aktiveras vid bakgrundsrefresh.

### M4b – Redigering
- **Aktivering:** När `locked = false` får behöriga roller knappen `"Redigera"` som växlar sidan till redigeringsläge (sticky banner + soft background). Banner visar antal osparade ändringar, `Spara`, `Ångra alla` samt länkar till auditlogg.
- **Headerredigering:** Trigger öppnar `Sheet` från höger med sektioner (Fakturainfo, Kunduppgifter, Betalning, Referenser). Fält (`Input`, `Textarea`, `Select`, `Checkbox`) valideras via `zodResolver`. `OCR` och `Hash` visas som read-only badges med copy-knapp.
- **Radredigering:** Cellklick öppnar `Popover` med formulär; multi-selekt (checkboxkolumn) möjliggör bulkändringar i `Dialog`. Tangentbordsnav: `Enter` sparar cell, `Esc` avbryter, `Tab`/`Shift+Tab` hoppar mellan redigerbara fält.
- **Draft-hantering:** Autosave till Zustand/localStorage var 5:e sekund. Navigationsförsök med osparade ändringar triggar `AlertDialog` för bekräftelse. Sparade ändringar kvitteras med `Toast` som summerar fält, användare och tid samt länkar till auditlogg.

### M4c – Låsning & Export
- **Låsflöde:** Primär CTA `"Lås underlag"` (`variant="destructive"`) öppnar `Dialog` med stegvisa kort: (1) Bekräfta eller redigera serie/nummer, (2) Visa/generera OCR med copy-knapp, (3) Bekräftelseruta "Jag intygar att underlaget är komplett". Lyckad låsning uppdaterar statuschip och visar `Toast`.
- **Oplåsning:** Admin-only `OutlineButton` `"Lås upp"` öppnar `AlertDialog` som kräver motivering (min 15 tecken) och OTP via befintlig 2FA-modal. Misslyckade försök loggas och visar `Toast` med felkod.
- **Exportpanel:** När `locked = true` visas stickybalk med `Exportera CSV` (primär) och `Ladda ned bilagor` (sekundär). `Select` väljer format (Standard, Fortnox, Visma). Exporter körs async och visar både `Toast` och sidopanel (`Sheet`) med `Progress` och historiklista (tid, format, användare, länk).

### Responsivitet
- **Desktop (`lg+`):** Trekolumnslayout (filter / tabell / totals & logg). Tabell har sticky header och horisontell scroll för smala viewportar.
- **Tablet (`sm–lg`):** Filter blir `Accordion`, totalskort flyttas under tabell, actions ligger i sticky footer.
- **Mobil (`<sm`):** Tabell ersätts av kortlista (kort visar sammanfattning + expanderbar detalj). `StickyActionBar` längst ned exponerar `Spara`, `Lås` och `Export`.

### Laddning, Skeletons & Fel
- Skeletonkort för header, tabellrader (5 rader med shimmer) och bilagor. Filterselects visar skeleton tills data laddats.
- Global background refresh indikerar status i statuschipet och spinner i tabellhörn. `useMutation`-fel visar `Toast` + inline-fel under fält.
- Offline-tillstånd visar banner med queue-status och pausad autosync.

### Tillgänglighet & Hjälp
- Modal- och sheetkomponenter sätter `initialFocus`, tillåter Esc-stängning och beskriver flöden med `aria-describedby`.
- Expandabla rader använder `aria-expanded` och `aria-controls`; statuschip anger `aria-live="polite"` för låsstatus.
- Alla kritiska knappar får kontextbaserade `aria-label` (ex. `"Lås underlag för Projekt X, period 2025-10-01 – 2025-10-31"`). Färg/ikon-kontrast följer WCAG AA.
- Först-besökare får info-banner med länk till `/dashboard/help/invoice-basis`. `WalkthroughDialog` (3 steg) kan triggas via `"Visa rundtur"`. Hjälppanel listar tangentbordsgenvägar och har `Skip to content`-länk högst upp.

## Security, Audit & Navigation
- RLS per organisation/projekt (endast medlemmar ser underlag).
- Låsning krävs innan export och verhindert fler ändringar.
- Audit-logg (`audit_log`) registrerar header/line-ändringar, lock/unlock.
- UI nås via sidomenyn: *Fakturaunderlag* (ikon `FileText`).
- Hjälpsidan (`/dashboard/help`) uppdaterad med nytt arbetsflöde.

## Acceptance (levererat)
- I1. `invoice_basis` konsumerar alla linjetyper + dagbok.
- I2. UI möjliggör redigering, låsning, export och tydlig status.
- I3. CSV-export ger 100% låst snapshot (inkl. moms, totals, fakturainfo).
- I4. Audit-logg på samtliga muterande operationer.
- I5. Navigering och hjälptexter matchar den nya sidan.
