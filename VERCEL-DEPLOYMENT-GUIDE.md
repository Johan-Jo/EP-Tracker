# Vercel Deployment Guide - EPIC 25 Phase 2

**Date:** 2025-01-28  
**Commit:** `6d9830f`

---

## 🚀 Step 1: Vercel Environment Variables

### Firebase Backend (REQUIRED)

Gå till **Vercel Dashboard → Settings → Environment Variables**

Lägg till dessa:

```bash
# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=ep-tracker-dev-6202a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ep-tracker-dev-6202a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg.....din_privata_nyckel_här.....=\n-----END PRIVATE KEY-----\n"
```

**VIKTIGT för FIREBASE_PRIVATE_KEY:**
- Kopiera hela nyckeln från Firebase JSON-filen
- Behåll `\n` för line breaks
- Sätt inom citattecken: `"-----BEGIN...-----END PRIVATE KEY-----\n"`
- Eller kopiera på en rad med escaped newlines

### Firebase Frontend (REQUIRED)

```bash
# Firebase Web SDK (Frontend) - MÅSTE börja med NEXT_PUBLIC_
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAcsNNhpRiqIvVNiyd16aZeOOknKxdsZJo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ep-tracker-dev-6202a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ep-tracker-dev-6202a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ep-tracker-dev-6202a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=117589001561
NEXT_PUBLIC_FIREBASE_APP_ID=1:117589001561:web:b69baface5a06172d43848
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BCo-8PF...din_vapid_key_här
```

### Environment Scope

För ALLA environment variables ovan:
- ✅ **Production** ← VIKTIGT!
- ✅ **Preview**
- ✅ **Development**

---

## 🗄️ Step 2: Supabase Database Migration

### Option A: Via Supabase Dashboard (REKOMMENDERAT)

1. Gå till **Supabase Dashboard** → https://supabase.com/dashboard
2. Välj ditt projekt
3. Gå till **SQL Editor**
4. Kör denna migration:

```sql
-- Migration: Add project alert settings
-- Epic 25 Phase 2: Project-Specific Alerts
-- Created: 2025-01-28

-- Add alert_settings column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS alert_settings JSONB DEFAULT '{"work_day_start":"07:00","work_day_end":"16:00","notify_on_checkin":true,"notify_on_checkout":true,"checkin_reminder_enabled":false,"checkin_reminder_minutes_before":15,"checkout_reminder_enabled":false,"checkout_reminder_minutes_before":15,"late_checkin_enabled":false,"late_checkin_minutes_after":15,"forgotten_checkout_enabled":false,"forgotten_checkout_minutes_after":30,"alert_recipients":["admin","foreman"]}'::jsonb;

-- Add comment
COMMENT ON COLUMN projects.alert_settings IS 'Project-specific alert configuration for check-in/out notifications';

-- Create index for faster queries on alert settings
CREATE INDEX IF NOT EXISTS idx_projects_alert_settings 
ON projects USING gin (alert_settings);

-- Update existing projects with default alert settings (only if NULL)
UPDATE projects 
SET alert_settings = '{"work_day_start":"07:00","work_day_end":"16:00","notify_on_checkin":true,"notify_on_checkout":true,"checkin_reminder_enabled":false,"checkin_reminder_minutes_before":15,"checkout_reminder_enabled":false,"checkout_reminder_minutes_before":15,"late_checkin_enabled":false,"late_checkin_minutes_after":15,"forgotten_checkout_enabled":false,"forgotten_checkout_minutes_after":30,"alert_recipients":["admin","foreman"]}'::jsonb
WHERE alert_settings IS NULL;
```

5. Klicka **RUN**
6. Verifiera: `SELECT id, name, alert_settings FROM projects LIMIT 5;`

### Option B: Via Supabase CLI (Avancerad)

```bash
# Från project root
supabase db push
```

---

## 🔧 Step 3: Vercel Build Settings

### Build & Development Settings

**Gå till:** Vercel Dashboard → Settings → General

```
Framework Preset: Next.js
Build Command: npm run build (eller default)
Output Directory: .next (eller default)
Install Command: npm install (eller default)
Development Command: npm run dev (eller default)
```

### Root Directory

```
Root Directory: . (project root)
```

---

## 🔔 Step 4: Update Service Worker (Firebase Messaging)

**VIKTIGT:** Service Worker kan inte använda environment variables.

Verifiera att `public/firebase-messaging-sw.js` har RÄTT Firebase config:

```javascript
// public/firebase-messaging-sw.js
firebase.initializeApp({
  apiKey: "AIzaSyAcsNNhpRiqIvVNiyd16aZeOOknKxdsZJo",
  authDomain: "ep-tracker-dev-6202a.firebaseapp.com",
  projectId: "ep-tracker-dev-6202a",
  storageBucket: "ep-tracker-dev-6202a.firebasestorage.app",
  messagingSenderId: "117589001561",
  appId: "1:117589001561:web:b69baface5a06172d43848"
});
```

✅ Denna fil är redan korrekt i din codebase (pushad till GitHub).

---

## 🚀 Step 5: Trigger Deployment

### Automatic (REDAN GJORT)

Vercel detected din push till `main` och deployas automatiskt.

### Manual (om behövs)

1. Gå till **Vercel Dashboard**
2. Välj ditt projekt
3. Klicka **"Redeploy"**
4. Välj senaste commit (`6d9830f`)

---

## ✅ Step 6: Verify Deployment

### 1. Check Deployment Status

**Vercel Dashboard → Deployments**

- ✅ Build status: Success
- ✅ Deploy status: Ready
- ✅ Lighthouse scores (optional)

### 2. Test Alert Settings UI

```
1. Gå till: https://[din-domain].vercel.app/dashboard/projects/new
2. Scrolla ner till "Alert-inställningar"
3. Verifiera att formuläret visas korrekt
4. Skapa ett test-projekt
```

### 3. Test Alert Settings Display

```
1. Öppna ett befintligt projekt
2. Verifiera att "Alert-inställningar" kortet visas
3. Klicka "Redigera"
4. Testa att ändra inställningar
5. Spara och verifiera att ändringar sparas
```

### 4. Test Notifications

```
1. Gå till: https://[din-domain].vercel.app/dashboard/settings/notifications
2. Aktivera notiser
3. Öppna ett projekt i inkognito (som worker)
4. Checka in
5. Verifiera att admin får notis
```

---

## 🐛 Troubleshooting

### Problem 1: "Firebase Admin SDK not configured"

**Lösning:**
- Gå till Vercel → Environment Variables
- Verifiera att `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` finns
- Verifiera att de är satta för **Production** environment
- Redeploy

### Problem 2: "No FCM tokens found"

**Lösning:**
- Verifiera att `NEXT_PUBLIC_FIREBASE_*` variables finns
- Verifiera att `NEXT_PUBLIC_FIREBASE_VAPID_KEY` är korrekt
- Kolla browser console för Firebase errors
- Registrera service worker igen

### Problem 3: Migration körs inte

**Lösning:**
- Kör migration manuellt via Supabase Dashboard (Step 2, Option A)
- Verifiera med: `SELECT column_name FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'alert_settings';`

### Problem 4: "alert_settings" column not found

**Lösning:**
- Migration har inte körts
- Följ Step 2 ovan
- Eller kör: `ALTER TABLE projects ADD COLUMN IF NOT EXISTS alert_settings JSONB;`

### Problem 5: Build fails

**Lösning:**
- Kolla Vercel build logs
- Verifiera att alla dependencies finns i `package.json`
- Kör `npm install` och `npm run build` lokalt först
- Fixa eventuella TypeScript errors

---

## 📊 Post-Deployment Checklist

### Immediate (0-1h)

- [ ] ✅ Deployment succeeded
- [ ] ✅ Migration ran successfully
- [ ] ✅ Alert settings UI visible in project create
- [ ] ✅ Alert settings display visible on project page
- [ ] ✅ Edit alert settings works
- [ ] ✅ Settings persist correctly

### Testing (1-24h)

- [ ] Test check-in notification (end-to-end)
- [ ] Test check-out notification (end-to-end)
- [ ] Verify notification content is correct
- [ ] Test on different devices (desktop, mobile)
- [ ] Test on different browsers (Chrome, Safari, Firefox)

### Monitoring (1-7 days)

- [ ] Check Vercel logs for errors
- [ ] Check Supabase logs for DB issues
- [ ] Monitor notification delivery rate
- [ ] Collect user feedback
- [ ] Track performance metrics

---

## 🔐 Security Notes

### Public vs Private Variables

**Backend (Private):**
- `FIREBASE_PROJECT_ID` ← Server-side only
- `FIREBASE_CLIENT_EMAIL` ← Server-side only
- `FIREBASE_PRIVATE_KEY` ← Server-side only

**Frontend (Public):**
- `NEXT_PUBLIC_FIREBASE_*` ← Exposed to browser
- This is SAFE - Firebase security rules protect your data
- Never put secrets in `NEXT_PUBLIC_*` variables

### Firebase Security

✅ **Safe to expose:**
- API Key
- Auth Domain
- Project ID
- Storage Bucket
- Messaging Sender ID
- App ID
- VAPID Key

🔒 **Protected by:**
- Firebase Security Rules (Firestore, Storage)
- Supabase RLS (Row Level Security)
- Backend validation

---

## 📞 Support

**Vercel Deployment Issues:**
- https://vercel.com/docs/deployments/troubleshoot

**Firebase Issues:**
- https://firebase.google.com/docs/cloud-messaging/js/client

**Supabase Issues:**
- https://supabase.com/docs/guides/database/migrations

---

## 🎯 Success Criteria

✅ **Deployment is successful when:**

1. Build completes without errors
2. Migration adds `alert_settings` column
3. Project create shows alert settings form
4. Project detail shows alert settings card
5. Edit dialog works and saves changes
6. Check-in triggers notification to admin/foreman
7. Check-out triggers notification with hours worked
8. Notifications respect project settings (can be disabled)
9. Help page shows new guides and FAQs
10. No console errors in production

---

## 📝 Environment Variables Reference

### Complete List for Production

```bash
# === Supabase (redan konfigurerade) ===
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# === Firebase Admin (Backend) - NYA ===
FIREBASE_PROJECT_ID=ep-tracker-dev-6202a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@ep-tracker-dev-6202a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# === Firebase Web (Frontend) - NYA ===
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAcsNNhpRiqIvVNiyd16aZeOOknKxdsZJo
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ep-tracker-dev-6202a.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ep-tracker-dev-6202a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ep-tracker-dev-6202a.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=117589001561
NEXT_PUBLIC_FIREBASE_APP_ID=1:117589001561:web:b69baface5a06172d43848
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BCo-8PF...

# === Stripe (om relevant) ===
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...

# === Email (Resend) ===
RESEND_API_KEY=re_...
```

---

**Status:** 📋 Guide Complete - Ready to Configure Vercel

**Next:** Follow Step 1 → Add Environment Variables in Vercel Dashboard

