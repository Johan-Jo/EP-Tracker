# Update Gross Salary Script

Detta script uppdaterar `gross_salary_sek` för befintliga `payroll_basis` poster som saknar detta värde.

## Förutsättningar

1. **Kör migrationen först:** 
   - Kör `supabase/migrations/20250131000004_add_gross_salary.sql` i Supabase SQL Editor
   - Detta skapar kolumnen `gross_salary_sek` i `payroll_basis` tabellen

2. **Kontrollera att faktisk lön är angiven:**
   - Gå till `/dashboard/payroll` → fliken "Löneregler"
   - Kontrollera att alla anställda har "Faktisk lön" (`salary_per_hour_sek`) angivet

3. **Kontrollera att löneregler är konfigurerade:**
   - Gå till `/dashboard/payroll` → fliken "Löneregler"
   - Kontrollera att övertidsmultiplikator och OB-tillägg är satta om de behövs

## Välj script att köra

### Alternativ 1: SQL Script (Rekommenderat - Snabbast)

**Fil:** `scripts/update-gross-salary.sql`

**Steg:**
1. Öppna Supabase Dashboard → SQL Editor
2. Kopiera innehållet från `scripts/update-gross-salary.sql`
3. Kör scriptet
4. Kontrollera NOTICE-meddelanden i resultatet för att se vilka poster som uppdaterades

**Fördelar:**
- Snabbast att köra
- Körs direkt i databasen
- Inga ytterligare dependencies

**Nackdelar:**
- SQL kan vara lite mer komplext att felsöka

### Alternativ 2: JavaScript Script (Lättare att felsöka)

**Fil:** `scripts/update-gross-salary.js`

**Steg:**
1. Kontrollera att du har `.env.local` med rätt värden:
   ```
   NEXT_PUBLIC_SUPABASE_URL=din_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=din_service_role_key
   ```

2. Kör scriptet:
   ```bash
   node scripts/update-gross-salary.js
   ```

3. Följ utdata för att se vad som uppdaterades

**Fördelar:**
- Detaljerad output och logging
- Lättare att felsöka
- Kan stoppas och återupptas

**Nackdelar:**
- Kräver Node.js och dependencies
- Långsammare än SQL script

## Vad scriptet gör

Scriptet:

1. **Hittar alla `payroll_basis` poster** där `gross_salary_sek` är NULL eller 0

2. **För varje post:**
   - Hämtar personens `salary_per_hour_sek` från `memberships` tabellen
   - Hämtar organisationens löneregler (`payroll_rules`)
   - Beräknar bruttolön enligt formeln:
     ```
     Bruttolön = (Normaltid × Timlön) 
                + (Övertid × Timlön × Övertidsmultiplikator)
                + (OB-timmar × Timlön × OB-tillägg)
     ```
   - Uppdaterar `gross_salary_sek` i posten

3. **Hopper över poster** där:
   - Ingen `salary_per_hour_sek` är angiven för personen
   - Beräknad bruttolön är 0 eller mindre

## Efter körning

Efter att scriptet har körts:

1. **Uppdatera sidan** i webbläsaren
2. **Gå till `/dashboard/payroll`**
3. Bruttolön ska nu visas för alla poster där lön är angiven

Om bruttolön fortfarande visas som "Ej angiven":
- Kontrollera att personen har `salary_per_hour_sek` angivet i "Löneregler"
- Kontrollera att löneunderlag har beräknats (klicka "Beräkna om" om behövs)

## Felsökning

### "No salary_per_hour_sek set"
- Gå till `/dashboard/payroll` → "Löneregler"
- Ange "Faktisk lön" för anställda som saknar det
- Kör scriptet igen

### "Calculated gross salary is 0"
- Kontrollera att personen har faktiska timmar (normaltid, övertid, eller OB-timmar)
- Kontrollera att löneunderlag är korrekt beräknat

### Scriptet körs men inget händer
- Kontrollera att det finns `payroll_basis` poster som saknar `gross_salary_sek`
- Kör denna query i SQL Editor för att kontrollera:
  ```sql
  SELECT COUNT(*) 
  FROM payroll_basis 
  WHERE gross_salary_sek IS NULL OR gross_salary_sek = 0;
  ```

