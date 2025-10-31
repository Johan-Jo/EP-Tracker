# EPIC 31: Worksite-aktivering, platsdata och Kontrollvy (M1)

## Context/Goal
Aktivera personalliggare per projekt utan separat register. Lagra platsdata i `project`, möjliggör plats- och kontroll-QR samt en snabb Kontrollvy med export.

## Scope
- Utöka `project` med platsfält, `worksite_enabled`, `worksite_code`, `timezone`, `control_qr_token`, `retention_years`.
- Generera Plats-QR (valfritt) och Kontroll-QR (engångstoken, TTL 30 min).
- Kontrollvy (read-only): Nu, Idag, Period; filter/sök person/företag; export PDF/CSV inkl. sha256-hash.

## Data model & Migrations
- Alter `project`:
  - `worksite_enabled boolean`, `worksite_code text`
  - `address_line1 text`, `address_line2 text`, `postal_code text`, `city text`, `country text`
  - `building_id text`, `timezone text`, `control_qr_token text`, `retention_years int`
- Index
  - `time_event (project_id, ts)`

## API
- GET `/worksites/:projectId/active`
- GET `/worksites/:projectId/sessions?from&to` (read-only initialt; kan temporärt baseras på events tills sessions finns)

## UI
- Projekt > Platsdata: fält enligt ovan, switch Aktivera personalliggare, knappar Plats-QR/Kontroll-QR, statusbrickor.
- Kontrollvy: flikar Nu/Idag/Period; kolumner Namn, Företag, In, Ut, Källa; Export PDF/CSV; Visa hash.

## Security & RLS
- Engångstoken för Kontroll-QR, TTL 30 min, begränsad vy.
- RLS per kund + projekt.

## Acceptance
- A1: Kontrollvy laddar < 2 s för 500 rader.
- A2: Export inkluderar hash, period, projekt-ID och adress.

## Dependencies & Milestone
- Del av M1.
