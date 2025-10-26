# EPIC 25: Local Dev Setup Guide

## 📋 Prerequisites

1. ✅ Firebase-admin installed (`npm list firebase-admin` should show v13.5.0)
2. ⏳ Firebase project setup needed
3. ⏳ Database migration needed
4. ⏳ Environment variables needed

## 🔧 Step-by-Step Setup

### Step 1: Create Firebase Project (5 min)

1. Go to https://console.firebase.google.com/
2. Click "Add project" (or use existing)
3. Enter project name (e.g., "EP-Tracker-Dev")
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Cloud Messaging (2 min)

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on **Cloud Messaging** tab
3. Under "Web configuration" → "Web Push certificates"
4. Click **"Generate key pair"**
5. **Copy the VAPID key** (starts with "B...")

### Step 3: Create Web App (3 min)

1. In Firebase Console, click the **Web icon** (</>)
2. Register app with nickname: "EP-Tracker Web Dev"
3. **Copy the firebaseConfig object**:
   ```javascript
   {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   }
   ```

### Step 4: Generate Service Account Key (2 min)

1. In Firebase Console → **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. **Keep this file safe - do NOT commit it to git!**

### Step 5: Setup Environment Variables (3 min)

1. Copy `.env.local.template` to `.env.local`:
   ```bash
   cp .env.local.template .env.local
   ```

2. Fill in the Firebase values from Steps 2-4:

   **From firebaseConfig (Step 3):**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

   **From VAPID key (Step 2):**
   ```env
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNx...
   ```

   **From Service Account JSON (Step 4):**
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
   ```
   
   **IMPORTANT:** For `FIREBASE_PRIVATE_KEY`, replace actual newlines with `\n` and wrap in quotes.

   **Generate CRON_SECRET:**
   ```bash
   openssl rand -base64 32
   ```
   Then add to `.env.local`:
   ```env
   CRON_SECRET=your-generated-secret
   ```

3. Keep your existing Supabase variables in `.env.local`

### Step 6: Run Database Migration (2 min)

```bash
# Make sure you're in the project root
cd "C:\Users\johan\Cursor Portfolio\EP-Tracker"

# Run migration (choose one method)

# Method 1: Using Supabase CLI
cd supabase
supabase db push

# Method 2: Manual via Supabase Dashboard
# Go to your Supabase Dashboard → SQL Editor
# Copy/paste entire content of:
# supabase/migrations/20250125000002_add_push_notifications.sql
# Click "Run"
```

Verify these tables were created:
- ✅ `push_subscriptions`
- ✅ `notification_preferences`
- ✅ `notification_log`
- ✅ `projects` has new column `alert_settings`

### Step 7: Start Dev Server

```bash
npm run dev
```

### Step 8: Test Notifications

1. Open http://localhost:3000
2. Login
3. Go to **Inställningar → Notiser** (`/dashboard/settings/notifications`)
4. Click **"Aktivera push-notiser"**
5. Allow notification permission when browser asks
6. Click **"Skicka testnotis"**
7. You should receive a test notification! 🎉

## 🧪 What to Test

### Basic Functionality
- [ ] Enable notifications (permission request)
- [ ] Send test notification
- [ ] Toggle notification types on/off
- [ ] Set quiet hours
- [ ] View notification history
- [ ] Disable notifications

### Platform Testing
- [ ] Chrome (Desktop) - should work
- [ ] Firefox (Desktop) - should work
- [ ] Safari 16+ (Desktop) - should work
- [ ] Edge (Desktop) - should work

### Integration Testing
- [ ] Check-in to a project → Team should get notification
- [ ] Approve time entry → Worker should get notification
- [ ] Cron job test (manual trigger):
  ```bash
  curl -X GET http://localhost:3000/api/cron/checkout-reminders \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```

### Project Alerts (Admin/Foreman only)
- [ ] Go to a project
- [ ] Access alert settings
- [ ] Configure work hours and reminders
- [ ] Save settings

## 🐛 Troubleshooting

### "Permission denied" error
- Check that `FIREBASE_PRIVATE_KEY` has `\n` for newlines
- Verify the key is wrapped in double quotes
- Make sure there are no extra spaces

### Service Worker not registering
- Check browser console for errors
- Service Workers only work on localhost or HTTPS
- Try hard reload (Ctrl+Shift+R)
- Clear site data in DevTools

### No notifications received
- Check that you granted permission
- Check browser console for errors
- Verify Firebase config is correct
- Check that FCM token was saved (check network tab → /api/notifications/subscribe)

### Database migration fails
- Make sure you have write access to Supabase
- Check for syntax errors in migration file
- Try running manually via Supabase Dashboard

## ✅ Success Checklist

Before considering dev setup complete:

- [ ] Firebase project created
- [ ] VAPID key generated
- [ ] Service account key downloaded
- [ ] All environment variables in `.env.local`
- [ ] Database migration completed
- [ ] Dev server starts without errors
- [ ] Can enable notifications
- [ ] Test notification works
- [ ] Can view notification history
- [ ] Project alert settings accessible (admin/foreman)

## 🔒 Security Notes

- **Never commit** `.env.local` to git (it's in `.gitignore`)
- **Never commit** Firebase service account JSON
- Keep `CRON_SECRET` secure
- Use separate Firebase projects for dev/staging/production

## 📚 Documentation

- **Deployment Guide:** `EPIC-25-DEPLOYMENT-GUIDE.md`
- **Implementation Summary:** `EPIC-25-IMPLEMENTATION-SUMMARY.md`
- **User Help:** `docs/help/notifications.md`

---
**Estimated setup time:** 15-20 minutes  
**Once setup is done, testing should be straightforward!**

