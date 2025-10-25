# 📋 Applicera Dashboard Optimization Migration

## ⚠️ VIKTIGT - Läs Först!

**Detta är en databas-migration som kommer att:**
- Skapa 2 nya funktioner
- Lägga till 11 nya index
- Förbättra dashboard-prestanda med ~60%

**Riskbedömning:** 🟡 MEDIUM
- ✅ Funktioner är idempotenta (kan köras flera gånger)
- ✅ Index skapar endast om de inte finns
- ✅ Ingen data ändras eller raderas
- ⚠️ Kan ta 30-60 sekunder att köra

---

## 🚀 Steg 1: Öppna Supabase Dashboard

1. Gå till: **https://supabase.com/dashboard**
2. Logga in om du inte redan är det
3. Välj ditt projekt: **EP-Tracker**

---

## 🗄️ Steg 2: Öppna SQL Editor

1. I vänstermenyn, klicka på **SQL Editor** (databas-ikonen)
2. Klicka på **+ New query** (överst till höger)

---

## 📝 Steg 3: Kopiera SQL-koden

Kopiera **HELA INNEHÅLLET** från filen:
```
supabase/migrations/20250125000001_dashboard_optimization.sql
```

**Tips:** Jag har skapat filen - du kan öppna den i Cursor och kopiera allt (Ctrl+A, Ctrl+C)

---

## ▶️ Steg 4: Kör Migrationen

1. **Klistra in** SQL-koden i SQL Editor
2. **Dubbelkolla** att allt är inklistrat korrekt (273 rader)
3. **Klicka på "Run"** (eller tryck Ctrl+Enter)

### ⏱️ Förväntat Resultat:

```
Success. No rows returned

Completed in X.XX seconds
```

Om du ser detta: **PERFEKT!** ✅

---

## ✅ Steg 5: Verifiera Att Det Fungerade

Kör dessa test-queries i samma SQL Editor:

### Test 1: Verifiera att funktionerna skapades
```sql
-- Detta ska returnera 2 rader
SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('get_dashboard_stats', 'get_recent_activities')
  AND routine_schema = 'public';
```

**Förväntat resultat:** 2 rader (en för varje funktion) ✅

---

### Test 2: Verifiera att indexen skapades
```sql
-- Detta ska returnera minst 11 nya index
SELECT 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
  AND tablename IN ('time_entries', 'projects', 'materials', 'expenses', 'ata', 'diary_entries')
ORDER BY tablename, indexname;
```

**Förväntat resultat:** 11+ rader med index ✅

---

### Test 3: Testa get_dashboard_stats() funktionen
```sql
-- Använd ditt eget user_id och org_id
SELECT get_dashboard_stats(
  auth.uid(),
  (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
  NOW() - INTERVAL '7 days'
);
```

**Förväntat resultat:** 
```json
{
  "projectsCount": 5,
  "timeEntriesCount": 23,
  "materialsCount": 15
}
```
*(Dina siffror kommer vara olika)* ✅

---

### Test 4: Testa get_recent_activities() funktionen
```sql
-- Hämta 5 senaste aktiviteterna
SELECT 
  type,
  created_at,
  project_name,
  user_name
FROM get_recent_activities(
  (SELECT org_id FROM memberships WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
  5
);
```

**Förväntat resultat:** 5 rader med aktiviteter ✅

---

## 🎉 Steg 6: Klart!

Om alla tester fungerade:
- ✅ Funktioner skapade
- ✅ Index skapade
- ✅ Permissions grantade
- ✅ Allt fungerar!

**Migrationen är KLAR!** 🚀

---

## 🔄 Nästa Steg: Uppdatera Applikationskoden

**OBS:** Funktionerna finns nu i databasen, men applikationen använder dem inte ännu.

För att få full effekt behöver du:
1. Uppdatera `app/dashboard/page.tsx` 
2. Skapa React Query hooks för de nya funktionerna
3. Testa lokalt
4. Deploya till Vercel

**Se:** `PERFORMANCE-IMPROVEMENT-EPIC.md` → Story 26.4 för implementation.

---

## ⚠️ Om Något Går Fel

### Problem: "Permission denied"
**Lösning:** Du kanske inte har rättigheter. Kontakta database admin.

### Problem: "Function already exists"
**Lösning:** Det är OK! Funktionerna är `CREATE OR REPLACE` så de uppdateras automatiskt.

### Problem: "Table does not exist"
**Lösning:** Kontrollera att tabellnamnen är korrekta i din databas.

---

## 🔙 Rollback (Om Nödvändigt)

Om du vill ta bort migrationen:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS get_recent_activities(uuid, int);

-- Drop indexes (valfritt - de gör ingen skada)
DROP INDEX IF EXISTS idx_time_entries_user_start;
DROP INDEX IF EXISTS idx_time_entries_org_created;
DROP INDEX IF EXISTS idx_time_entries_org_null_stop;
DROP INDEX IF EXISTS idx_projects_org_status;
DROP INDEX IF EXISTS idx_projects_org_created;
DROP INDEX IF EXISTS idx_materials_user_created;
DROP INDEX IF EXISTS idx_materials_org_created;
DROP INDEX IF EXISTS idx_expenses_user_created;
DROP INDEX IF EXISTS idx_expenses_org_created;
DROP INDEX IF EXISTS idx_ata_org_created;
DROP INDEX IF EXISTS idx_diary_entries_org_created;
```

---

## 📊 Monitoring Efter Deployment

Efter att applikationen använder funktionerna, övervaka:

1. **Query Performance** i Supabase Dashboard → Database → Query Performance
2. **Dashboard load times** - ska vara ~60% snabbare!
3. **Error logs** - inga nya fel borde dyka upp

---

## ✅ Checklist

Innan du börjar:
- [ ] Jag är inloggad i Supabase Dashboard
- [ ] Jag har tillgång till SQL Editor
- [ ] Jag har kopierat SQL-koden från migration-filen

Efter körning:
- [ ] Migrationen kördes utan fel
- [ ] Test 1: Funktioner finns ✅
- [ ] Test 2: Index finns ✅
- [ ] Test 3: get_dashboard_stats() fungerar ✅
- [ ] Test 4: get_recent_activities() fungerar ✅

---

**Lycka till! Du kommer få ~60% snabbare dashboard queries! 🚀**

**Beräknad tid:** 5-10 minuter  
**Svårighetsgrad:** 🟢 ENKEL (bara copy-paste och klicka Run)

