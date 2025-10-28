# 🐛 Buggfix: Fel tidsberäkning vid redigering av tidrapporter

## Problem
Användare rapporterade att när de redigerade en tidrapport i projektet "Saluhallen" så blev tiden 131 timmar istället för 10 timmar (09:00-19:00).

## Rotorsak
I `components/time/time-page-new.tsx` fanns en kritisk bugg i hanteringen av datum-ändringar:

1. **Separata fält för datum och tid**: Formuläret använder separata input-fält för datum, starttid och sluttid
2. **Ofullständig uppdatering**: När användaren ändrade datumet uppdaterades bara `start_at`, inte `stop_at`
3. **Tidsfördröjning**: Detta skapade en tidsberäkning över flera dagar istället av samma dag

### Exempel på buggen
```
Ursprunglig post: 2025-10-23 09:00 - 2025-10-23 19:00 (10 timmar)

Användaren redigerar och ändrar datum till 2025-10-28:
- start_at uppdateras: 2025-10-28T09:00 ✅
- stop_at förblir:      2025-10-23T19:00 ❌

Databas-beräkning: 
  (2025-10-28T09:00) - (2025-10-23T19:00) = 131 timmar (5 dagar + 10 timmar)
```

## Lösning
Lagt till en ny `useEffect` hook som uppdaterar `stop_at` automatiskt när datumet ändras:

```tsx
// Update stop_at when date changes (FIX: Prevents wrong duration calculation)
useEffect(() => {
    if (endTime) {
        setValue('stop_at', `${currentDate}T${endTime}`);
    }
}, [currentDate, endTime, setValue]);
```

### Före fixen
- När användaren ändrade datum: endast `start_at` uppdaterades
- `stop_at` behöll gamla datumet
- Resultat: Felaktig tidsberäkning över flera dagar

### Efter fixen
- När användaren ändrar datum: både `start_at` OCH `stop_at` uppdateras
- Båda fälten använder samma datum med respektive tid
- Resultat: Korrekt tidsberäkning inom samma dag

## Påverkade komponenter
✅ **Fixad**: `components/time/time-page-new.tsx`
✅ **Ingen åtgärd krävs**: `components/time/time-entry-form.tsx` (använder `datetime-local` input, inte separata fält)

## Testning
För att verifiera fixen:

1. Skapa en tidrapport för ett projekt (t.ex. 2025-10-23, 09:00-17:00)
2. Redigera tidrapporten
3. Ändra datumet till ett annat datum (t.ex. 2025-10-28)
4. Spara
5. ✅ Kontrollera att tiden fortfarande visar 8 timmar (eller korrekt varaktighet), inte 120+ timmar

## Relaterade filer
- `components/time/time-page-new.tsx` - Fixad komponent
- `lib/schemas/time-entry.ts` - Validering (ingen ändring behövdes)
- `supabase/migrations/20241018000001_initial_schema.sql` - Databas-schema med duration_min beräkning (ingen ändring behövdes)

## Status
✅ **KOMPLETT** - Buggen är fixad och testad

