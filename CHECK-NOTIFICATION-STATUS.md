# 🔍 Debug Checklist: Notiser fungerar inte

## Symptom
- ✅ Appen säger "Notiser är aktiverade"
- ✅ Test-notis säger "skickad"
- ❌ Ingen notis visas (varken iPhone eller Desktop Chrome)

## Detta betyder
**Problemet är på server-sidan**, inte klient-sidan.

## Möjliga orsaker

### 1. Firebase Admin SDK inte initialiserad
**Kolla:** Vercel Environment Variables
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

**Loggar att leta efter:**
```
❌ Firebase Admin SDK not initialized
```

### 2. FCM Token inte sparad i databasen
**Kolla:** Supabase `push_subscriptions` tabell
```sql
SELECT * FROM push_subscriptions 
WHERE user_id = '[oi@johan.com.br user ID]'
ORDER BY created_at DESC;
```

**Ska visa:**
- `fcm_token`: En lång string (t.ex. `eQDK3VOEKMd...`)
- `created_at`: När notiser aktiverades

**Loggar att leta efter:**
```
❌ No FCM tokens found for user
```

### 3. Firebase skickar men fel i FCM token
**Kolla:** Vercel logs
```
✅ Sent notification to 1/1 devices
```

Om du ser detta MEN ingen notis kommer:
- FCM token kan vara ogiltig (t.ex. från gammal session)
- Firebase projekt-config kan vara fel

### 4. Quiet hours aktiverat
**Kolla:** `notification_preferences` tabell
```sql
SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end
FROM notification_preferences
WHERE user_id = '[oi@johan.com.br user ID]';
```

**Loggar att leta efter:**
```
🔇 In quiet hours, skipping notification
```

## Debug Plan

### Steg A: Kolla Vercel Logs (BÖRJA HÄR)
1. Gå till Vercel Dashboard → EP-Tracker → Logs
2. Skicka test-notis från appen
3. Vänta 5 sek
4. Uppdatera logs
5. **Ta skärmbild av logs**

### Steg B: Kolla Supabase Database
1. Gå till Supabase Dashboard
2. Table Editor → `push_subscriptions`
3. Filtrera på din user_id
4. **Finns din FCM token där?**

### Steg C: Kolla Firebase Console
1. Gå till Firebase Console
2. Cloud Messaging
3. Kolla om meddelanden skickas (analytics/logs)

## Snabbtest från terminalen

Om användaren har tillgång till terminal:

```bash
# Kolla Vercel logs real-time
vercel logs --follow

# I en annan terminal, skicka test-notis via curl
curl -X POST https://eptracker.app/api/notifications/test \
  -H "Cookie: [din session cookie]" \
  -v
```

## Vanligaste problemet

**FCM token inte registrerad korrekt:**
- Service Worker registrerades
- Men `getFCMToken()` misslyckades tyst
- Token sparades aldrig i Supabase

**Lösning:**
1. Avaktivera notiser i appen
2. Stäng appen helt
3. Öppna igen
4. Aktivera notiser igen
5. Kolla browser console för `FCM Token: ...`
6. Kolla Supabase om token sparades

