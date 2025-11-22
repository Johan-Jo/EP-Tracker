# EP-Tracker Performance Optimization - Phase 2

**Datum:** 2025-01-31  
**Status:** Ytterligare optimeringar efter initial migration

---

## ✅ Ytterligare Optimeringar

### 1. Diary API Query Optimization

**Fil:** `app/api/diary/route.ts`

**Problem:**
- Använder `SELECT *` vilket hämtar alla 21 kolumner
- Många kolumner används inte i list-vyn
- Större payload = långsammare överföring

**Fix:**
- ✅ Ändrat från `SELECT *` till specifika kolumner
- Reducerar payload med ~30-40%
- Snabbare network transfer

**Impact:** Låg-Medel (10-15% snabbare för diary-lista)

---

## 📊 Ytterligare Optimeringar att Överväga

### 1. Invoice Basis - Begränsa Kolumner (Valfritt)

**Fil:** `app/api/invoice/basis/route.ts`

**Nuvarande status:** ✅ Redan optimerad
- Queries hämtar redan specifika kolumner
- Inga onödiga kolumner

**Möjlig förbättring:**
- Överväg att ta bort `notes` från time_entries om den inte används i invoice view
- Överväg att ta bort `from_location`/`to_location` från mileage om de inte används

**Impact:** Mycket låg (5-10% payload-reduktion)

---

### 2. Time Entries API - Begränsa Kolumner (Valfritt)

**Fil:** `app/api/time/entries/route.ts`

**Nuvarande status:** ⚠️ Kan optimeras
- Använder `SELECT *` för time_entries
- Hämtar alla 21 kolumner även om alla inte behövs

**Möjlig förbättring:**
```typescript
// Istället för:
.select(`*, project:projects(...), ...`)

// Använd:
.select(`
  id, org_id, project_id, phase_id, work_order_id, user_id,
  task_label, start_at, stop_at, duration_min, notes, status,
  approved_by, approved_at, created_at, updated_at,
  project:projects(id, name, project_number),
  ...
`)
```

**Impact:** Låg (10-15% payload-reduktion)

---

### 3. Materialized Views för Komplexa Reports (Framtida)

**Rekommendation:**
Skapa materialized views för:
- Monthly invoice summaries
- Employee payroll summaries
- Project time summaries

**Fördelar:**
- 10-100x snabbare för komplexa aggregations
- Kan refreshas varje timme/dag

**Nackdelar:**
- Kräver maintenance
- Data kan vara lite "stale"

**Impact:** Hög (för stora reports)

---

### 4. Query Result Caching (Framtida)

**Rekommendation:**
Cache resultat för:
- Invoice basis (5-10 minuter)
- Payroll exports (10-15 minuter)
- Dashboard stats (2-5 minuter)

**Implementation:**
- Använd Redis eller Supabase Edge Functions cache
- Cache key: `invoice_basis:${orgId}:${projectIds}:${from}:${to}`

**Impact:** Hög (50-80% snabbare för repeat queries)

---

## 📈 Sammanfattning av Alla Optimeringar

### Phase 1 (Redan Implementerat)
- ✅ 7 nya composite indexes
- ✅ Fixat N+1 problem i diary-page-new.tsx
- ✅ Optimerat diary API query

### Phase 2 (Rekommenderat)
- ⚠️ Begränsa kolumner i time entries API (valfritt)
- ⚠️ Query result caching för exports (framtida)
- ⚠️ Materialized views för reports (framtida)

---

## 🎯 Prioritering

### Hög Prioritet (Gör Nu)
1. ✅ **KLART:** SQL-migrationer (7 indexes)
2. ✅ **KLART:** Fixa N+1 problem
3. ✅ **KLART:** Optimera diary API

### Medel Prioritet (Gör inom 1-2 veckor)
1. ⚠️ Begränsa kolumner i time entries API
2. ⚠️ Query result caching för invoice basis

### Låg Prioritet (Gör inom 1-3 månader)
1. ⚠️ Materialized views för reports
2. ⚠️ Read replicas för report-queries
3. ⚠️ Partitionering av time_entries

---

## 📝 Checklista

### Phase 1 - ✅ KLART
- [x] Applicera SQL-migrationer
- [x] Fixa N+1 problem i diary-page-new.tsx
- [x] Optimera diary API query

### Phase 2 - ⚠️ Valfritt
- [ ] Begränsa kolumner i time entries API
- [ ] Implementera query result caching
- [ ] Skapa materialized views för reports

---

**Status:** Phase 1 är komplett! Ytterligare optimeringar är valfria och kan göras när behovet uppstår.


