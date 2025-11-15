# Godkännandeflöde - Standardisering

**Senast uppdaterad:** 2025-01-15  
**Status:** ✅ Komplett

## Översikt

Alla godkännandeflöden har standardiserats för att ha konsekvent struktur, terminologi och beteende. Detta gäller för:
- Tidrapporter (Time Entries)
- Material (Materials)
- Utlägg (Expenses)
- Miltal (Mileage)
- ÄTA (Change Orders)
- Dagboksposter (Diary Entries) - **kräver inte godkännande**

---

## Statusvärden

Alla typer använder samma statusvärden:

| Status | Beskrivning | Svenska UI |
|--------|-------------|------------|
| `draft` | Utkast, inte inlämnat | "Utkast" |
| `submitted` | Inlämnat, väntar på godkännande | "Väntar godkännande" |
| `approved` | Godkänd | "Godkänd" |
| `rejected` | Avvisad | "Avvisad" |

**Specialfall:**
- **ÄTA** har även `invoiced` status för fakturerade ÄTA
- **Dagboksposter** har ingen status och kräver inte godkännande - de inkluderas direkt i fakturor

---

## API Endpoints

Alla approval endpoints följer samma struktur:

### GET - Hämta poster för granskning
```
GET /api/approvals/{type}?period_start=YYYY-MM-DD&period_end=YYYY-MM-DD&status=submitted
```

**Typer:**
- `/api/approvals/time-entries`
- `/api/approvals/materials`
- `/api/approvals/expenses`
- `/api/approvals/mileage`
- `/api/approvals/ata`

**Response:**
```json
{
  "{type}": [...],  // entries, materials, expenses, mileage, atas
  "error": "..."
}
```

### POST - Godkänn poster (bulk)
```
POST /api/approvals/{type}/approve
Body: { "{type}_ids": ["id1", "id2", ...] }
```

**Endpoints:**
- `/api/approvals/time-entries/approve` - Body: `{ "entry_ids": [...] }`
- `/api/approvals/materials/approve` - Body: `{ "material_ids": [...] }`
- `/api/approvals/expenses/approve` - Body: `{ "expense_ids": [...] }`
- `/api/approvals/mileage/approve` - Body: `{ "mileage_ids": [...] }`
- `/api/approvals/ata/approve` - Body: `{ "ata_ids": [...] }`

**Response:**
```json
{
  "success": true,
  "approved_count": 5
}
```

### POST - Avvisa poster (bulk)
```
POST /api/approvals/{type}/reject
Body: { "{type}_ids": [...], "comments": "Anledning till avslag" }
```

**Endpoints:**
- `/api/approvals/time-entries/reject`
- `/api/approvals/ata/reject`

**Response:**
```json
{
  "success": true,
  "rejected_count": 2
}
```

---

## Felmeddelanden

Alla felmeddelanden är standardiserade till svenska:

### 401 Unauthorized
```json
{ "error": "Inte autentiserad" }
```

### 403 Forbidden
```json
{ 
  "error": "Endast administratörer och arbetsledare kan godkänna {typ}" 
}
```

**Typer:**
- "tidrapporter"
- "material"
- "utlägg"
- "miltal"
- "ÄTA"

### 400 Bad Request
```json
{ "error": "Välj minst en {typ} att godkänna" }
```
eller
```json
{ "error": "period_start och period_end krävs" }
```

### 500 Internal Server Error
```json
{ "error": "Ett oväntat fel uppstod" }
```

---

## Databas

### Schema

Alla tabeller har samma godkännande-fält:

```sql
status TEXT NOT NULL DEFAULT 'draft' 
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
approved_by UUID REFERENCES profiles(id),
approved_at TIMESTAMPTZ,
```

### Tabeller

- `time_entries` - Tidrapporter
- `materials` - Material
- `expenses` - Utlägg
- `mileage` - Miltal
- `ata` - ÄTA (inkluderar även `'invoiced'` i constraint)

**Specialfall:**
- `diary_entries` - Saknar status och godkännande-fält (kräver inte godkännande)

---

## Migration

### ÄTA Status Standardisering

**Fil:** `supabase/migrations/20250115000001_standardize_ata_status.sql`

**Ändringar:**
1. Ändrade ÄTA status från `'pending_approval'` till `'submitted'`
2. Uppdaterade alla befintliga poster
3. Uppdaterade constraint för att tillåta `'submitted'` istället för `'pending_approval'`

**Exekveringsordning:**
1. Ta bort gammal constraint
2. Uppdatera befintliga poster
3. Lägg till ny constraint

---

## UI-komponenter

### Status Badges

Alla komponenter använder konsekventa status badges:

```tsx
case 'draft':
  return <Badge variant="secondary">Utkast</Badge>;
case 'submitted':
  return <Badge variant="outline">Väntar godkännande</Badge>;
case 'approved':
  return <Badge className="bg-green-500">Godkänd</Badge>;
case 'rejected':
  return <Badge variant="destructive">Avvisad</Badge>;
```

### Approvals Page

`components/approvals/approvals-page-new.tsx` hanterar alla typer:
- Time Entries tab - Tidrapporter
- Costs tab - Material, Utlägg, Miltal, ÄTA

**Filter:**
- `all` - Alla statusar
- `pending` - Draft + Submitted (väntar på godkännande)
- `draft` - Utkast
- `submitted` - Inskickat
- `approved` - Godkända
- `rejected` - Avvisade

---

## Fakturaunderlag

Endast **godkända** poster inkluderas i fakturaunderlag:

### Invoice Basis Refresh

`lib/jobs/invoice-basis-refresh.ts` hämtar:
- ✅ Time Entries: `status = 'approved'`
- ✅ Materials: `status = 'approved'` AND `ata_id IS NULL`
- ✅ Expenses: `status = 'approved'` AND `ata_id IS NULL`
- ✅ Mileage: `status = 'approved'`
- ✅ ÄTA: `status = 'approved'`
- ✅ Diary Entries: Alla (kräver inte godkännande)

**Viktigt:** Material och utlägg som är kopplade till ÄTA (`ata_id IS NOT NULL`) exkluderas från fakturaunderlag eftersom de ingår i ÄTA-beloppet.

---

## Notifikationer

### Vid godkännande

Användare får notifikation när deras poster godkänns:
- Tidrapporter: E-post + push-notis med antal timmar
- Material, Utlägg, Miltal, ÄTA: (kommer snart)

### Vid avslag

Användare får notifikation med anledning till avslag och kan redigera posten.

---

## Utvecklaranteckningar

### Lägga till ny godkänningstyp

1. **Databas:**
   - Lägg till `status`, `approved_by`, `approved_at` kolumner
   - Lägg till constraint: `CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))`

2. **API:**
   - Skapa `/api/approvals/{type}/route.ts` (GET)
   - Skapa `/api/approvals/{type}/approve/route.ts` (POST)
   - Skapa `/api/approvals/{type}/reject/route.ts` (POST, valfritt)
   - Använd svenska felmeddelanden

3. **UI:**
   - Lägg till tab i `approvals-page-new.tsx`
   - Lägg till review table komponent
   - Uppdatera status badges för konsistens

4. **Invoice Basis:**
   - Uppdatera `refreshInvoiceBasis()` för att inkludera typen
   - Endast `status = 'approved'` inkluderas

---

## Ändringshistorik

### 2025-01-15
- ✅ Standardiserade ÄTA status från `'pending_approval'` till `'submitted'`
- ✅ Uppdaterade alla API endpoints med svenska felmeddelanden
- ✅ Uppdaterade UI-komponenter för konsekvent terminologi
- ✅ Skapade bulk-approval endpoints för ÄTA
- ✅ Dokumenterat standardiserat mönster

---

## Relaterade filer

**API Endpoints:**
- `app/api/approvals/time-entries/`
- `app/api/approvals/materials/`
- `app/api/approvals/expenses/`
- `app/api/approvals/mileage/`
- `app/api/approvals/ata/`

**UI Komponenter:**
- `components/approvals/approvals-page-new.tsx`
- `components/approvals/time-entries-review-table.tsx`
- `components/approvals/materials-review-table.tsx`

**Library:**
- `lib/approvals/approve-time-entries.ts`
- `lib/jobs/invoice-basis-refresh.ts`
- `lib/jobs/refresh-invoice-basis-for-approvals.ts`

**Migrations:**
- `supabase/migrations/20250115000001_standardize_ata_status.sql`

