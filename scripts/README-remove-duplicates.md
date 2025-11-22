# Ta bort dubbletter av projekt

Detta script hjälper dig att identifiera och ta bort dubbletter av projekt i databasen.

## Steg 1: Identifiera dubbletter

Kör först `find-duplicate-projects.sql` i Supabase SQL Editor för att se vilka dubbletter som finns:

```sql
-- Kör scripts/find-duplicate-projects.sql
```

Detta visar:
- Alla projekt som har dubbletter (samma namn och org_id)
- Antal dubbletter per projekt
- Vilket projekt som kommer behållas (det äldsta)
- Vilka projekt som kommer tas bort

## Steg 2: Ta bort dubbletter

När du har verifierat vilka dubbletter som finns, kör `remove-duplicate-projects.sql`:

```sql
-- Kör scripts/remove-duplicate-projects.sql
```

Detta script kommer:
1. Behålla det äldsta projektet (baserat på `created_at`)
2. Migrera all relaterad data från dubbletter till det behållna projektet:
   - phases
   - work_orders
   - time_entries
   - materials
   - expenses
   - mileage
   - travel_time
   - ata
   - diary_entries (hanterar konflikter automatiskt)
   - checklists
   - assignments
   - project_members (hanterar konflikter automatiskt)
3. Ta bort de duplicerade projekten

## Steg 3: Verifiera

Efter körning kommer scriptet automatiskt visa om det finns kvar några dubbletter. Om inga rader returneras, är alla dubbletter borttagna.

## Viktigt

- **Backup**: Se till att ha en backup av databasen innan du kör scriptet
- **Testmiljö**: Överväg att testa scriptet i en testmiljö först
- **Konflikter**: Scriptet hanterar automatiskt konflikter för `diary_entries` (UNIQUE constraint) och `project_members`

## Felsökning

Om scriptet misslyckas:
1. Kontrollera att du har rätt behörigheter i Supabase
2. Se till att alla migrations har körts
3. Kontrollera loggarna i Supabase för detaljerade felmeddelanden



