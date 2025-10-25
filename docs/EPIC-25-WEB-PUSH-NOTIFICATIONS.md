# EPIC 25: Web Push Notifications

**Goal:** Implement Web Push Notifications för att hålla användare informerade om viktiga händelser även när de inte har appen öppen

**Priority:** High  
**Estimated Effort:** 3-4 dagar  
**Dependencies:** Ingen - fristående feature

---

## Business Value

### Problem
- Användare missar viktiga händelser (godkännanden, team check-ins, glömda check-outs)
- Administratörer måste aktivt kolla efter nya tidrapporter
- Arbetsledare får inte omedelbar info när arbetare checkar in/ut
- Användare glömmer att checka ut i slutet av arbetsdagen

### Lösning
Web Push Notifications ger realtidsuppdateringar direkt till användarens enhet:
- 📱 **Android**: Fungerar direkt i Chrome/Firefox, även när browsern är stängd
- 📱 **iOS**: Fungerar när appen är installerad som PWA (iOS 16.4+)
- 💻 **Desktop**: Fungerar i alla moderna browsers

### ROI
- ⏱️ **Snabbare godkännanden** - minskar tid från rapportering till godkännande
- 👷 **Bättre översikt** - arbetsledare ser direkt när teamet är på plats
- ✅ **Färre glömda check-outs** - påminnelser på kvällen
- 📊 **Högre användarnöjdhet** - användare känner sig mer uppkopplade

---

## User Stories

**Total: 9 user stories**

### US-25.1: Som användare vill jag få pushnotiser när appen är installerad

**Acceptance Criteria:**
- Given jag har installerat EP-Tracker som PWA
- When jag besöker inställningar för första gången
- Then ska jag se en banner som erbjuder att aktivera notiser
- And när jag klickar "Aktivera" ska browsern fråga om tillstånd
- And efter godkännande ska jag se "Notiser aktiverade ✓"
- And mitt FCM-token ska sparas i databasen
- And jag ska få en välkomstnotis inom 5 sekunder

**Notes:**
- Visa inte banner om användaren redan nekat notiser
- Spara användarens val i localStorage
- Service Worker måste vara registrerad först

### US-25.2: Som arbetare vill jag få påminnelse att checka ut

**Acceptance Criteria:**
- Given jag är incheckad på ett projekt
- When klockan är 16:45 (eller annan konfigurerad tid)
- And jag fortfarande är incheckad
- Then ska jag få en pushnotis: "Glöm inte checka ut! Du är incheckad på [Projekt]"
- And när jag klickar på notisen ska appen öppnas på dashboard
- And notisen ska visa hur länge jag varit incheckad
- And notisen ska ha ljudsignal och vibration

**Technical:**
- Daglig cron-job kör kl 16:45
- Kontrollerar alla aktiva time_entries utan stop_at
- Skickar batch av notiser via FCM

### US-25.3: Som arbetsledare vill jag få notis när mina arbetare checkar in/ut

**Acceptance Criteria:**
- Given jag är arbetsledare (role=foreman eller admin)
- When en arbetare i mitt team checkar in eller ut
- Then ska jag få en pushnotis: "[Namn] checkade in/ut på [Projekt]"
- And notisen ska visa tidpunkt
- And när jag klickar ska jag komma till dagens översikt
- And jag kan konfigurera vilka projekt jag vill ha notiser för

**Settings:**
- Checkbox per projekt: "Notifiera mig om check-ins"
- Global on/off switch för team-notiser
- Tyst läge: 22:00-07:00 (konfigurerbart)

### US-25.4: Som admin vill jag få notis när tidrapporter behöver godkännas

**Acceptance Criteria:**
- Given jag är admin eller arbetsledare med godkännanderätt
- When en arbetares vecka är klar för godkännande
- And det är måndag morgon 08:00
- Then ska jag få en notis: "[Antal] tidrapporter väntar på godkännande"
- And när jag klickar kommer jag till godkännande-sidan
- And notisen ska grupperas (inte en per arbetare)

**Logic:**
- Veckosammanställning körs varje måndag kl 08:00
- Räknar antal workers med unapproved veckor
- Skickar en grupperad notis till varje godkännare

### US-25.5: Som användare vill jag få notis när min tidrapport har godkänts

**Acceptance Criteria:**
- Given min veckorapport är inskickad för godkännande
- When en admin godkänner min rapport
- Then ska jag få en notis: "Din tidrapport för vecka [X] har godkänts av [Admin namn]"
- And notisen ska visa totalt antal timmar
- And när jag klickar ska jag se den godkända veckan

### US-25.6: Som användare vill jag kunna hantera mina notis-inställningar

**Acceptance Criteria:**
- Given jag har aktiverat notiser
- When jag går till Inställningar → Notiser
- Then ska jag se alla typer av notiser jag kan få
- And varje typ ska ha en on/off toggle
- And jag ska kunna se när jag senast fick en notis
- And jag ska kunna testa notiser med en "Skicka testnotis" knapp
- And jag ska kunna inaktivera alla notiser med en knapp

**Notis-typer:**
- ✅ Check-out påminnelser
- 👷 Team check-ins/outs (endast för arbetsledare)
- 📊 Godkännanden väntar (endast för admins)
- ✓ Din rapport godkänd
- 📋 Nya ÄTA på dina projekt
- 📖 Nya dagboksinlägg
- 🎯 Veckosammanfattning (fredag kväll)

### US-25.7: Som användare vill jag se notishistorik

**Acceptance Criteria:**
- Given jag har fått pushnotiser
- When jag går till Inställningar → Notiser → Historik
- Then ska jag se en lista över mina senaste 50 notiser
- And varje notis ska visa typ, titel, meddelande, och tidpunkt
- And jag ska kunna klicka på en notis för att gå till relaterat innehåll
- And gamla notiser (>30 dagar) ska rensas automatiskt

### US-25.8: Som admin/arbetsledare vill jag sätta projekt-specifika alerts

**Acceptance Criteria:**
- Given jag skapar eller redigerar ett projekt
- When jag är admin eller foreman
- Then ska jag se en "Alert-inställningar" sektion
- And jag ska kunna definiera arbetsdagens start-tid (ex: 07:00)
- And jag ska kunna definiera arbetsdagens slut-tid (ex: 16:00)
- And jag ska kunna aktivera "Check-in påminnelse" med tid (ex: 15 min efter start)
- And jag ska kunna aktivera "Check-out påminnelse" med tid (ex: 15 min före slut)
- And jag ska kunna aktivera "Sen check-in varning" (arbetare inte checkat in efter starttid)
- And jag ska kunna aktivera "Glömt check-out varning" (30 min efter sluttid)
- And alla som har projekt-access ska få relevanta alerts
- And settings ska sparas per projekt

**Alert-typer:**
1. **Check-in påminnelse** - "Dags att checka in på [Projekt]" (kl 06:45 om start är 07:00)
2. **Sen check-in varning (till foreman)** - "[Namn] har inte checkat in på [Projekt]" (kl 07:15 om start är 07:00)
3. **Check-out påminnelse** - "Glöm inte checka ut från [Projekt]" (kl 15:45 om slut är 16:00)
4. **Glömt check-out varning (till foreman)** - "[Namn] har inte checkat ut från [Projekt]" (kl 16:30 om slut är 16:00)

**Database schema addition:**
```sql
ALTER TABLE projects ADD COLUMN alert_settings JSONB DEFAULT '{
  "work_day_start": "07:00",
  "work_day_end": "16:00",
  "checkin_reminder_enabled": true,
  "checkin_reminder_minutes_before": 15,
  "checkout_reminder_enabled": true,
  "checkout_reminder_minutes_before": 15,
  "late_checkin_alert_enabled": true,
  "late_checkin_alert_minutes_after": 15,
  "forgotten_checkout_alert_enabled": true,
  "forgotten_checkout_alert_minutes_after": 30,
  "alert_recipients": ["foreman", "admin"]
}'::jsonb;
```

### US-25.9: Som ny användare vill jag lära mig om pushnotiser via hjälp och tour

**Acceptance Criteria:**
- Given jag är ny användare
- When jag går till Hjälp-sidan
- Then ska jag se en sektion "Pushnotiser & Påminnelser"
- And sektionen ska förklara:
  - Vad är pushnotiser
  - Hur man aktiverar dem (iOS vs Android)
  - Vilka typer av notiser som finns
  - Hur man anpassar inställningar
  - Hur man felsöker om notiser inte fungerar
- And det ska finnas screenshots för iOS och Android
- And det ska finnas en video-guide (valfritt)

**Interactive Tour:**
- Given jag besöker Inställningar → Notiser för första gången
- When sidan laddas
- Then ska en interaktiv tour starta (om användaren vill)
- And touren ska highlighta:
  1. "Aktivera notiser" knappen
  2. Olika notis-typer och deras toggles
  3. Quiet hours inställning
  4. Test-notis knappen
  5. Notishistorik länken
- And touren ska kunna hoppas över
- And touren ska inte visas igen efter första gången

---

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / PWA                         │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Service Worker (sw.js)                  │    │
│  │  - Lyssnar på push events från FCM             │    │
│  │  - Visar notiser via Notification API          │    │
│  │  - Hanterar notis-klick (öppnar rätt sida)     │    │
│  └────────────────────────────────────────────────┘    │
│                         ↑                                │
│                         │ Push                           │
└─────────────────────────┼──────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│                         │                                │
│            Firebase Cloud Messaging (FCM)               │
│            - Google's push notification service          │
│                         │                                │
└─────────────────────────┼──────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────┐
│                    Next.js Backend                       │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │     API Routes (app/api/notifications/)        │    │
│  │  - POST /subscribe (spara FCM token)           │    │
│  │  - POST /unsubscribe (ta bort token)           │    │
│  │  - POST /send (skicka notis till användare)    │    │
│  │  - GET /settings (hämta användarens prefs)     │    │
│  │  - PUT /settings (uppdatera prefs)             │    │
│  └────────────────────────────────────────────────┘    │
│                         │                                │
│  ┌────────────────────────────────────────────────┐    │
│  │   Notification Service (lib/notifications/)    │    │
│  │  - sendCheckOutReminder()                       │    │
│  │  - sendTeamCheckIn()                            │    │
│  │  - sendApprovalNeeded()                         │    │
│  │  - sendApprovalConfirmed()                      │    │
│  └────────────────────────────────────────────────┘    │
│                         │                                │
│  ┌────────────────────────────────────────────────┐    │
│  │         Supabase Database                       │    │
│  │                                                  │    │
│  │  push_subscriptions:                            │    │
│  │    - user_id                                     │    │
│  │    - fcm_token                                   │    │
│  │    - device_info                                 │    │
│  │    - created_at                                  │    │
│  │                                                  │    │
│  │  notification_preferences:                       │    │
│  │    - user_id                                     │    │
│  │    - checkout_reminders (bool)                   │    │
│  │    - team_checkins (bool)                        │    │
│  │    - approvals (bool)                            │    │
│  │    - quiet_hours_start/end                       │    │
│  │                                                  │    │
│  │  notification_log:                               │    │
│  │    - user_id                                     │    │
│  │    - type                                        │    │
│  │    - title, body                                 │    │
│  │    - sent_at, read_at                            │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Flow: Användare aktiverar notiser

```
1. User klickar "Aktivera notiser"
2. Frontend requestar tillstånd via Notification.requestPermission()
3. Service Worker registreras (om inte redan)
4. Service Worker begär FCM token
5. Frontend POSTar token till /api/notifications/subscribe
6. Backend sparar i push_subscriptions tabell
7. Backend skapar default preferences i notification_preferences
8. Backend skickar välkomstnotis via FCM
9. Service Worker tar emot och visar notis
```

### Flow: Skicka check-out påminnelse

```
1. Cron job körs kl 16:45 (via Vercel Cron eller Supabase Function)
2. Hämta alla aktiva time_entries utan stop_at
3. För varje entry:
   a. Hämta user_id och projekt info
   b. Kolla notification_preferences (är checkout_reminders på?)
   c. Kolla quiet hours
   d. Hämta FCM token från push_subscriptions
   e. Skicka notis via Firebase Admin SDK
   f. Logga i notification_log
```

---

## Tasks

### Phase 1: Foundation & Service Worker (Dag 1)

#### Firebase Setup
- [ ] Skapa Firebase projekt på console.firebase.google.com
- [ ] Aktivera Firebase Cloud Messaging
- [ ] Generera och ladda ner service account key (JSON)
- [ ] Lägg till Firebase config i environment variables:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

#### Service Worker
- [ ] Skapa `public/sw.js` (inte i TypeScript för enklare deployment)
  ```javascript
  // Lyssna på push events
  self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/faviconEP.png',
      badge: '/images/faviconEP.png',
      data: data.data, // För click handling
    });
  });
  
  // Hantera notis-klick
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  });
  ```

- [ ] Skapa `public/firebase-messaging-sw.js` för FCM
  ```javascript
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
  
  firebase.initializeApp({
    apiKey: "...",
    projectId: "...",
    messagingSenderId: "...",
    appId: "..."
  });
  
  const messaging = firebase.messaging();
  ```

- [ ] Registrera Service Worker i `app/layout.tsx`
  ```typescript
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  ```

#### Database Schema
- [ ] Skapa migration `supabase/migrations/XXXXXX_add_push_notifications.sql`
  ```sql
  -- Push subscriptions
  CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    device_type TEXT, -- 'android', 'ios', 'desktop'
    device_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Notification preferences
  CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    checkout_reminders BOOLEAN DEFAULT true,
    team_checkins BOOLEAN DEFAULT true,
    approvals_needed BOOLEAN DEFAULT true,
    approval_confirmed BOOLEAN DEFAULT true,
    ata_updates BOOLEAN DEFAULT true,
    diary_updates BOOLEAN DEFAULT true,
    weekly_summary BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Notification log
  CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
  );
  
  -- Indexes
  CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
  CREATE INDEX idx_notif_log_user ON notification_log(user_id, sent_at DESC);
  CREATE INDEX idx_notif_log_type ON notification_log(type, sent_at DESC);
  
  -- RLS Policies
  ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
  ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Users can manage their own subscriptions"
    ON push_subscriptions FOR ALL
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can manage their own preferences"
    ON notification_preferences FOR ALL
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can view their own notification log"
    ON notification_log FOR SELECT
    USING (auth.uid() = user_id);
  ```

- [ ] Köra migration: `supabase db push`

### Phase 2: Backend - Firebase Integration (Dag 1-2)

#### Firebase Admin SDK
- [ ] Installera dependencies:
  ```bash
  npm install firebase-admin
  ```

- [ ] Skapa `lib/notifications/firebase-admin.ts`
  ```typescript
  import * as admin from 'firebase-admin';
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  
  export const messaging = admin.messaging();
  ```

#### Notification Service
- [ ] Skapa `lib/notifications/send-notification.ts`
  ```typescript
  import { messaging } from './firebase-admin';
  import { createClient } from '@/lib/supabase/server';
  
  interface NotificationPayload {
    userId: string;
    type: string;
    title: string;
    body: string;
    url: string;
    data?: Record<string, any>;
  }
  
  export async function sendNotification(payload: NotificationPayload) {
    const supabase = await createClient();
    
    // 1. Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', payload.userId)
      .single();
    
    // Check if notification type is enabled
    const prefKey = getPreferenceKey(payload.type);
    if (prefs && !prefs[prefKey]) {
      console.log(`Notification ${payload.type} disabled for user ${payload.userId}`);
      return;
    }
    
    // 2. Check quiet hours
    if (isQuietHours(prefs)) {
      console.log(`In quiet hours, skipping notification`);
      return;
    }
    
    // 3. Get FCM tokens
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', payload.userId);
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions for user ${payload.userId}`);
      return;
    }
    
    // 4. Send to all devices
    const tokens = subscriptions.map(s => s.fcm_token);
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url,
        type: payload.type,
        ...payload.data,
      },
      tokens,
    };
    
    const response = await messaging.sendMulticast(message);
    
    // 5. Log notification
    await supabase.from('notification_log').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
    
    return response;
  }
  ```

- [ ] Skapa type-specifika helpers:
  - `lib/notifications/check-out-reminder.ts`
  - `lib/notifications/team-checkin.ts`
  - `lib/notifications/approval-needed.ts`
  - `lib/notifications/approval-confirmed.ts`

#### API Routes
- [ ] `app/api/notifications/subscribe/route.ts` - Spara FCM token
  ```typescript
  export async function POST(request: Request) {
    const { token, deviceInfo } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Upsert subscription
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      fcm_token: token,
      device_type: deviceInfo.type,
      device_name: deviceInfo.name,
      last_used_at: new Date().toISOString(),
    });
    
    // Create default preferences if not exists
    await supabase.from('notification_preferences').upsert({
      user_id: user.id,
    });
    
    return NextResponse.json({ success: true });
  }
  ```

- [ ] `app/api/notifications/unsubscribe/route.ts` - Ta bort token
- [ ] `app/api/notifications/test/route.ts` - Skicka testnotis
- [ ] `app/api/notifications/preferences/route.ts` - GET/PUT preferences
- [ ] `app/api/notifications/history/route.ts` - GET notification log

### Phase 3: Frontend - Activation UI (Dag 2)

#### Notification Permission Hook
- [ ] Skapa `lib/hooks/use-notification-permission.ts`
  ```typescript
  export function useNotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    
    useEffect(() => {
      setIsSupported('Notification' in window && 'serviceWorker' in navigator);
      if (isSupported) {
        setPermission(Notification.permission);
      }
    }, []);
    
    const requestPermission = async () => {
      if (!isSupported) return false;
      
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        // Get FCM token and subscribe
        const token = await getFCMToken();
        await subscribeToPush(token);
      }
      
      return result === 'granted';
    };
    
    return { permission, isSupported, requestPermission };
  }
  ```

#### Settings Page
- [ ] Skapa `app/dashboard/settings/notifications/page.tsx`
  - [ ] Visa aktiverings-banner om notiser inte är på
  - [ ] Lista alla notis-typer med toggles
  - [ ] Quiet hours picker (start/end time)
  - [ ] Testnotis-knapp
  - [ ] "Inaktivera alla notiser" knapp
  - [ ] Länk till notishistorik

- [ ] Skapa `components/settings/notification-settings.tsx`
  ```tsx
  export function NotificationSettings() {
    const { permission, requestPermission } = useNotificationPermission();
    const { data: prefs, mutate } = useNotificationPreferences();
    
    if (permission === 'denied') {
      return <NotificationsDeniedBanner />;
    }
    
    if (permission === 'default') {
      return <EnableNotificationsBanner onEnable={requestPermission} />;
    }
    
    return (
      <div>
        <NotificationToggle
          label="Check-out påminnelser"
          description="Påminnelse om att checka ut kl 16:45"
          checked={prefs?.checkout_reminders}
          onChange={(val) => mutate({ checkout_reminders: val })}
        />
        {/* ... more toggles ... */}
        <QuietHoursSelector
          start={prefs?.quiet_hours_start}
          end={prefs?.quiet_hours_end}
          onChange={(start, end) => mutate({ quiet_hours_start: start, quiet_hours_end: end })}
        />
      </div>
    );
  }
  ```

- [ ] Skapa `app/dashboard/settings/notifications/history/page.tsx`
  - [ ] Lista senaste 50 notiserna
  - [ ] Visa typ, titel, body, tidpunkt
  - [ ] Klickbara för att gå till relaterat innehåll
  - [ ] Filter per typ

#### Components
- [ ] `components/notifications/enable-banner.tsx` - Banner för att aktivera
- [ ] `components/notifications/denied-banner.tsx` - Info om hur man aktiverar i inställningar
- [ ] `components/notifications/notification-toggle.tsx` - Toggle för varje typ
- [ ] `components/notifications/quiet-hours-selector.tsx` - Time picker

### Phase 4: Notification Triggers (Dag 3)

#### Check-out Reminder Cron
- [ ] Skapa `app/api/cron/checkout-reminders/route.ts`
  ```typescript
  export async function GET(request: Request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const supabase = await createClient();
    
    // Find active time entries
    const { data: entries } = await supabase
      .from('time_entries')
      .select('id, user_id, start_at, projects(name)')
      .is('stop_at', null);
    
    // Send reminders
    for (const entry of entries || []) {
      await sendCheckOutReminder({
        userId: entry.user_id,
        projectName: entry.projects.name,
        checkInTime: entry.start_at,
      });
    }
    
    return NextResponse.json({ sent: entries?.length || 0 });
  }
  ```

- [ ] Konfigurera Vercel Cron i `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/checkout-reminders",
      "schedule": "45 16 * * 1-5"
    }]
  }
  ```

#### Team Check-in Notifications
- [ ] Hook in `app/api/time/entries/route.ts` (POST)
  ```typescript
  // After creating time entry
  const entry = await createTimeEntry(...);
  
  // Notify team leads
  await notifyTeamLeads({
    userId: entry.user_id,
    projectId: entry.project_id,
    action: 'check_in',
  });
  ```

#### Approval Notifications
- [ ] Hook in `app/api/approvals/[id]/route.ts` (PATCH)
  ```typescript
  // After approval
  await sendApprovalConfirmed({
    userId: approval.user_id,
    weekNumber: approval.week_number,
    approverName: currentUser.full_name,
    totalHours: approval.total_hours,
  });
  ```

- [ ] Weekly summary cron (måndag 08:00)
  ```typescript
  // Count pending approvals
  // Send grouped notification to admins/foremen
  ```

#### Project-Specific Alerts
- [ ] Update `projects` table schema med `alert_settings` kolumn
  ```sql
  ALTER TABLE projects ADD COLUMN alert_settings JSONB DEFAULT '{
    "work_day_start": "07:00",
    "work_day_end": "16:00",
    "checkin_reminder_enabled": true,
    "checkin_reminder_minutes_before": 15,
    "checkout_reminder_enabled": true,
    "checkout_reminder_minutes_before": 15,
    "late_checkin_alert_enabled": true,
    "late_checkin_alert_minutes_after": 15,
    "forgotten_checkout_alert_enabled": true,
    "forgotten_checkout_alert_minutes_after": 30,
    "alert_recipients": ["foreman", "admin"]
  }'::jsonb;
  ```

- [ ] Skapa `components/projects/project-alert-settings.tsx`
  ```tsx
  export function ProjectAlertSettings({ projectId, settings, onSave }) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alert-inställningar</CardTitle>
          <CardDescription>
            Konfigurera påminnelser och varningar för detta projekt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Day Times */}
          <div className="grid grid-cols-2 gap-4">
            <TimeInput
              label="Arbetsdagens start"
              value={settings.work_day_start}
              onChange={(val) => onChange('work_day_start', val)}
            />
            <TimeInput
              label="Arbetsdagens slut"
              value={settings.work_day_end}
              onChange={(val) => onChange('work_day_end', val)}
            />
          </div>
          
          {/* Check-in Reminder */}
          <AlertToggle
            label="Check-in påminnelse"
            description="Påminn arbetare att checka in"
            enabled={settings.checkin_reminder_enabled}
            minutesBefore={settings.checkin_reminder_minutes_before}
            onToggle={(val) => onChange('checkin_reminder_enabled', val)}
            onMinutesChange={(val) => onChange('checkin_reminder_minutes_before', val)}
          />
          
          {/* Late Check-in Alert */}
          <AlertToggle
            label="Sen check-in varning"
            description="Varna arbetsledare om sen check-in"
            enabled={settings.late_checkin_alert_enabled}
            minutesAfter={settings.late_checkin_alert_minutes_after}
            onToggle={(val) => onChange('late_checkin_alert_enabled', val)}
            onMinutesChange={(val) => onChange('late_checkin_alert_minutes_after', val)}
          />
          
          {/* Check-out Reminder */}
          <AlertToggle
            label="Check-out påminnelse"
            description="Påminn arbetare att checka ut"
            enabled={settings.checkout_reminder_enabled}
            minutesBefore={settings.checkout_reminder_minutes_before}
            onToggle={(val) => onChange('checkout_reminder_enabled', val)}
            onMinutesChange={(val) => onChange('checkout_reminder_minutes_before', val)}
          />
          
          {/* Forgotten Check-out Alert */}
          <AlertToggle
            label="Glömt check-out varning"
            description="Varna arbetsledare om glömt check-out"
            enabled={settings.forgotten_checkout_alert_enabled}
            minutesAfter={settings.forgotten_checkout_alert_minutes_after}
            onToggle={(val) => onChange('forgotten_checkout_alert_enabled', val)}
            onMinutesChange={(val) => onChange('forgotten_checkout_alert_minutes_after', val)}
          />
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] Integrera i `app/dashboard/projects/[id]/edit/page.tsx`
  - [ ] Visa ProjectAlertSettings komponent
  - [ ] Endast för admin/foreman
  - [ ] Spara till projects.alert_settings kolumn

- [ ] Integrera i `app/dashboard/projects/new/page.tsx`
  - [ ] Visa ProjectAlertSettings med default värden
  - [ ] Spara med projektet vid create

- [ ] Skapa `lib/notifications/project-alerts.ts`
  ```typescript
  export async function sendProjectCheckInReminder(projectId: string) {
    // 1. Hämta projekt alert_settings
    // 2. Beräkna reminder tid baserat på work_day_start och minutes_before
    // 3. Hämta alla project members
    // 4. Skicka notis till varje member som har enabled checkin_reminders
  }
  
  export async function sendLateCheckInAlert(projectId: string) {
    // 1. Hämta projekt alert_settings och work_day_start
    // 2. Hitta members som inte checkat in efter start + minutes_after
    // 3. Skicka notis till foremen/admins som har project access
  }
  
  export async function sendProjectCheckOutReminder(projectId: string) {
    // Similar logic
  }
  
  export async function sendForgottenCheckOutAlert(projectId: string) {
    // Similar logic
  }
  ```

- [ ] Skapa cron jobs för projekt-alerts
  - [ ] `app/api/cron/project-checkin-reminders/route.ts` - Körs varje timme, kollar projekt settings
  - [ ] `app/api/cron/project-late-checkins/route.ts` - Körs varje 15 min, kollar sena check-ins
  - [ ] `app/api/cron/project-checkout-reminders/route.ts` - Körs varje timme
  - [ ] `app/api/cron/project-forgotten-checkouts/route.ts` - Körs varje 15 min

#### Help Documentation
- [ ] Skapa `components/help/notifications-help.tsx`
  ```tsx
  export function NotificationsHelp() {
    return (
      <div className="space-y-6">
        <Section title="Vad är pushnotiser?">
          <p>
            Pushnotiser är realtidsmeddelanden som visas på din enhet även 
            när EP-Tracker inte är öppen. De håller dig informerad om 
            viktiga händelser som check-ins, godkännanden och påminnelser.
          </p>
        </Section>
        
        <Section title="Hur aktiverar jag notiser?">
          <Tabs>
            <Tab label="Android">
              <ol>
                1. Öppna EP-Tracker i Chrome eller Firefox
                2. Gå till Inställningar → Notiser
                3. Klicka "Aktivera notiser"
                4. Godkänn när browsern frågar
                5. Klart! Du får nu notiser även när browsern är stängd
              </ol>
              <Image src="/help/android-notifications.png" />
            </Tab>
            
            <Tab label="iPhone/iPad">
              <ol>
                1. Öppna EP-Tracker i Safari
                2. Klicka på "Dela"-knappen
                3. Välj "Lägg till på hemskärmen"
                4. Öppna appen från hemskärmen (VIKTIGT!)
                5. Gå till Inställningar → Notiser
                6. Klicka "Aktivera notiser"
                7. Godkänn när iOS frågar
              </ol>
              <Alert>
                OBS: Notiser fungerar bara om appen är installerad på 
                hemskärmen och öppnas därifrån!
              </Alert>
              <Image src="/help/ios-pwa-install.png" />
              <Image src="/help/ios-notifications.png" />
            </Tab>
          </Tabs>
        </Section>
        
        <Section title="Vilka notiser kan jag få?">
          <NotificationTypesList>
            <NotificationType
              icon="⏰"
              title="Check-out påminnelser"
              description="Påminnelse att checka ut i slutet av arbetsdagen"
              availableFor="Alla"
            />
            <NotificationType
              icon="👷"
              title="Team check-ins"
              description="Se när ditt team checkar in och ut"
              availableFor="Arbetsledare, Admins"
            />
            {/* ... more types ... */}
          </NotificationTypesList>
        </Section>
        
        <Section title="Felsökning">
          <Accordion>
            <AccordionItem title="Jag får inga notiser på iPhone">
              <p>
                Kontrollera att:
                1. Appen är installerad på hemskärmen
                2. Du öppnar appen från hemskärmen (inte Safari)
                3. Du har iOS 16.4 eller senare
                4. Du har godkänt notiser i iOS-inställningarna
              </p>
            </AccordionItem>
            
            <AccordionItem title="Notiserna kommer inte i tid">
              <p>
                Pushnotiser kan försenas om enheten är i energisparläge eller 
                har dålig internetuppkoppling. Kontrollera din anslutning.
              </p>
            </AccordionItem>
            
            <AccordionItem title="Hur stänger jag av notiser?">
              <p>
                Gå till Inställningar → Notiser och inaktivera de typer du 
                inte vill ha, eller klicka "Inaktivera alla notiser".
              </p>
            </AccordionItem>
          </Accordion>
        </Section>
      </div>
    );
  }
  ```

- [ ] Integrera i `app/dashboard/help/page.tsx`
  - [ ] Lägg till "Pushnotiser & Påminnelser" sektion
  - [ ] Använd NotificationsHelp komponent
  - [ ] Lägg till i innehållsförteckningen

- [ ] Skapa screenshots:
  - [ ] `/public/help/android-notifications.png`
  - [ ] `/public/help/ios-pwa-install.png`
  - [ ] `/public/help/ios-notifications.png`

#### Interactive Tour
- [ ] Lägg till notification tour steps i `lib/onboarding/tour-steps.ts`
  ```typescript
  export const notificationsTourSteps: TourStep[] = [
    {
      target: '[data-tour="enable-notifications"]',
      title: 'Aktivera pushnotiser',
      content: 'Klicka här för att aktivera pushnotiser och få realtidsuppdateringar',
      placement: 'bottom',
    },
    {
      target: '[data-tour="notification-types"]',
      title: 'Välj notis-typer',
      content: 'Här kan du välja vilka typer av notiser du vill få. Aktivera eller inaktivera varje typ efter behov.',
      placement: 'right',
    },
    {
      target: '[data-tour="quiet-hours"]',
      title: 'Tyst läge',
      content: 'Konfigurera när du INTE vill få notiser, till exempel på natten.',
      placement: 'left',
    },
    {
      target: '[data-tour="test-notification"]',
      title: 'Testa notiser',
      content: 'Klicka här för att skicka en testnotis och verifiera att allt fungerar.',
      placement: 'top',
    },
    {
      target: '[data-tour="notification-history"]',
      title: 'Notishistorik',
      content: 'Se alla notiser du fått de senaste 30 dagarna.',
      placement: 'top',
    },
  ];
  ```

- [ ] Uppdatera `components/onboarding/page-tour-trigger.tsx`
  ```typescript
  const tourMap = {
    'dashboard': dashboardTourSteps,
    'projects': projectsTourSteps,
    'time': timeTourSteps,
    'materials': materialsTourSteps,
    'approvals': approvalsTourSteps,
    'planning': planningTourSteps,
    'planning-today': planningTodayTourSteps,
    'notifications': notificationsTourSteps, // NEW
  };
  ```

- [ ] Lägg till tour trigger i `app/dashboard/settings/notifications/page.tsx`
  ```tsx
  export default function NotificationsPage() {
    return (
      <>
        <NotificationSettings />
        <PageTourTrigger tourId="notifications" />
      </>
    );
  }
  ```

- [ ] Lägg till tour-data-attribut i NotificationSettings komponenter
  - `data-tour="enable-notifications"` på aktivera-knapp
  - `data-tour="notification-types"` på toggles container
  - `data-tour="quiet-hours"` på quiet hours picker
  - `data-tour="test-notification"` på test-knapp
  - `data-tour="notification-history"` på historik-länk

- [ ] Lägg till "Starta guided tour" knapp i notifications settings
  ```tsx
  <Button
    variant="outline"
    onClick={() => router.push('/dashboard/settings/notifications?tour=notifications')}
  >
    <HelpCircle className="w-4 h-4 mr-2" />
    Starta guided tour
  </Button>
  ```

### Phase 5: Testing & Polish (Dag 4)

#### Unit Tests
- [ ] Test `sendNotification()` with mocked Firebase
- [ ] Test preference checking logic
- [ ] Test quiet hours logic
- [ ] Test token management

#### Integration Tests
- [ ] Subscribe flow end-to-end
- [ ] Send and receive test notification
- [ ] Update preferences
- [ ] View notification history

#### E2E Tests (Playwright)
- [ ] Enable notifications from settings
- [ ] Receive check-out reminder (simulate time)
- [ ] Click notification and navigate to dashboard
- [ ] Disable notification type
- [ ] Verify notification not sent

#### Manual Testing Checklist
- [ ] Test på Android Chrome
- [ ] Test på Android Firefox
- [ ] Test på iPhone Safari (PWA installed)
- [ ] Test på Desktop Chrome
- [ ] Test på Desktop Firefox
- [ ] Verify notification sound
- [ ] Verify notification vibration
- [ ] Verify icon/badge display
- [ ] Test quiet hours
- [ ] Test multiple devices per user

#### Documentation
- [ ] User guide: Hur man aktiverar notiser
- [ ] User guide: Hur man installerar PWA på iOS
- [ ] Admin guide: Notis-typer och triggers
- [ ] Developer docs: Hur man lägger till ny notis-typ

---

## Definition of Done

- [ ] Service Worker registrerad och fungerande
- [ ] Firebase integration komplett
- [ ] Database schema deployd (inkl. projects.alert_settings kolumn)
- [ ] Alla API routes implementerade och testade
- [ ] UI för aktivering och inställningar komplett
- [ ] Projekt-alerts UI implementerad i projekt create/edit
- [ ] Hjälpdokumentation skriven och publicerad (med screenshots)
- [ ] Interaktiv tour för notiser implementerad
- [ ] Alla 9 user stories uppfyllda
- [ ] Check-out reminder cron fungerande
- [ ] Team check-in notiser fungerande
- [ ] Approval notiser fungerande
- [ ] Fungerar på Android Chrome
- [ ] Fungerar på iOS Safari (PWA)
- [ ] Fungerar på Desktop
- [ ] Unit tests >80% coverage
- [ ] E2E tests för critical paths
- [ ] Dokumentation skriven
- [ ] Code review godkänd
- [ ] QA testing komplett
- [ ] Production deploy

---

## Success Metrics

### Week 1 (Efter Release)
- [ ] 30% av användare aktiverar notiser
- [ ] <5% error rate för notification delivery
- [ ] 0 performance regression (PWA still fast)

### Month 1
- [ ] 50% adoption rate
- [ ] 70% av check-out reminders leder till faktisk check-out inom 15 min
- [ ] 40% snabbare godkännande-tid (från submission till approval)
- [ ] >4.0 user satisfaction score för notifications

### Month 3
- [ ] 70% adoption rate
- [ ] 10% minskning i "glömda check-outs"
- [ ] 50% snabbare approval turnaround
- [ ] Feature requests för fler notis-typer (means users love it!)

---

## Risks & Mitigations

### Risk: iOS users kan inte få notiser (inte PWA)
**Mitigation:** 
- Visa tydlig guide för hur man installerar PWA
- Fallback till email-notiser för iOS users utan PWA
- A/B test: Pusha iOS users mot PWA-installation med incentive

### Risk: Notification fatigue (för många notiser)
**Mitigation:**
- Smart grouping (batcha notiser istället för spam)
- Intelligent quiet hours
- Easy opt-out per typ
- Weekly digest option istället för realtid

### Risk: Firebase kostar för mycket
**Mitigation:**
- Firebase har generös free tier (10M messages/month)
- Monitoring på usage
- Rate limiting per user (max 50 notiser/dag)
- Om kostnaden blir hög: migrera till self-hosted solution

### Risk: Service Worker bugs är svåra att debugga
**Mitigation:**
- Extensive logging till Sentry
- Remote debugging guide för support
- Graceful degradation (appen fungerar utan SW)
- Easy "reset" knapp som avregistrerar och registrerar om SW

---

## Future Enhancements (Not in Scope)

- [ ] Rich notifications med knappar ("Checka ut nu" direkt i notisen)
- [ ] Notification grouping/threading
- [ ] Scheduled notifications ("Påminn mig om 1 timme")
- [ ] Location-based notifications (geo-fence runt projekt)
- [ ] Chat/messaging notifications
- [ ] Video call notifications
- [ ] Voice notifications (TTS)
- [ ] Apple Watch integration
- [ ] Android Wear integration

---

## References

- [Web Push Notifications API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [iOS 16.4 Web Push Support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [PWA Installation on iOS](https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes)
- [Service Worker Best Practices](https://web.dev/service-worker-mindset/)

