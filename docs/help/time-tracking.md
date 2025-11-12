# Tidregistrering – Debitering & ÄTA

Senast uppdaterad: 11 november 2025

Den här guiden beskriver hur du registrerar tid med de nya debiteringsreglerna och hur ÄTA-poster fungerar som delprojekt som kan ta emot timmar.

## Överblick

- Varje projekt har ett debiteringsläge: Löpande, Fast eller Både.
- Timmar kan delas upp på faser, arbetsorder eller ÄTA (ändrings- och tilläggsarbeten).
- Fast debitering kräver antingen en fast post *eller* en ÄTA. Om projektet saknar fasta poster kan du hoppa direkt till ÄTA.
- Systemet minns senaste valet per projekt (lagras i webbläsarens localStorage).

## Snabbstart: Time Slider

1. Öppna `Dashboard` → sektionen **Aktiv tid**.
2. Välj projekt i dropdownen. Om projektet har både Löpande och Fast visas en select för debitering.
3. Välj **Fast** eller **Löpande**:
   - **Fast:** välj en fast post om projektet har sådana. Annars kan du välja ÄTA längre ned.
   - **Löpande:** ingen fast post behövs och ÄTA-fältet är frivilligt.
4. (Frivilligt) Välj ÄTA. Listan visar alla icke-avvisade ÄTA kopplade till projektet.
5. Dra reglaget hela vägen tills det låser för att starta tiden.
6. När du checkar ut sparas debiteringsvalet och eventuell ÄTA-koppling i posten.

> **Tips:** Om du ofta jobbar på samma ÄTA kan du snabbt starta om slider med samma projekt och bara välja ÄTA innan du drar.

## Manuell tidpost (Time → Ny registrering)

1. Gå till `Dashboard → Tid` och klicka **Ny registrering**.
2. Välj projekt. Formuläret uppdateras automatiskt med:
   - Debiteringsläge (Fast, Löpande, Både)
   - Tillgängliga fasta poster
   - Lista över ÄTA
3. Markera debitering:
   - **Fast**: välj antingen en fast post eller en ÄTA.
   - **Löpande**: ingen fast post krävs, ÄTA är frivillig.
4. Ange tider, beskrivning och eventuellt fas/arbetsorder som tidigare.
5. Spara posten. Valda ID:n normaliseras till strängar och skickas som `billing_type`, `fixed_block_id`, `ata_id`.

## Validering & backend

- **Zod-schemat** (`lib/schemas/time-entry.ts`) säkerställer att:
  - `billing_type` alltid sätts (Löpande som default).
  - Fast kräver `fixed_block_id` när projektet har block, annars krävs ÄTA.
  - `ata_id` är alltid valfri men normaliseras till `null` om inte vald.
- **API-rutter** (`POST /api/time/entries`, `PATCH /api/time/entries/[id]`) hanterar fältet `ata_id` och nollställer det automatiskt när debiteringen går tillbaka till Löpande.
- **Databasen** har kolumnen `ata_id` (UUID) på `time_entries` och ett index `idx_time_entries_ata_id` för fakturaunderlaget.

## Fakturaunderlag & rapportering

- Fast tid grupperas per `fixed_block_id` eller `ata_id` i fakturaunderlaget.
- ÄTA-listor och detaljer visar tydligt om en ÄTA har tilldelade fasta timmar.
- Rapportgeneratorer använder samma fält, ingen ytterligare konfiguration krävs.

## Felsökning

- **“Välj en fast post…”** visas endast när projektet har fasta poster men inget val gjorts. Välj antingen en fast post eller byta till Löpande.
- **ÄTA saknas i listan:** kontrollera att den inte är avvisad och att den tillhör samma projekt.
- **Slider-minnet verkar fel:** rensa localStorage-nyckeln `project-billing-pref:<projectId>` och ladda om sidan.

## Relaterade filer

- `components/core/time-slider.tsx`
- `components/time/time-entry-form.tsx`
- `app/api/time/entries/route.ts`
- `app/api/time/entries/[id]/route.ts`
- `lib/schemas/time-entry.ts`
- `supabase/migrations/202511110002_add_time_entry_ata_link.sql`
