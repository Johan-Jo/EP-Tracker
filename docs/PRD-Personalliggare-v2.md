# PRD – Personalliggare v2 (återanvänder EP-Tracker check-in/out)

## 1) Scope & mål

Ingen separat registrering. Projekt utökas till att bära all platsdata som krävs för personalliggare.

Check-in/out återanvänds som liggarens sessions; vi tillför visnings-, rättelse- och exportlager.

Underlag i appen: Kompletta löne- och fakturaunderlag ska kunna granskas och låsas innan export.

---

## 2) Datamodell – tillägg (Projekt = Arbetsplats)

### project (befintlig, utöka)
- `worksite_enabled`: boolean (aktiverar liggare för projektet)
- `worksite_code`: text (internt/visnings-ID)
- `address_line1`, `address_line2`, `postal_code`, `city`, `country`
- `building_id`: text (Byggarbetsplats-ID, valfritt)
- `timezone`: text (default kundens TZ)
- `control_qr_token`: text (engångstoken för kontrollvy, roteras)
- `retention_years`: int (≥2)

### time_event (befintlig check-in/out, verifiera fält)
- `id`, `person_id`, `project_id`, `company_id` (egen/UE), `type` (in|out), `ts`, `source`, `device_id`, `geo_json`, `offline_flag`
- **Ny indexering**: `(project_id, ts)`, `(person_id, ts)`

### attendance_session (ny, härledd eller materialiserad)
- `id`, `person_id`, `company_id`, `project_id`, `check_in_ts`, `check_out_ts`, `source_first`, `source_last`, `device_first`, `device_last`, `immutable_hash`, `corrected:boolean`
- Skapas via regelmotor som parar ihop in/out.

### correction_log (ny)
- `id`, `session_id`, `field`, `old_value`, `new_value`, `reason`, `changed_by`, `changed_at`

### payroll_basis (ny materialiserad vy eller tabell)
Summerar per person/period: tidspass (från attendance), OB/rastregler, frånvaro.
- `id`, `person_id`, `period_start`, `period_end`, `hours_norm`, `hours_overtime`, `ob_hours`, `corrections_json`, `locked:boolean`, `locked_by`, `locked_at`

### invoice_basis (ny materialiserad vy eller tabell)
Per projekt/period: tid, material, utlägg, milersättning, ÄTA.
- `id`, `project_id`, `period_start`, `period_end`, `lines_json` (spec), `totals`, `locked:boolean`, `locked_by`, `locked_at`

---

## 3) Admin/Settings (kundnivå)

**Regler:**
- Minsta pass (t.ex. <7 min → flagga)
- Raster (auto-rast efter X timmar)
- OB/helg-tabell
- Hantering vid dygnsbyte (auto-stäng 23:59:59)
- UE-policy: kräver company_id (org.nr) före stämpling?

**Exportformat:**
- CSV (lön)
- SIE/CSV (faktura)
- PDF (liggareperiod, kontrollista)

**Retention:** standard 2 år (justerbart per projekt).

---

## 4) Flöden

### 4.1 Projekt—platsdata (utan separat registrering)
- Skapa/Redigera projekt: fält för adress, bygg-ID, TZ, på/av `worksite_enabled`.
- Generera: Plats-QR (frivillig), Kontroll-QR (öppnar kontrollvy).
- Validering: adressfält krävs om `worksite_enabled=true`.

### 4.2 In/ut (befintlig)
- Befintliga `time_event` används; offline kö/synk oförändrad.

### 4.3 Sessionsbyggare (regelmotor)
- Parar in → out per person/projekt i tidsordning.
- Edge: ny in utan out → auto-stäng vid regel (dygnsbyte) + flagga.
- Skriver/uppdaterar `attendance_session`; uppdaterar `immutable_hash`.

### 4.4 Kontrollvy (på plats)
- Öppnas via Kontroll-QR (engångstoken, giltig 30 min).
- Nu inloggade, Idag, Valfri period; sök/filter på person/företag.
- Export PDF/CSV för vald period inkl. sha256_hash + skapad tid.

### 4.5 Rättelser
- Roll: Platsansvarig eller Superadmin.
- Tillåt ändra check_in_ts/check_out_ts (inte ta bort), kräver reason.
- Logga till `correction_log`, sätt `attendance_session.corrected=true`, ny `immutable_hash`.
- Visa diff i UI och på export.

### 4.6 Löneunderlag (förhandsgranska innan export)
- Vy per person/period: listade pass (från attendance), regler tillämpade (rast/OB).
- Admin kan låsa `payroll_basis` ("Klar för export").
- Exporter: CSV för Visma/Lön, PDF sammanställning.

### 4.7 Fakturaunderlag (förhandsgranska innan export)
- Vy per projekt/period: tidrader (prislista), material, utlägg, milersättning, ÄTA.
- Redigerbara beskrivningsrader och etiketter; visa bilagor (foton/kv).
- Lås `invoice_basis`; exportera SIE/CSV + PDF.

---

## 5) UI – kärnskärmar

### Projekt > Platsdata
- Fält enligt ovan, switch Aktivera personalliggare, knappar: Plats-QR, Kontroll-QR.
- Statusbrickor: Worksite aktiv, TZ, Retention.

### Kontrollvy
- Flikar: Nu, Idag, Period.
- Kolumner: Namn, Företag (org.nr), In-tid, Ut-tid (om checkad ut), Källa.
- Knappar: Skriv ut PDF, Exportera CSV, Visa hash.

### Rättelsedialog
- Fält: Ny tid, Orsak (obligatorisk), ev. bilaga/anteckning.
- Banner: "Alla rättelser loggas och kan granskas".

### Löneunderlag
- Datumintervall, lista per person → timmar norm/OB/övertid, rättelser.
- Status: Utkast / Låst. Exportknappar.

### Fakturaunderlag
- Datumintervall, projekt → radrubriker: Tid/Material/Utlägg/Mil/ÄTA.
- Summeringar, moms, etiketter. Utkast / Låst. Exportknappar.

---

## 6) Regler & acceptans

### Liggare (efterlevnad)
- **A1:** Kontrollvy laddar <2 s för 500 poster.
- **A2:** Export PDF/CSV inkluderar hash, period, projekt-ID, adress.
- **A3:** Rättelser kräver reason och syns i export ("Corrected: yes").

### Sessions
- **S1:** Parning in/out korrekt i ≥ 99 % av fall (resterande flaggas).
- **S2:** Auto-stängning vid dygnsbyte; notis till platsansvarig.

### Payroll
- **P1:** Avvikelse mellan sum tid (sessions) och lönesummering <1 %.
- **P2:** Låsning krävs innan export; upplåsning endast av Superadmin.

### Invoice
- **I1:** Alla radtyper ingår; bilagor klickbara.
- **I2:** Låsning krävs innan export.

---

## 7) Tekniskt – implementation (kort)

### Migrations
- Alter `project` med platsfält + tokens.
- Skapa `attendance_session`, `correction_log`, `payroll_basis`, `invoice_basis`.

### Jobs
- `attendance-builder` (cron/queue): bygger/uppdaterar sessions.
- `basis-refresh` vid lås/upplås och vid ändringar.

### API
- `GET /worksites/:projectId/active`
- `GET /worksites/:projectId/sessions?from&to`
- `POST /worksites/:projectId/sessions/:id/correct`
- `POST /payroll/basis/lock`, `POST /invoice/basis/lock`
- `POST /exports/payroll`, `POST /exports/invoice`, `POST /exports/ledger`

### Säkerhet
- RLS per kund + projekt.
- Engångstoken för Kontroll-QR, TTL 30 min.
- Idempotens på check-events redan befintlig (behåll).

---

## 8) UE-stöd (utan separat register)

- `company_id` krävs vid stämpling (egen/UE).
- UE-inmatning: på projektet kan platsansvarig lägga till UE-företag (org.nr, namn) och personer eller låta UE-arbetsledare fylla i via delad länk som sparar direkt i projektets company/person-listor.
- Om person saknar företag → blockera stämpling eller be om val (konfig).

---

## 9) Testplan (sammandrag)

- **Enhet:** parningslogik, rättelser, låsning/olåsning.
- **Offline:** kö → synk → sessions; klockdrift ±300s.
- **UAT:** 10 användare, 2 UE-företag, 1 vecka; kontrollsimulering varje dag.
- **Prestanda:** 5 000 stämplingar/h; kontrollvy 500 rader <2 s.

---

## 10) Leveransordning

- **M1:** Projekt-platsfält + Kontroll-QR + Kontrollvy (read-only)
- **M2:** Sessionsbyggare + Rättelser + Export (PDF/CSV)
- **M3:** Löneunderlag (vy, låsning, CSV/PDF)
- **M4:** Fakturaunderlag (vy, låsning, SIE/CSV/PDF)
- **M5:** UE-self-service via delad länk (valfritt steg 2)

---

## 11) ID06-scanner för telefon (tillägg)

### Möjlighet
**Android:** NFC-läsning av ID06-kort (UID) möjlig direkt. Läs UID → lookup person/företag → check-in/out.

**iOS:** Begränsat NFC-stöd för DESFire-kort. Fallback via QR/PIN/BankID.

### Arkitektur
- **card_uid_hash**, **person_id**, **company_id**, **valid_to**, **status** i databas.
- **Android:** NFC → UID → lookup → check-in/out
- **iOS:** QR/BankID/PIN → lookup → check-in/out
- **Validering:** Kontrollera kortstatus mot ID06-tjänst eller manuell lista.
- **UE:** Arbetsledare kan ladda upp kortlista till projekt.

### Implementation
- **MVP (4-6 veckor):** Android NFC + iOS fallback (QR/PIN).
- **Nivå 2:** Kortstatus-kontroll, iOS BT-NFC-läsare.
- **Nivå 3:** DESFire-autentisering via SDK/partner.

### Efterlevnad
- Logga rättelser med orsak.
- Spara data ≥2 år.
- Visa kontrollista on-site.

---

**Last Updated:** 2025-11-02  
**Status:** Draft PRD for implementation planning

