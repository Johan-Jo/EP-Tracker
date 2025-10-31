# EPIC 32: Sessionsbyggare, Rättelser och Grundexport (M2)

## Context/Goal
Bygg en regelmotor som parar `time_event` in→out till `attendance_session`, hanterar auto-stängning och rättelser, samt exporterar periodunderlag.

## Scope
- Parningslogik in→out per person/projekt i tidsordning med toleranser.
- Auto-stängning vid dygnsbyte enligt regel och flagga.
- Skapa/uppdatera `attendance_session` inkl. `immutable_hash`, `corrected:boolean`.
- Rättelser via dialog (platsansvarig/superadmin), logga ändringar, uppdatera hash.
- Export (PDF/CSV) av kontrollperiod inkl. "Corrected: yes".

## Data model & Migrations
- Tabell `attendance_session`:
  - `id`, `person_id`, `company_id`, `project_id`
  - `check_in_ts`, `check_out_ts`, `source_first`, `source_last`
  - `device_first`, `device_last`, `immutable_hash`, `corrected boolean`
- Tabell `correction_log`:
  - `id`, `session_id`, `field`, `old_value`, `new_value`
  - `reason`, `changed_by`, `changed_at`
- Index
  - `attendance_session (project_id, check_in_ts)`
  - `attendance_session (person_id, check_in_ts)`

## Jobs/Schedulers
- `attendance-builder` (cron/queue): bygger/uppdaterar sessions, flaggar edge-fall.
- Notifiera platsansvarig vid auto-stängning (dygnsbyte).

## API
- GET `/worksites/:projectId/sessions?from&to`
- POST `/worksites/:projectId/sessions/:id/correct`

## Security & RLS
- RLS per kund + projekt på nya tabeller.
- Rättelser kräver roll: Platsansvarig eller Superadmin.

## Acceptance
- S1: Parning korrekt i ≥ 99 %, övriga flaggas.
- S2: Auto-stängning vid dygnsbyte; notis skickas.
- A3: Rättelser kräver reason och syns i export.

## Dependencies & Milestone
- Del av M2.
