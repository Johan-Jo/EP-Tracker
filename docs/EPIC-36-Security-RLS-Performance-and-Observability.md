# EPIC 36: Säkerhet, RLS, Prestanda & Observability (tvärgående)

## Context/Goal
Härda säkerhet och prestanda för nya moduler med RLS, engångstoken, mätning och spårbarhet.

## Scope
- Härda RLS per kund+projekt för nya tabeller/vyer.
- Engångstoken-hantering och rotation för Kontroll-QR (TTL 30 min).
- Mätning: kontrollvy LCP < 2.5s, serverlatens p95; structured logging med request-ID; slow-span tracing DB/API.

## Security & RLS
- RLS policy-uppsättning för `attendance_session`, `correction_log`, `payroll_basis`, `invoice_basis`.
- Token-rotation, begränsade scopes i Kontroll-QR.

## Acceptance
- A1 uppfyllt under last (500 rader < 2 s).
- Dashboard visar p95-latens och DB-query p95.

## Dependencies & Milestone
- Tvärgående; gäller M1–M5.
