# Arbetsorder - Komplett Implementation

## Översikt

Alla EPICs för arbetsorder-funktionaliteten är nu implementerade och fungerar. Detta dokument sammanfattar alla funktioner och hur de används.

---

## ✅ EPIC 49: Work Orders Foundation

### Databasschema
- `work_orders` tabell med alla PRD-fält
- `work_order_assignments` tabell för tilldelningar
- Automatisk generering av unika arbetsordernummer
- RLS policies för säkerhet
- Triggers för automatisk uppdatering

### Funktioner
- Unika arbetsordernummer (WO-YYYY-NNNN format)
- Race condition-skydd med PostgreSQL advisory locks
- Automatisk uppdatering av `updated_at`
- Tvåstegsgodkännande av tid (extra migration)

---

## ✅ EPIC 50: Work Orders API & Types

### API Endpoints
- `GET /api/work-orders` - Lista arbetsorder med filter
- `POST /api/work-orders` - Skapa ny arbetsorder
- `GET /api/work-orders/[id]` - Hämta specifik arbetsorder
- `PUT /api/work-orders/[id]` - Uppdatera arbetsorder
- `DELETE /api/work-orders/[id]` - Ta bort arbetsorder
- `POST /api/work-orders/[id]/assignments` - Lägg till tilldelning
- `POST /api/work-orders/[id]/approve-time` - Arbetarens bekräftelse
- `POST /api/work-orders/[id]/approve-time-manager` - Formans godkännande

### Schemas & Types
- Zod schemas för validering
- TypeScript types med relations
- Svenska felmeddelanden

---

## ✅ EPIC 51: Work Orders UI

### Sidor
- `/dashboard/work-orders` - Lista över alla arbetsorder
- `/dashboard/work-orders/[id]` - Detaljsida för specifik arbetsorder
- `/dashboard/work-orders/[id]/approve-time` - Arbetarens bekräftelsesida
- `/dashboard/work-orders/[id]/approve-time-manager` - Formans godkännandesida

### Komponenter
- `CreateWorkOrderModal` - Skapa ny arbetsorder
- `WorkOrderDetailClient` - Detaljsida med redigering
- `WorkOrderTimeTab` - Tidrapporter för arbetsordern
- `WorkOrderCompletionTab` - Genomförande och stängning
- `WorkOrderDiaryTab` - Dagboksposter för arbetsordern
- `WorkOrderFilters` - Filtrering av listan
- `AddTimeEntryModal` - Lägg till tid från arbetsordern

### Funktioner
- Onboarding UI för nya användare
- Mobile-responsive design
- Voice-to-text för beskrivning
- AddressAutocomplete för plats (Geoapify integration) - fungerar i både create och edit-lägen
- Ett enda adressfält med Geoapify autocomplete (gata, postnummer och stad i ett fält)
- Projektfiltrering - bara projekt för vald kund visas i dropdown
- Platsvisning i översikten - visar gata, gatunummer och stad (utan postnummer)
- Drag-and-drop för tilldelningar
- Jämförelse av planerad vs faktisk tid
- **Interaktiv tour:** `?tour=work-orders` för att starta guidad tour
- **Navigation:** Länkar i sidebar och mobile nav till arbetsorder och dagens arbeten

---

## ✅ EPIC 52: Planning Calendar Integration

### Funktioner
- Arbetsorder visas i planeringskalendern
- WorkOrderCard-komponent för visning
- Drag-and-drop för att ändra datum
- Drag mellan användare för att ändra tilldelning
- Skapa arbetsorder direkt från kalendern
- Klicka på arbetsorder för att öppna detaljsidan

### Teknisk Implementation
- Uppdaterad `get_planning_data` RPC-funktion
- Work orders inkluderas i planning API response
- WorkOrderCard renderas tillsammans med assignments
- CreateWorkOrderDialog för kalendern

---

## ✅ EPIC 53: Mobile Today View

### Funktioner
- `/dashboard/work-orders/today` - Mobilvy för dagens arbetsorder
- WorkOrderTodayScreen och WorkOrderTodayCard komponenter
- "Starta arbete" - sätter `actual_start_at`
- "Avsluta arbete" - sätter `actual_end_at`
- Google Maps-navigation till arbetsplatsen
- Refresh-funktionalitet
- **Navigation:** Länk till "Dagens arbeten" i sidebar (sub-item) och mobile navigation
- **Email:** Knapp "Visa dagens arbeten" i tilldelningsemail

### API
- `GET /api/mobile/work-orders/today` - Hämta dagens arbetsorder för användaren

---

## ✅ EPIC 54: Integration

### Time Entries Integration
- `work_order_id` i `time_entries` tabell
- Work order dropdown i time entry form
- Work order badge i time entries list
- Time entries visas i work order detail (Time tab)
- "Lägg till tid" modal från work order
- Automatisk uppdatering av `actual_start_at`/`actual_end_at`
- Tvåstegsgodkännande av tid

### Diary Integration
- `work_order_id` i `diary_entries` tabell
- Work order dropdown i diary form
- Diary tab i work order detail
- Diary photos visas i work order diary tab
- Gallery viewer för diary photos

### Invoice Integration
- Work order information inkluderas i invoice basis
- Work order `external_summary` visas i invoice lines
- Work order information i `InvoiceBasisLine` interface
- Tidrapporter kopplade till arbetsorder visar arbetsorderns externa sammanfattning

---

## 📧 E-postflöden

### Tilldelningsmail
- Skickas när arbetsorder skapas
- Innehåller arbetsorderns detaljer
- Länk till arbetsordern
- Länk till tidregistrering med förifyllda tider

### Tidsgodkännandemail (Arbetare)
- Skickas efter planerad sluttid när tid är registrerad
- Arbetaren bekräftar sin registrerade tid
- Alternativ att justera tiden

### Tidsgodkännandemail (Forman)
- Skickas efter arbetarens bekräftelse
- Forman granskar planerad vs faktisk tid
- Forman godkänner tiden

---

## 🔐 Säkerhet

### RLS Policies
- Användare kan bara se arbetsorder i sin organisation
- Arbetare kan bara se arbetsorder de är tilldelade till
- Admin och foreman kan se alla arbetsorder
- Endast admin och foreman kan skapa/redigera/ta bort arbetsorder

### Approval Tokens
- Unika tokens för tidsgodkännande
- Tokens är tidsbegränsade
- En token kan bara användas en gång

---

## 📚 Dokumentation

### Användardokumentation
- Guide-sektion i hjälpsidan (`/dashboard/help`)
- FAQ-frågor om arbetsorder
- Interaktiv tour för nya användare

### Teknisk dokumentation
- `docs/work-orders-epic-status.md` - Status för alla EPICs
- `docs/work-orders-time-approval.md` - Detaljerad dokumentation om tidsgodkännande
- `docs/WORK-ORDERS-BRANCH-INFO.md` - Branch information

---

## 🎯 Användningsfall

### Skapa och tilldela arbetsorder
1. Admin/foreman skapar arbetsorder
2. Väljer kund (obligatoriskt)
3. Väljer projekt (bara projekt för vald kund visas)
4. Fyller i detaljer (titel, beskrivning, datum, tid, plats)
5. För plats: Väljer "Annan adress" och använder Geoapify autocomplete för att söka och välja adress
6. Tilldelar en eller flera personer
7. Sparar arbetsordern

### Arbetare följer arbetsorder
1. Arbetare ser arbetsordern i planeringskalendern eller mobilvyn
2. Klickar "Starta arbete" när jobbet börjar
3. Registrerar tid mot arbetsordern
4. Klickar "Avsluta arbete" när jobbet är klart

### Tidsgodkännande
1. Efter planerad sluttid får arbetaren e-post
2. Arbetaren bekräftar sin registrerade tid
3. Forman får e-post för godkännande
4. Forman granskar och godkänner tiden

### Fakturering
1. Admin/foreman skapar fakturaunderlag
2. Work order information inkluderas automatiskt
3. Tidrapporter visar arbetsorderns externa sammanfattning
4. Fakturering blir tydligare och mer detaljerad

---

## 🚀 Framtida förbättringar

Potentiella framtida förbättringar (inte implementerade):
- Recurring work orders
- Work order templates
- Work order dependencies
- Advanced reporting och analytics
- Work order kanban board
- Mobile app (native)

---

## 📝 Noteringar

- ÄTA-integration är avbruten (inte relevant för work orders)
- Alla EPICs är implementerade enligt M1-specifikationen
- "Fristående" arbetsorder är inte implementerade (endast projektbundna)

