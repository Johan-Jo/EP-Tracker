# Praktisk Cron Test - Full Workflow

Detta är en enkel guide för att testa att cron-jobben faktiskt fungerar från början till slut.

## Problem

Cron-jobben har aldrig fungerat - inga notifikationer har kommit fram trots att de är schemalagda.

## Lösning: Testa med Arbetsdagsschema

Vi testar "Forgotten Checkout Alerts" eftersom den använder arbetsdagsschemat och är lätt att testa.

## Steg-för-Steg Test

### Steg 1: Sätt upp Test-Scenario (5 min)

1. **Checka in användaren:**
   - Logga in som `oi@johan.com.br`
   - Gå till Time-sidan
   - Checka in på projektet **"Fast och Löpande"**
   - **VIKTIGT:** Checka INTE ut (lämna entry aktiv)

2. **Konfigurera projekt-alerts:**
   - Gå till projektet "Fast och Löpande"
   - Gå till Alert-inställningar (eller `/dashboard/projects/[id]/alerts`)
   - Sätt:
     - `work_day_end: 16:00` (eller vilken tid du vill testa)
     - `forgotten_checkout_enabled: true` ✅
     - `forgotten_checkout_minutes_after: 30`

### Steg 2: Beräkna Cron-Tidpunkt

Cron-jobbet körs var 15:e minut och kollar om nuvarande tid är `work_day_end + minutes_after`.

**Exempel:**
- `work_day_end: 16:00` (svensk tid)
- `forgotten_checkout_minutes_after: 30`
- Alert-tid: 16:30 svensk tid

**Konvertera till UTC:**
- Vinter (UTC+1): 16:30 svensk = 15:30 UTC
- Sommar (UTC+2): 16:30 svensk = 14:30 UTC

**Sätt cron till:** `'30 15 * * *'` (15:30 UTC) eller `'30 14 * * *'` (14:30 UTC)

### Steg 3: Uppdatera Workflow

1. Öppna `.github/workflows/test-cron-trigger.yml`
2. Hitta raden med `cron:` (rad 12)
3. Ändra till beräknad tid:
   ```yaml
   - cron: '30 15 * * *'  # 15:30 UTC = 16:30 svensk tid (vinter)
   ```

### Steg 4: Commit och Push

```bash
git add .github/workflows/test-cron-trigger.yml
git commit -m "test: Schedule forgotten checkout test"
git push origin main
```

### Steg 5: Vänta och Verifiera

1. **Vänta till den schemalagda tiden**
2. **Gå till GitHub → Actions tab**
3. **Kontrollera att workflow:en kördes:**
   - ✅ Workflow startade vid rätt tid
   - ✅ HTTP Status: 200
   - ✅ Response visar `sent: 1` (eller fler)

4. **Kontrollera notifikation:**
   - 📧 **Email:** Logga in som admin/foreman och kolla inbox
   - 📱 **Push:** Om push är aktiverat, kontrollera notifikationer
   - 📊 **Database:** Gå till Supabase → `notification_log` tabell

## Snabbare Test: Använd Manuell Trigger

Om du inte vill vänta på schemalagd tid:

1. Gå till GitHub → **Actions** → **Test Cron Trigger**
2. Klicka **"Run workflow"**
3. Välj **"forgotten-checkout-alerts"**
4. Klicka **"Run workflow"**
5. Workflow:en körs omedelbart

**OBS:** Detta testar att cron-endpointet fungerar, men inte att GitHub Actions faktiskt triggar vid schemalagd tid.

## Vad Testet Verifierar

✅ GitHub Actions kör workflow:en vid rätt tid  
✅ Cron-endpointet anropas med korrekt CRON_SECRET  
✅ Projekt med `forgotten_checkout_enabled: true` hittas  
✅ Tiden matchar `work_day_end + minutes_after`  
✅ Användare med aktiva time entries hittas  
✅ Notifikationer skickas till admin/foreman  
✅ Email/push-notifikationer kommer fram  

## Troubleshooting

### "No active entries found"
- Kontrollera att användaren faktiskt är incheckad (aktiv time_entry)
- Verifiera att `stop_at` är `null` i databasen

### "No projects found" eller "sent: 0"
- Kontrollera att projektet har `forgotten_checkout_enabled: true`
- Verifiera att `work_day_end` + `minutes_after` matchar cron-tiden
- Kontrollera att tiden är inom 15-minuters fönstret (cron körs var 15:e minut)

### 401 Unauthorized
- Kontrollera att `CRON_SECRET` är korrekt i GitHub Secrets
- Verifiera att secret:en matchar värdet i appen

### Inga notifikationer skickas
- Kontrollera att admin/foreman har aktiverat notifikationer
- Verifiera delivery method (email/push/both)
- Kontrollera `notification_log` för felmeddelanden

