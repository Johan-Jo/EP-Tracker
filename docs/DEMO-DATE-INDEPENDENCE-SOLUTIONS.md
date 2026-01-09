# Demo-data: Lösningar för datumoberoende data

## Problem

Demo-data skapas med absoluta datum (t.ex. "2025-01-15"). När man tittar på demot om några veckor kommer data att vara föråldrad:
- Dashboard stats visar "0" för "denna vecka" (data är från förra veckan)
- Kalendern visar inga assignments (de är i förra månaden)
- Activity feed är tom (data är äldre än 7 dagar)
- Personalliggare visar inga nya check-ins

## Lösningsförslag

### Alternativ 1: Date-Shifting Approach (REKOMMENDERAT) ⭐

**Koncept:** Lagra ett "seed date" när demo-data skapas, och justera alla datum dynamiskt baserat på skillnaden mellan seed date och nuvarande datum.

#### Implementering:

1. **Lägg till `demo_reference_date` i organizations-tabellen:**
```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS demo_reference_date TIMESTAMPTZ;

-- Sätt demo_reference_date när seed-data skapas
UPDATE organizations 
SET demo_reference_date = NOW() 
WHERE slug = 'demo';
```

2. **Skapa helper-funktion för att räkna ut date offset:**
```typescript
// lib/demo/date-shift.ts
export function getDateShiftForDemo(demoOrgId: string, referenceDate: Date | null): number {
  if (!referenceDate) return 0; // Ingen shift om ingen reference date
  
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays; // Antal dagar att shift:a framåt
}

export function shiftDateForDemo(date: Date, daysOffset: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + daysOffset);
  return shifted;
}
```

3. **Modifiera seed script att skapa data relativt från "anchor date":**
```typescript
// scripts/seed-demo-data.ts

// Skapa en "anchor date" (t.ex. starten av nuvarande vecka när seed körs)
const anchorDate = new Date();
anchorDate.setDate(anchorDate.getDate() - anchorDate.getDay()); // Start of week
anchorDate.setHours(0, 0, 0, 0);

// Spara detta som demo_reference_date
await supabase
  .from('organizations')
  .update({ demo_reference_date: anchorDate.toISOString() })
  .eq('slug', 'demo');

// Skapa ALL data relativt från anchorDate (inte new Date())
// T.ex. "idag" = anchorDate, "igår" = anchorDate - 1 dag, etc.
const today = new Date(anchorDate);
const yesterday = new Date(anchorDate);
yesterday.setDate(yesterday.getDate() - 1);

// Skapa time entries, assignments, etc. med dessa datum
```

4. **Justera datum i queries/API:er för demo-organisationen:**
```typescript
// lib/db/dashboard.ts

export async function getDashboardStats(userId: string, orgId: string, startDate?: Date) {
  const supabase = await createClient();
  
  // Kolla om det är demo-organisationen
  const { data: org } = await supabase
    .from('organizations')
    .select('demo_reference_date, slug')
    .eq('id', orgId)
    .single();
  
  let effectiveStartDate = startDate;
  
  // Om demo och har reference date, shift:a datum
  if (org?.slug === 'demo' && org.demo_reference_date) {
    const referenceDate = new Date(org.demo_reference_date);
    const now = new Date();
    const daysOffset = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (effectiveStartDate) {
      effectiveStartDate = new Date(effectiveStartDate);
      effectiveStartDate.setDate(effectiveStartDate.getDate() + daysOffset);
    }
  }
  
  // Använd effectiveStartDate i query...
  const { data } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: userId,
    p_org_id: orgId,
    p_start_date: effectiveStartDate?.toISOString() || null,
  });
  
  return data;
}
```

**Fördelar:**
- ✅ Data förblir alltid "aktuell" (relativt från nuvarande datum)
- ✅ Fungerar för alla sektioner (dashboard, kalender, activity feed)
- ✅ Minimal påverkan på icke-demo data
- ✅ Kan implementeras stegvis

**Nackdelar:**
- ⚠️ Kräver ändringar i flera queries/API:er
- ⚠️ Lite komplexare logik
- ⚠️ Måste hantera alla datum-fält konsekvent

---

### Alternativ 2: Database Functions med Date-Shifting

**Koncept:** Skapa PostgreSQL functions som automatiskt justerar datum för demo-organisationen.

#### Implementering:

```sql
-- Function som justerar datum för demo-organisationer
CREATE OR REPLACE FUNCTION get_effective_date_for_org(
  p_org_id uuid,
  p_date timestamptz
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_demo_reference_date timestamptz;
  v_days_offset integer;
BEGIN
  -- Hämta demo_reference_date för organisationen
  SELECT demo_reference_date INTO v_demo_reference_date
  FROM organizations
  WHERE id = p_org_id;
  
  -- Om ingen reference date, returnera datum oförändrat
  IF v_demo_reference_date IS NULL THEN
    RETURN p_date;
  END IF;
  
  -- Räkna ut antal dagar att shift:a
  v_days_offset := EXTRACT(DAY FROM (NOW() - v_demo_reference_date));
  
  -- Shift:a datumet
  RETURN p_date + (v_days_offset || ' days')::interval;
END;
$$;
```

**Användning i queries:**
```sql
-- I get_dashboard_stats function:
SELECT COUNT(*)
FROM time_entries
WHERE user_id = p_user_id
  AND get_effective_date_for_org(p_org_id, start_at) >= p_start_date;
```

**Fördelar:**
- ✅ Centraliserad logik i databasen
- ✅ Automatisk shift för alla queries
- ✅ Mindre kod i TypeScript/API:er

**Nackdelar:**
- ⚠️ Kräver ändringar i alla database functions
- ⚠️ Kan påverka prestanda (extra function call per row)
- ⚠️ Svårare att debugga

---

### Alternativ 3: Periodic Re-seeding (ENKLAST, MEN MINDRE OPTIMAL)

**Koncept:** Köra seed script regelbundet (t.ex. varje dag via cron job) för att "uppdatera" datum.

#### Implementering:

1. **Cron job som kör seed script dagligen:**
```typescript
// scripts/daily-demo-refresh.ts

// Rensa gammal data
await supabase.from('time_entries').delete().eq('org_id', demoOrgId);
await supabase.from('assignments').delete().eq('org_id', demoOrgId);
// etc...

// Kör seed script igen
await seedDemoData();
```

2. **Eller "soft update" - uppdatera bara datum:**
```sql
-- Uppdatera alla datum till att vara relativt från idag
UPDATE time_entries
SET start_at = start_at + (CURRENT_DATE - DATE(start_at))::interval,
    stop_at = CASE 
      WHEN stop_at IS NOT NULL THEN stop_at + (CURRENT_DATE - DATE(stop_at))::interval
      ELSE NULL
    END
WHERE org_id = (SELECT id FROM organizations WHERE slug = 'demo');

-- Upprepa för assignments, absences, etc.
```

**Fördelar:**
- ✅ Mycket enkel implementering
- ✅ Ingen logik i queries
- ✅ Fungerar direkt

**Nackdelar:**
- ❌ Data försvinner/recreeras dagligen (risk för race conditions)
- ❌ Användare kan se data försvinna
- ❌ Måste köra cron job
- ❌ Kan missa om cron job misslyckas

---

### Alternativ 4: Hybrid Approach (BEST PRACTICE) 🏆

**Kombinera Alternativ 1 + smarta database functions:**

1. **Använd date-shifting för "read" queries** (dashboard, kalender, activity feed)
2. **Använd periodisk refresh för "write" queries** (nya entries som användare skapar i demo mode ska fortfarande fungera)

#### Implementering:

- **Read operations:** Använd date-shifting (Alternativ 1)
- **Write operations:** Lägg till special handling i demo mode som automatiskt justerar datum vid insert/update
- **Periodic maintenance:** Köra en "soft refresh" varje natt som uppdaterar gamla entries (men behåller användar-genererade entries)

---

## Rekommendation: Alternativ 1 (Date-Shifting) med stegvis implementation

### Steg 1: Lägg till demo_reference_date i organizations
### Steg 2: Uppdatera seed script att spara reference date och skapa data relativt
### Steg 3: Skapa helper-functions för date-shifting
### Steg 4: Uppdatera dashboard queries att använda date-shifting
### Steg 5: Uppdatera planning/kalender queries
### Steg 6: Uppdatera activity feed queries
### Steg 7: Testa och verifiera att allt fungerar

### Prioritet för implementation:

1. **Dashboard stats** (högsta prioritet - användare ser detta först)
2. **Activity feed** (hög prioritet - viktig för att visa "liv")
3. **Kalender/Planning** (hög prioritet - central feature)
4. **Time entries** (medium prioritet)
5. **Personalliggare** (medium prioritet)
6. **Diary entries** (låg prioritet - mindre kritisk)

---

## Test-plan

Efter implementation, testa:

1. ✅ Dashboard visar aktuell vecka's stats (inte 0)
2. ✅ Activity feed har entries från senaste 7 dagarna
3. ✅ Kalendern visar assignments för nuvarande/kommande veckor
4. ✅ Time entries är "aktuella" (inte från förra månaden)
5. ✅ Personalliggare visar check-ins från senaste dagarna
6. ✅ Data förblir aktuell även om man väntar 1-2 veckor
7. ✅ Icke-demo organisations påverkas inte

---

## Frågor att besvara innan implementation:

1. **Hur ofta ska demo-data uppdateras?**
   - Kontinuerligt (date-shifting) = Alternativ 1
   - Dagligen (cron job) = Alternativ 3
   - Hybrid = Alternativ 4

2. **Ska användare kunna skapa data i demo mode?**
   - Ja → Behöver hantera write operations också
   - Nej → Bara read operations behöver date-shifting

3. **Hur långt bakåt ska aktiv data gå?**
   - 3 veckor? 1 månad? Detta påverkar hur vi skapar seed data

4. **Ska gamla data "försvinna" eller "åldras"?**
   - Försvinna = Periodisk re-seeding
   - Åldras = Date-shifting (gamla data blir äldre men finns kvar)

---

## Nästa steg

**Väntar på beslut från användare om vilket alternativ som ska implementeras.**

Rekommendation: **Alternativ 1 (Date-Shifting)** för bäst balans mellan funktionalitet och komplexitet.
