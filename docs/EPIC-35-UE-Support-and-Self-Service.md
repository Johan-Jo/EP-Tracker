# EPIC 35: UE-stöd och self-service (M5, valfritt steg 2)

## Context/Goal
Säkerställ UE-stöd utan separat register genom policy för `company_id` och self-service för att fylla projektets företag/personlistor.

## Scope
- `company_id` krävs vid stämpling (egen/UE). Policy: blockera stämpling eller be om val.
- Projektägare kan lägga till UE-företag (org.nr, namn) och personer.
- Self-service-länk för UE-arbetsledare som sparar direkt i projektets company/person-listor.

## Data model & Migrations
- Återanvänd befintliga person/companies-strukturer; inga nya tabeller krav initialt.

## Security & RLS
- RLS per kund + projekt; self-service skrivning begränsas till tilldelat projekt.

## Acceptance
- Stämpling stoppas om person saknar företag när policy kräver.
- Self-service-flöde skapar korrekta relationer och uppfyller RLS.

## Dependencies & Milestone
- Del av M5 (valfritt steg 2).
