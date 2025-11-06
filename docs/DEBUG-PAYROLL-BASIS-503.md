# Debug Guide: 503 Error på /api/payroll/basis

## Checklista för diagnostisering

### 1. Next.js Server Logs (Terminal)
Kör `npm run dev` och leta efter:

```bash
# Sök efter dessa felmeddelanden:
- "Error fetching payroll basis"
- "Error in GET /api/payroll/basis"
- "Query params:" (för att se vad som skickas)
- "Error details:" (för att se detaljerade fel)
```

### 2. Supabase Logs (Dashboard)
I Supabase Dashboard → Logs, leta efter:

**PostgreSQL Errors:**
- `ERROR:` eller `FATAL:` meddelanden
- `timeout` eller `canceling statement`
- `permission denied` eller `row-level security`

**Query Performance:**
- Queries som tar > 5 sekunder
- `slow query` varningar

### 3. Vanliga orsaker till 503:

#### A. RLS Policy Problem
**Symptom:** `permission denied` eller `new row violates row-level security policy`

**Lösning:** Kontrollera RLS policies på `payroll_basis` tabellen:
```sql
-- Kolla policies
SELECT * FROM pg_policies WHERE tablename = 'payroll_basis';

-- Testa query manuellt
SELECT * FROM payroll_basis 
WHERE org_id = 'YOUR_ORG_ID'
  AND period_start <= '2025-11-30'
  AND period_end >= '2025-11-01';
```

#### B. Index Problem
**Symptom:** Query tar för lång tid (> 10 sekunder)

**Lösning:** Kontrollera indexes:
```sql
-- Kolla indexes på payroll_basis
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'payroll_basis';

-- Om saknas, skapa index:
CREATE INDEX IF NOT EXISTS idx_payroll_basis_org_period 
ON payroll_basis(org_id, period_start, period_end);
```

#### C. Databasanslutningsproblem
**Symptom:** `ECONNREFUSED`, `ETIMEDOUT`, eller `connection refused`

**Lösning:** 
- Kontrollera Supabase connection string i `.env.local`
- Testa anslutningen manuellt
- Kontrollera om Supabase-projektet är aktivt

#### D. Period Filter Problem
**Symptom:** Query returnerar inga resultat eller felaktiga resultat

**Testa query manuellt:**
```sql
-- Testa period-filtreringen
SELECT 
  period_start, 
  period_end, 
  org_id, 
  person_id
FROM payroll_basis
WHERE org_id = 'YOUR_ORG_ID'
  AND period_start <= '2025-11-30'  -- periodEnd
  AND period_end >= '2025-11-01';    -- periodStart
```

### 4. Debug-steg:

1. **Kontrollera att payroll_basis tabellen finns:**
```sql
SELECT COUNT(*) FROM payroll_basis;
```

2. **Kontrollera att det finns data för perioden:**
```sql
SELECT * FROM payroll_basis 
WHERE period_start <= '2025-11-30'
  AND period_end >= '2025-11-01'
LIMIT 10;
```

3. **Testa API-routen direkt:**
```bash
curl "http://localhost:3000/api/payroll/basis?start=2025-11-01&end=2025-11-30" \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

4. **Kontrollera session/auth:**
```bash
# I Next.js logs, leta efter:
- "Unauthorized"
- "Forbidden"
- "No active organization membership"
```

### 5. Temporär Debug-Endpoint

För att få mer information, kan vi lägga till en debug-endpoint som visar mer detaljer.

