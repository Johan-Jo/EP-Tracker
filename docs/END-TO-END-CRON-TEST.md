# End-to-End Cron Test Guide

Detta dokument förklarar hur du testar att cron-jobben faktiskt fungerar från början till slut.

## Problem

Cron-jobben har aldrig fungerat - inga notifikationer har kommit fram trots att de är schemalagda.

## Test-Scenario: Forgotten Check-out Alert

Detta test simulerar det faktiska flödet:

1. **Sätt upp test-scenario:**
   - Användare `oi@johan.com.br` checkar in på projektet "Fast och Löpande"
   - Projektet har `work_day_end: 16:00` och `forgotten_checkout_enabled: true`
   - Användaren glömmer checka ut

2. **Sätt cron-tidpunkt:**
   - Sätt till 16:30 (30 minuter efter arbetsdagens slut)
   - Detta triggar "forgotten checkout alert"

3. **Verifiera:**
   - GitHub Actions kör workflow:en vid rätt tid
   - Cron-jobbet hittar användaren med aktiv entry
   - Notifikation skickas till admin/foreman

## Steg-för-steg Test

### Steg 1: Förbered Test-Scenario

1. **Checka in användaren:**
   - Logga in som `oi@johan.com.br`
   - Gå till Time-sidan
   - Checka in på projektet "Fast och Löpande"
   - **VIKTIGT:** Checka INTE ut (lämna entry aktiv)

2. **Konfigurera projekt-alerts:**
   - Gå till projektet "Fast och Löpande"
   - Gå till Alert-inställningar
   - Sätt:
     - `work_day_end: 16:00`
     - `forgotten_checkout_enabled: true`
     - `forgotten_checkout_minutes_after: 30`

### Steg 2: Sätt Cron-Tidpunkt

1. Öppna `.github/workflows/test-cron-trigger.yml`
2. Sätt cron till 16:30 UTC (eller 30 minuter efter `work_day_end` i UTC)
3. Exempel: Om `work_day_end` är 16:00 svensk tid (UTC+1 vinter) = 15:00 UTC
   - Sätt cron till: `'30 15 * * *'` (15:30 UTC = 16:30 svensk tid)

### Steg 3: Commit och Push

```bash
git add .github/workflows/test-cron-trigger.yml
git commit -m "test: End-to-end cron test for forgotten checkout"
git push origin main
```

### Steg 4: Vänta och Observera

1. Gå till GitHub → **Actions** tab
2. Vänta tills den schemalagda tiden
3. Workflow:en bör automatiskt starta
4. Kontrollera loggarna:
   - ✅ Workflow kördes vid rätt tid
   - ✅ Cron-endpoint anropades
   - ✅ Response visar att alerts skickades

### Steg 5: Verifiera Notifikation

1. **Kontrollera email:**
   - Logga in som admin/foreman
   - Kontrollera inbox för `oi@johan.com.br`
   - Du bör ha fått en "Glömt check-out" varning

2. **Kontrollera push-notifikationer:**
   - Om push är aktiverat, kontrollera att notifikationen kom

3. **Kontrollera notification_log:**
   - Gå till Supabase → notification_log tabell
   - Sök efter senaste entry för forgotten_checkout typ

## Test-Scenario: Check-in Reminders

För att testa check-in reminders:

1. **Sätt upp:**
   - Projekt med `work_day_start: 07:00`
   - `checkin_reminder_enabled: true`
   - `checkin_reminder_minutes_before: 15`

2. **Sätt cron-tid:**
   - 06:45 UTC (15 minuter före 07:00)

3. **Verifiera:**
   - Användare får påminnelse att checka in

## Troubleshooting

### Cron körs inte vid schemalagd tid

- Kontrollera att workflow-filen är i `main` branch
- GitHub Actions kan ha upp till 5 minuters fördröjning
- Verifiera UTC-tid (GitHub använder UTC)

### Cron körs men hittar inga användare

- Kontrollera att användaren faktiskt är incheckad (aktiv time_entry)
- Verifiera att projektet har rätt alert-inställningar
- Kontrollera att `work_day_end` + `minutes_after` matchar cron-tiden

### Cron körs men inga notifikationer skickas

- Kontrollera att användaren har aktiverat notifikationer
- Verifiera att delivery method är korrekt (email/push/both)
- Kontrollera notification_log för felmeddelanden

### 401 Unauthorized

- Kontrollera att `CRON_SECRET` är korrekt i GitHub Secrets
- Verifiera att secret:en matchar värdet i appen

