# Hur man testar Cron-jobb

## Metod 1: Manuellt trigga GitHub Actions (Rekommenderat)

1. Gå till GitHub → ditt repo → **Actions**
2. Välj **"Cron Jobs"** workflow
3. Klicka på **"Run workflow"** (höger uppe)
4. Välj branch (t.ex. `main`)
5. Klicka på **"Run workflow"**
6. Vänta på att jobbet körs (tar ~30 sekunder)
7. Klicka på jobbet för att se logs
8. Leta efter **"Trigger Forgotten Check-out Alerts"** steget
9. Kolla **HTTP Status** och **Response** body

**Fördelar:**
- Testar den faktiska cron-workflowen
- Ser exakt vad som händer i produktion
- Inga tidsfönster att vänta på

## Metod 2: Force Test Endpoint (Ignorerar tidsfönster)

1. Gå till `/dashboard/test/reminders`
2. Välj användare och projekt (valfritt för force-test)
3. Klicka på **"Testa ALLA aktiva (ignorerar tidsfönster)"**
4. Detta testar alla aktiva time entries oavsett tidpunkt

**Fördelar:**
- Fungerar omedelbart
- Ignorerar tidsfönster
- Perfekt för att testa logiken

## Metod 3: Vänta på automatisk körning

GitHub Actions kör cron-jobb var 15:e minut.

För forgotten checkout alerts måste:
- Tiden vara `work_day_end + forgotten_checkout_minutes_after` (t.ex. 22:20 + 30 min = 22:50)
- Inom 30 minuters fönster (t.ex. 22:50 - 23:20)
- Det finns aktiva time entries

**Nackdelar:**
- Måste vänta på rätt tidpunkt
- Kan missa fönstret om cron körs vid fel tid

## Metod 4: Lokalt testa med curl

```bash
# Sätt CRON_SECRET i .env.local först
curl -X GET "http://localhost:3000/api/cron/forgotten-checkout-alerts" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Vad ska man leta efter i logs?

### GitHub Actions logs:
- ✅ `HTTP Status: 200` = Jobbet kördes
- ✅ `Response: {"sent": 1, ...}` = Alerts skickades
- ❌ `HTTP Status: 401` = CRON_SECRET fel
- ❌ `HTTP Status: 500` = Serverfel

### Vercel logs:
- `[Forgotten Checkout Alerts Cron] ===== CRON JOB TRIGGERED =====`
- `[Forgotten Checkout Alerts Cron] Found X projects`
- `[Forgotten Checkout Alerts Cron] Alerts sent: X`

### Supabase:
- Kör SQL-frågan `check-forgotten-checkout-alerts.sql` för att se om notifikationer loggades

## Troubleshooting

**Inga alerts skickas:**
- Kolla om det finns aktiva time entries (kör `check-active-time-entries.sql`)
- Kolla om `forgotten_checkout_enabled: true` i projektets `alert_settings`
- Kolla om tiden matchar (work_day_end + minutes_after)

**401 Unauthorized:**
- Kolla att `CRON_SECRET` är satt i GitHub Secrets
- Kolla att secret matchar i `.env.local` (för lokalt test)

**500 Error:**
- Kolla Vercel logs för detaljerad felinformation
- Kolla Supabase logs för databasfel

