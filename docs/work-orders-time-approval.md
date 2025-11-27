# Arbetsorder – Tidsgodkännande

## Översikt

Systemet använder ett tvåstegsgodkännandeflöde för att säkerställa att registrerad tid på arbetsorder är korrekt och godkänd av både arbetaren och forman/administratör.

## Flöde

### Steg 1: Arbetarens bekräftelse

**När triggas det?**
- När den **planerade sluttiden** (`planned_end_at`) har passerat
- När det finns **registrerad tid** på arbetsordern (time_entries med `work_order_id`)
- När inställningen `send_time_approval_email` är aktiverad (standard: ja)

**Vad händer?**
1. Systemet skickar ett e-post till alla tilldelade arbetare
2. E-posten innehåller:
   - Jämförelse mellan planerad och faktisk tid
   - Avvikelse (över/under planerad tid)
   - Länk för att bekräfta tiden
   - Länk för att justera tiden om det behövs
3. Arbetaren klickar på "Bekräfta registrerad tid" eller "Justera tid"
4. Om arbetaren bekräftar, registreras:
   - `actual_time_worker_confirmed_at` (tidsstämpel)
   - `actual_time_worker_confirmed_by_id` (arbetarens ID)

**Vad händer om arbetaren justerar tiden?**
- Arbetaren omdirigeras till tidsregistreringssidan med arbetsordern förifylld
- Arbetaren kan uppdatera sina tidrapporter
- Efter uppdatering kan arbetaren bekräfta igen

### Steg 2: Formans godkännande

**När triggas det?**
- När arbetaren har bekräftat sin tid (`actual_time_worker_confirmed_at` är satt)
- När e-post inte redan har skickats (`actual_time_manager_approval_sent_at` är null)

**Vad händer?**
1. Systemet skickar ett e-post till alla admins/managers/owners i organisationen
2. E-posten innehåller:
   - Arbetarens namn
   - Jämförelse mellan planerad och faktisk tid
   - Avvikelse
   - Länk för att godkänna tiden
   - Länk för att granska arbetsordern
3. Forman klickar på "Godkänn registrerad tid"
4. När forman godkänner, registreras:
   - `actual_time_manager_approved_at` (tidsstämpel)
   - `actual_time_manager_approved_by_id` (formans ID)

## Databasstruktur

### Nya kolumner i `work_orders` tabellen

**Arbetarens bekräftelse:**
- `actual_time_worker_confirmed_at` (TIMESTAMPTZ, nullable) - När arbetaren bekräftade
- `actual_time_worker_confirmed_by_id` (UUID, nullable, FK till profiles) - Vem som bekräftade

**Formans godkännande:**
- `actual_time_manager_approval_token` (TEXT, unique, nullable) - Unik token för godkännandelänk
- `actual_time_manager_approval_sent_at` (TIMESTAMPTZ, nullable) - När e-post skickades till forman
- `actual_time_manager_approved_by_id` (UUID, nullable, FK till profiles) - Vem som godkände
- `actual_time_manager_approved_at` (TIMESTAMPTZ, nullable) - När forman godkände

**Befintliga kolumner (från tidigare migration):**
- `send_time_approval_email` (BOOLEAN, default true) - Om e-post ska skickas
- `actual_time_approval_token` (TEXT, unique, nullable) - Token för arbetarens bekräftelse
- `actual_time_approval_sent_at` (TIMESTAMPTZ, nullable) - När e-post skickades till arbetaren
- `actual_time_approved_by_id` (UUID, nullable, FK till profiles) - **OBS:** Används inte längre, ersatt av worker_confirmed_by_id
- `actual_time_approved_at` (TIMESTAMPTZ, nullable) - **OBS:** Används inte längre, ersatt av worker_confirmed_at

## E-postmallar

### 1. `work-order-time-approval` (Arbetaren)

**Skickas till:** Tilldelade arbetare  
**När:** Efter att planerad sluttid har passerat  
**Innehåll:**
- Planerad vs faktisk tid
- Avvikelse
- Länk för att bekräfta
- Länk för att justera tid

**Template:** `lib/email/templates/work-order-time-approval.tsx`

### 2. `work-order-time-manager-approval` (Forman)

**Skickas till:** Alla admins/managers/owners i organisationen  
**När:** Efter att arbetaren har bekräftat sin tid  
**Innehåll:**
- Arbetarens namn
- Planerad vs faktisk tid
- Avvikelse
- Länk för att godkänna
- Länk för att granska arbetsordern

**Template:** `lib/email/templates/work-order-time-manager-approval.tsx`

## API Routes

### POST `/api/work-orders/[id]/approve-time`

**Syfte:** Arbetaren bekräftar sin registrerad tid

**Request:**
- Query param: `token` (approval token)
- Auth: Inloggad användare

**Response:**
- `{ success: true }` om bekräftelse lyckades
- `{ error: "..." }` om token är ogiltig eller redan bekräftad

**Efter bekräftelse:**
- Triggar `sendWorkOrderManagerApprovalEmail()` (fire and forget)

### POST `/api/work-orders/[id]/approve-time-manager`

**Syfte:** Forman godkänner arbetarens bekräftade tid

**Request:**
- Query param: `token` (manager approval token)
- Auth: Inloggad användare med roll admin/manager/owner

**Response:**
- `{ success: true }` om godkännande lyckades
- `{ error: "..." }` om token är ogiltig, redan godkänd, eller användaren saknar behörighet

## Sidor

### `/dashboard/work-orders/[id]/approve-time`

**Syfte:** Arbetaren bekräftar sin tid

**Vem:** Tilldelade arbetare  
**Vad:**
- Visar arbetsorderinformation
- Knapp för att bekräfta tiden
- Länk för att justera tid (om behövs)

### `/dashboard/work-orders/[id]/approve-time-manager`

**Syfte:** Forman godkänner tiden

**Vem:** Admins/managers/owners  
**Vad:**
- Visar arbetsorderinformation
- Visar arbetarens namn
- Visar när arbetaren bekräftade
- Knapp för att godkänna tiden
- Länk för att granska arbetsordern

## Funktioner

### `sendWorkOrderTimeApprovalEmail()`

**Fil:** `lib/work-orders/send-time-approval-email.ts`

**Vad gör den:**
1. Hämtar arbetsorder med tilldelningar
2. Kontrollerar att `planned_end_at` har passerat
3. Kontrollerar att det finns registrerad tid
4. Kontrollerar att e-post inte redan skickats
5. Beräknar planerad vs faktisk tid
6. Genererar approval token
7. Uppdaterar `actual_time_approval_token` och `actual_time_approval_sent_at`
8. Skickar e-post till alla tilldelade arbetare

**När anropas:**
- Automatiskt när time entries skapas/uppdateras (via `app/api/time/entries/route.ts`)
- Endast om `planned_end_at` har passerat

### `sendWorkOrderManagerApprovalEmail()`

**Fil:** `lib/work-orders/send-manager-approval-email.ts`

**Vad gör den:**
1. Hämtar arbetsorder med arbetarens information
2. Kontrollerar att arbetaren har bekräftat (`actual_time_worker_confirmed_at`)
3. Kontrollerar att e-post inte redan skickats
4. Hämtar alla admins/managers/owners i organisationen
5. Beräknar planerad vs faktisk tid
6. Genererar manager approval token
7. Uppdaterar `actual_time_manager_approval_token` och `actual_time_manager_approval_sent_at`
8. Skickar e-post till alla managers

**När anropas:**
- Efter att arbetaren har bekräftat sin tid (via `POST /api/work-orders/[id]/approve-time`)

## Automatisk uppdatering av faktisk tid

Systemet uppdaterar automatiskt `actual_start_at` och `actual_end_at` på arbetsordern baserat på time entries:

- `actual_start_at` = MIN(`start_at`) från alla time entries för arbetsordern
- `actual_end_at` = MAX(`stop_at`) från alla time entries för arbetsordern

Detta görs via en trigger i databasen (`trigger_update_work_order_actual_times`).

## Inställningar

### `send_time_approval_email`

**Typ:** BOOLEAN  
**Default:** true  
**Var:** I arbetsordern (`work_orders.send_time_approval_email`)

**Vad gör den:**
- Om `true`: E-post skickas till arbetare och forman (om villkor är uppfyllda)
- Om `false`: Inga e-post skickas, men tiden kan fortfarande granskas manuellt

**Var ändras den:**
- När arbetsordern skapas (checkbox i formuläret)
- Kan redigeras på arbetsorderns detaljsida (om behövs)

## Säkerhet

### Tokens

- Varje godkännandelänk har en unik token
- Tokens genereras med `generateApprovalToken()` (base64url, 32 bytes)
- Tokens är unika per arbetsorder och steg
- Tokens valideras mot databasen vid varje anrop

### Behörigheter

**Arbetarens bekräftelse:**
- Alla tilldelade arbetare kan bekräfta sin tid
- Token måste matcha arbetsordern

**Formans godkännande:**
- Endast admins/managers/owners kan godkänna
- Token måste matcha arbetsordern
- Användaren måste vara medlem i samma organisation

## Migration

**Fil:** `supabase/migrations/20250128000001_work_order_two_step_approval.sql`

**Vad gör den:**
- Lägger till kolumner för arbetarens bekräftelse
- Lägger till kolumner för formans godkännande
- Skapar index för prestanda

**Kör:**
```sql
-- Kör migrationen i Supabase SQL Editor
```

## Felsökning

### E-post skickas inte till arbetare

**Kontrollera:**
1. Är `planned_end_at` satt och har den passerat?
2. Finns det registrerad tid på arbetsordern?
3. Är `send_time_approval_email` aktiverad?
4. Har e-post redan skickats? (kolla `actual_time_approval_sent_at`)
5. Har arbetare e-postadresser i sina profiler?

### E-post skickas inte till forman

**Kontrollera:**
1. Har arbetaren bekräftat sin tid? (kolla `actual_time_worker_confirmed_at`)
2. Har e-post redan skickats? (kolla `actual_time_manager_approval_sent_at`)
3. Finns det admins/managers/owners i organisationen?
4. Har de e-postadresser i sina profiler?

### Token är ogiltig

**Möjliga orsaker:**
- Token har använts redan
- Arbetsordern har tagits bort
- Token är felaktig i URL:en

**Lösning:**
- Öppna arbetsordern direkt och bekräfta/godkänn därifrån

## Relaterade filer

### Migrations
- `supabase/migrations/20250127000001_work_order_actual_time_tracking.sql` (initial approval fields)
- `supabase/migrations/20250128000001_work_order_two_step_approval.sql` (two-step approval)

### E-postmallar
- `lib/email/templates/work-order-time-approval.tsx`
- `lib/email/templates/work-order-time-manager-approval.tsx`

### Funktioner
- `lib/work-orders/send-time-approval-email.ts`
- `lib/work-orders/send-manager-approval-email.ts`
- `lib/work-orders/generate-approval-token.ts`

### API Routes
- `app/api/work-orders/[id]/approve-time/route.ts`
- `app/api/work-orders/[id]/approve-time-manager/route.ts`

### Sidor
- `app/dashboard/work-orders/[id]/approve-time/page.tsx`
- `app/dashboard/work-orders/[id]/approve-time-manager/page.tsx`

### Hjälp & Dokumentation
- `components/help/help-page-new.tsx` (guide och FAQ)
- `docs/work-orders-time-approval.md` (denna fil)

