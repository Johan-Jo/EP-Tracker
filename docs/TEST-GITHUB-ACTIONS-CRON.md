# Testa GitHub Actions Cron Jobs

Detta dokument förklarar hur du testar att GitHub Actions faktiskt triggar cron-jobben vid schemalagda tidpunkter.

## Metod 1: Manuell Trigger (Snabbast)

1. Gå till GitHub repository → **Actions** tab
2. Välj workflow: **"Test Cron Trigger"**
3. Klicka på **"Run workflow"** (höger sida)
4. Välj vilken cron job du vill testa från dropdown
5. Klicka **"Run workflow"**
6. Workflow:en körs omedelbart och du kan se resultatet direkt

## Metod 2: Testa vid Specifik Tidpunkt

För att verifiera att GitHub Actions faktiskt triggar workflow:en vid en schemalagd tidpunkt:

### Steg 1: Beräkna UTC-tid

GitHub Actions använder UTC-tid. För att beräkna rätt tid:

```bash
# Se aktuell UTC-tid
date -u

# Exempel: Om det är 14:25 UTC och du vill testa om 5 minuter
# Sätt cron till: '30 14 * * *' (14:30 UTC)
```

### Steg 2: Uppdatera Test Workflow

1. Öppna `.github/workflows/test-cron-trigger.yml`
2. Hitta raden med `cron:` under `schedule:`
3. Ändra till en tidpunkt 2-5 minuter i framtiden (i UTC)
4. Exempel:
   ```yaml
   schedule:
     - cron: '30 14 * * *'  # Körs kl 14:30 UTC
   ```

### Steg 3: Commit och Push

```bash
git add .github/workflows/test-cron-trigger.yml
git commit -m "test: Schedule cron test for [specific time]"
git push origin main
```

### Steg 4: Vänta och Observera

1. Gå till GitHub → **Actions** tab
2. Vänta tills den schemalagda tiden
3. Workflow:en bör automatiskt starta vid den angivna tiden
4. Kontrollera att den kördes och att cron-jobbet faktiskt triggades

### Steg 5: Verifiera Resultat

I workflow-loggarna bör du se:
- ✅ "Check-out reminders triggered successfully!"
- HTTP Status: 200
- Response från API:et med antal skickade påminnelser

## Metod 3: Temporärt Ändra Huvudworkflow

Om du vill testa den faktiska produktionsworkflow:en:

1. Öppna `.github/workflows/cron-jobs.yml`
2. Ändra schemat temporärt:
   ```yaml
   schedule:
     - cron: '*/2 * * * *'  # Kör var 2:e minut (för test)
   ```
3. Commit och push
4. Observera i Actions tab att den körs var 2:e minut
5. **VIKTIGT:** Återställ till original efter test:
   ```yaml
   schedule:
     - cron: '*/15 * * * *'  # Tillbaka till var 15:e minut
   ```

## Viktiga Noteringar

### UTC vs Lokal Tid

- GitHub Actions använder **UTC-tid**
- Om du är i Sverige (UTC+1 vinter, UTC+2 sommar):
  - 16:45 svensk tid (vinter) = 15:45 UTC
  - 16:45 svensk tid (sommar) = 14:45 UTC

### Cron Syntax

```
minute hour day month weekday
  *     *    *   *     *
```

Exempel:
- `'*/15 * * * *'` - Var 15:e minut
- `'45 16 * * 1-5'` - 16:45 varje vardag (Mon-Fri)
- `'30 14 * * *'` - 14:30 varje dag

### Secrets som Krävs

Se till att följande secrets är konfigurerade i GitHub:
- `APP_URL` - Din app URL (t.ex. `https://your-app.vercel.app`)
- `CRON_SECRET` - Samma secret som i din `.env.local`

## Troubleshooting

### Workflow körs inte vid schemalagd tid

- Kontrollera att du använder UTC-tid
- GitHub Actions kan ha upp till 5 minuters fördröjning
- Kontrollera att workflow-filen är i `main` branch (eller default branch)

### 401 Unauthorized

- Kontrollera att `CRON_SECRET` är korrekt konfigurerad i GitHub Secrets
- Verifiera att secret:en matchar värdet i din app

### 404 Not Found

- Kontrollera att `APP_URL` är korrekt
- Verifiera att appen är deployad och tillgänglig

## Exempel: Testa Check-out Reminders

1. **Sätt tidpunkt 5 minuter framåt:**
   ```yaml
   schedule:
     - cron: '35 14 * * *'  # Om det är 14:30 UTC nu
   ```

2. **Commit och push:**
   ```bash
   git add .github/workflows/test-cron-trigger.yml
   git commit -m "test: Schedule checkout reminders test"
   git push
   ```

3. **Vänta 5 minuter och kolla Actions tab**

4. **Verifiera:**
   - Workflow kördes vid 14:35 UTC
   - Check-out reminders API anropades
   - Response visar antal skickade påminnelser

