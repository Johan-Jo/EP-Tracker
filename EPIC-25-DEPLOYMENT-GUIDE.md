# EPIC 25: Web Push Notifications - Deployment Guide

Detta dokument beskriver hur du deployar och konfigurerar Web Push Notifications i produktion.

## 📋 Översikt

EPIC 25 implementerar Web Push Notifications via Firebase Cloud Messaging (FCM) med stöd för:
- ✅ iOS 16.4+ (PWA)
- ✅ Android (alla moderna webbläsare)
- ✅ Desktop (Chrome, Firefox, Edge, Safari 16+)

## 🔧 Förkunskaper

Du behöver:
1. Firebase-projekt
2. Firebase Admin SDK private key
3. Firebase Web config (vapidKey)
4. Supabase-åtkomst för att köra migration
5. Vercel-åtkomst för environment variables och cron jobs

## 📦 Vad har implementerats

### Backend
- ✅ Firebase Admin SDK integration (`lib/notifications/firebase-admin.ts`)
- ✅ Notification service med quiet hours & preferences (`lib/notifications/send-notification.ts`)
- ✅ Type-specific notification helpers (check-out, team, approval)
- ✅ API routes för subscribe, unsubscribe, preferences, test, history
- ✅ Database migration för push_subscriptions, notification_preferences, notification_log
- ✅ Project alert_settings column i projects table
- ✅ Cron jobs för check-out reminders och weekly approval summaries
- ✅ Integration i time entries API (team notifications)
- ✅ Integration i approvals API (approval confirmed notifications)

### Frontend
- ✅ Service Worker (`public/sw.js`)
- ✅ Firebase Messaging SW (`public/firebase-messaging-sw.js`)
- ✅ React hooks för permission & preferences
- ✅ Notification settings UI (enable banner, toggles, quiet hours)
- ✅ Settings page (`/dashboard/settings/notifications`)
- ✅ History page (`/dashboard/settings/notifications/history`)
- ✅ Project alert settings UI & page (`/dashboard/projects/[id]/alerts`)
- ✅ Interactive tour för notifications
- ✅ Hjälpdokumentation (`docs/help/notifications.md`)

## 🚀 Deployment Steg-för-Steg

### Steg 1: Firebase Setup

#### 1.1 Skapa Firebase-projekt
1. Gå till https://console.firebase.google.com/
2. Skapa nytt projekt eller använd befintligt
3. Aktivera **Cloud Messaging**

#### 1.2 Skapa Web App
1. I Firebase Console, gå till Project Settings
2. Klicka "Add app" → Web (</>) icon
3. Registrera appen med namn "EP-Tracker Web"
4. **Anteckna** `firebaseConfig` objektet (behöver `apiKey`, `authDomain`, etc.)

#### 1.3 Generera VAPID Key
1. I Firebase Console → Project Settings → Cloud Messaging
2. Under "Web configuration" → "Web Push certificates"
3. Klicka "Generate key pair"
4. **Anteckna** VAPID key (börjar med "B...")

#### 1.4 Skapa Service Account (Server)
1. I Firebase Console → Project Settings → Service Accounts
2. Klicka "Generate new private key"
3. Ladda ner JSON-filen
4. **VIKTIGT:** Spara denna fil säkert, dela ALDRIG den publikt

### Steg 2: Supabase Migration

Kör migrationen för att skapa de nya tabellerna:

```bash
# Från projektets root
cd supabase
supabase db push

# Eller manuellt via Supabase Dashboard:
# SQL Editor → Kör hela filen supabase/migrations/20250125000002_add_push_notifications.sql
```

Verifiera att följande tabeller skapades:
- `push_subscriptions`
- `notification_preferences`
- `notification_log`
- `projects` har nu kolumn `alert_settings`

### Steg 3: Environment Variables

Lägg till följande environment variables i Vercel:

#### Firebase Web Config (Frontend)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNx...
```

#### Firebase Admin (Backend)
Från den privata nyckeln du laddade ner:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

**VIKTIGT:** 
- `FIREBASE_PRIVATE_KEY` måste ha `\n` för newlines (ersätt faktiska newlines med `\n`)
- Wrappa värdet i dubbla citattecken

#### Cron Secret
Generera en slumpmässig secret för cron jobs:

```bash
openssl rand -base64 32
```

```env
CRON_SECRET=your-generated-secret-here
```

### Steg 4: Uppdatera Service Workers

Service Workers är redan skapade i `public/`:
- `public/sw.js` - Main service worker
- `public/firebase-messaging-sw.js` - Firebase messaging

Dessa kommer automatiskt deployeras med next build.

### Steg 5: Konfigurera Vercel Cron Jobs

Cron jobs är definierade i `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/checkout-reminders",
      "schedule": "45 16 * * 1-5"
    },
    {
      "path": "/api/cron/weekly-approval-summary",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

Efter deploy, verifiera i Vercel Dashboard:
1. Gå till Project → Settings → Cron Jobs
2. Se att båda cron jobs är aktiva

### Steg 6: Deploy till Vercel

```bash
# Committa alla ändringar
git add .
git commit -m "feat: EPIC 25 - Web Push Notifications"

# Pusha till feature branch
git push origin feature/epic-25-push-notifications

# Merga till main när testad
git checkout main
git merge feature/epic-25-push-notifications
git push origin main
```

Vercel kommer automatiskt deploya när du pushar till main.

### Steg 7: Verifiera Deployment

#### 7.1 Test Notification Permissions
1. Logga in på https://eptracker.app
2. Gå till Inställningar → Notiser
3. Klicka "Aktivera push-notiser"
4. Godkänn behörigheten
5. Klicka "Skicka testnotis"
6. Verifiera att du får notisen

#### 7.2 Test iOS (PWA)
1. Öppna Safari på iPhone
2. Gå till https://eptracker.app
3. Klicka dela-knappen → "Lägg till på hemskärmen"
4. Öppna appen från hemskärmen
5. Aktivera notiser i Inställningar
6. Skicka testnotis

#### 7.3 Test Android
1. Öppna Chrome på Android
2. Gå till https://eptracker.app
3. Aktivera notiser (behöver inte installera som PWA)
4. Skicka testnotis

#### 7.4 Test Cron Jobs
```bash
# Test checkout reminders cron (använd CRON_SECRET från env)
curl -X GET https://eptracker.app/api/cron/checkout-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Förväntat svar:
# {"message":"Check-out reminders sent","total":X,"sent":Y,"failed":Z}
```

## 🔒 Säkerhet

### Rate Limiting
Notification API routes har rate limiting:
- Subscribe: 5 requests/minut per user
- Test notification: 2 requests/minut per user
- Preferences: 10 requests/minut per user

### RLS Policies
Alla notification-tabeller har Row Level Security (RLS):
- Users can only see/update their own data
- Admins kan se org-wide data via special policies

### Cron Jobs
Cron jobs skyddas med `CRON_SECRET` environment variable.

## 📊 Monitoring

### Logs att övervaka
```bash
# Vercel Logs
vercel logs --follow

# Sök efter notification errors
vercel logs --filter="[Notification]"
```

### Key Metrics
- **Subscription rate:** Hur många % av users aktiverar notiser
- **Delivery rate:** Hur många notiser delivered vs failed
- **Click-through rate:** Hur många klickar på notiser
- **Unsubscribe rate:** Hur många inaktiverar

Dessa finns i `notification_log` table.

### Cleanup
En cron job borde köras månadsvis för att rensa gamla notiser:

```sql
SELECT cleanup_old_notifications();
-- Tar bort notification_log äldre än 30 dagar
```

## 🐛 Troubleshooting

### "Permission denied" för Firebase
- Kontrollera att `FIREBASE_PRIVATE_KEY` har `\n` för newlines
- Verifiera att service account har "Cloud Messaging Admin" roll

### Notiser kommer inte fram (iOS)
- App måste vara installerad som PWA (på hemskärmen)
- iOS 16.4+ krävs
- Safari (eller annan modern browser)

### Notiser kommer inte fram (Android)
- Kontrollera att Chrome tillåter notiser för siten
- Verifiera att Firebase config är korrekt

### Cron jobs körs inte
- Kontrollera att `vercel.json` är korrekt
- Verifiera att `CRON_SECRET` är satt
- Cron jobs kan ta upp till 1 minut att aktiveras efter deploy

### Service Worker registreras inte
- Kontrollera att `sw.js` finns i `public/`
- Service Workers fungerar endast över HTTPS (eller localhost)
- Rensa cache och hard reload (Ctrl+Shift+R)

## 📚 Dokumentation

- **User Guide:** `docs/help/notifications.md`
- **Epic Document:** `docs/EPIC-25-WEB-PUSH-NOTIFICATIONS.md`
- **Interactive Tour:** Finns i appen under Inställningar → Notiser

## ✅ Post-Deployment Checklist

- [ ] Firebase projekt skapat och konfigurerat
- [ ] VAPID key genererad
- [ ] Service account private key säkrad
- [ ] Environment variables satta i Vercel
- [ ] Supabase migration körd
- [ ] Vercel cron jobs konfigurerade
- [ ] Deployment verifierad (web)
- [ ] iOS PWA testad
- [ ] Android testad
- [ ] Desktop testad
- [ ] Cron jobs testade manuellt
- [ ] Logging och monitoring aktiverat
- [ ] User dokumentation uppdaterad i help-sektionen

## 🎉 Done!

Web Push Notifications är nu aktivt! Användare kan börja aktivera notiser från Inställningar → Notiser.

Kom ihåg att kommunicera denna nya feature till användarna via:
- Email/announcement
- In-app banner (kan skapas senare)
- Uppdatera onboarding flow

---
**Support:** Om du stöter på problem, kontakta utvecklingsteamet eller skapa ett GitHub issue.

