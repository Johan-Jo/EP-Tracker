# 🧪 Guide för att testa notifikationer (alerts)

## 📋 Översikt

Denna guide visar hur du testar alla typer av notifikationer i EP-Tracker, både push och email.

---

## 1. 🔧 Förberedelser

### 1.1 Kontrollera miljövariabler

Se till att dessa är konfigurerade i `.env.local` eller Vercel:

```env
# Email (Resend)
RESEND_API_KEY=re_...

# Firebase (för push)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

# Cron (för cron-jobb tester)
CRON_SECRET=...
```

### 1.2 Kör database migration

Se till att `delivery_methods` kolumnen finns:

```bash
# Kör migrationen
cd supabase
supabase db push

# Eller kör manuellt i Supabase Dashboard
```

---

## 2. 🖥️ UI-tester (Frontend)

### 2.1 Testnotifikation via inställningar

1. **Öppna inställningar:**
   - Logga in på EP-Tracker
   - Gå till: **Inställningar → Notiser** (`/dashboard/settings/notifications`)

2. **Aktivera push-notiser:**
   - Klicka på **"Aktivera push-notiser"**
   - Tillåt notifikationer när webbläsaren ber om det
   - Se till att du har en aktiv subscription (ikon ska vara grön)

3. **Välj leveransmetod:**
   - För varje notifikationstyp, välj leveransmetod:
     - **Push** - Endast push-notiser
     - **Email** - Endast email
     - **Båda** - Push + Email

4. **Skicka testnotis:**
   - Klicka på **"Skicka testnotis"** knappen
   - Du borde få:
     - Push-notis i webbläsaren (om valt)
     - Email i din inbox (om valt)

### 2.2 Testa olika leveransmetoder

**Test 1: Endast Push**
1. Sätt en notifikationstyp till **"Push"**
2. Skicka testnotis
3. ✅ Förväntat: Push-notis visas, ingen email

**Test 2: Endast Email**
1. Sätt en notifikationstyp till **"Email"**
2. Skicka testnotis
3. ✅ Förväntat: Email skickas, ingen push-notis

**Test 3: Båda**
1. Sätt en notifikationstyp till **"Båda"**
2. Skicka testnotis
3. ✅ Förväntat: Både push-notis OCH email skickas

---

## 3. 📧 Email-tester

### 3.1 Testa email direkt via script

Kör test-scriptet för att skicka en email direkt:

```bash
# Från projektets root
npx ts-node scripts/test-notification-email.ts din@email.com

# Eller med specifik email
npx ts-node scripts/test-notification-email.ts oi@johan.com.br
```

**Förväntat resultat:**
```
🧪 Testing notification email to: din@email.com
✅ Found user: Ditt Namn (ID: xxx)
✅ Test notification sent successfully!
📧 Method: email
📧 Message ID: xxx
📬 Check inbox at: din@email.com
```

### 3.2 Testa email via API

```bash
# Testa med curl (ersätt med din session cookie/token)
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

**För att hitta session cookie:**
1. Öppna Developer Tools (F12)
2. Gå till **Application** → **Cookies**
3. Kopiera värdet för `sb-xxx-auth-token` eller liknande

---

## 4. 🔔 Push-notifikation tester

### 4.1 Via UI

Se **2.1 Testnotifikation via inställningar** ovan.

### 4.2 Via API direkt

```bash
# Testa push-notis via API
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

### 4.3 Kontrollera push-subscriptions

Kontrollera i Supabase att FCM token sparats:

```sql
-- Kolla dina push-subscriptions
SELECT * FROM push_subscriptions 
WHERE user_id = 'ditt-user-id' 
AND is_active = true;
```

---

## 5. 🔄 Testa specifika notification-typer

### 5.1 Check-out påminnelser

**Via cron-jobb (manuellt):**
```bash
curl -X GET http://localhost:3000/api/cron/checkout-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Förväntat:** Användare med aktiva time entries får påminnelse.

**Via kod:**
```typescript
import { sendCheckOutReminder } from '@/lib/notifications';

await sendCheckOutReminder({
  userId: 'user-id',
  projectName: 'Test Projekt',
  projectId: 'project-id',
  checkInTime: new Date().toISOString(),
  hoursWorked: 8,
});
```

### 5.2 Team check-in notifikationer

1. **Checka in på ett projekt:**
   - Gå till **Tid** → Checka in på ett projekt
   - ✅ Team-medlemmar borde få notifikation om de har `team_checkins` aktiverat

2. **Välj leveransmetod:**
   - I notis-inställningar, sätt **"Team check-ins"** till önskad metod
   - Testa igen

### 5.3 Approval notifikationer

1. **När approval behövs:**
   - Skapa en tidrapport som behöver godkännas
   - ✅ Admin/Foreman borde få notifikation om de har `approvals_needed` aktiverat

2. **När approval bekräftas:**
   - Godkänn en tidrapport
   - ✅ Användaren borde få notifikation om de har `approval_confirmed` aktiverat

### 5.4 Project alerts (check-in/check-out påminnelser)

1. **Konfigurera project alerts:**
   - Gå till ett projekt
   - **Inställningar → Alerts**
   - Aktivera check-in eller check-out reminders
   - Sätt arbetsdagar och påminnelsetider

2. **Testa via cron-jobb:**
   ```bash
   # Check-in reminders (körs varje timme)
   curl -X GET http://localhost:3000/api/cron/checkin-reminders \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   
   # Check-out reminders (projekt-specifika)
   # Testas via project-alerts cron
   ```

3. **Testa manuellt:**
   ```typescript
   import { sendCheckInReminder } from '@/lib/notifications/project-alerts';
   
   await sendCheckInReminder({
     projectId: 'project-id',
     userId: 'user-id',
     userName: 'Test User',
     workDayStart: '07:00',
   });
   ```

### 5.5 Late check-in / Forgotten checkout alerts

```bash
# Late check-in alerts
curl -X GET http://localhost:3000/api/cron/late-checkin-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Forgotten checkout alerts
curl -X GET http://localhost:3000/api/cron/forgotten-checkout-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 6. 🕐 Testa quiet hours

### 6.1 Konfigurera quiet hours

1. Gå till **Inställningar → Notiser**
2. Aktivera **"Tyst läge"**
3. Sätt start- och sluttid (t.ex. 22:00 - 07:00)

### 6.2 Testa

**Push-notiser:**
- ✅ Bör **respektera** quiet hours (ej skickas under tyst läge)
- ✅ **Ignoreras** om `skipQuietHours: true` (t.ex. för team check-outs)

**Email:**
- ✅ **Ignorerar** alltid quiet hours (skickas alltid)

**Test:**
1. Sätt quiet hours till nuvarande tid (t.ex. 10:00 - 11:00)
2. Skicka testnotis
3. Push borde inte skickas, men email borde skickas

---

## 7. 📊 Kontrollera notification log

Alla skickade notifikationer loggas i `notification_log` tabellen:

```sql
-- Visa senaste notifikationer
SELECT 
  id,
  user_id,
  type,
  title,
  body,
  data->>'method' as delivery_method,
  created_at
FROM notification_log
ORDER BY created_at DESC
LIMIT 20;

-- Visa notifikationer för specifik användare
SELECT * FROM notification_log
WHERE user_id = 'ditt-user-id'
ORDER BY created_at DESC;

-- Visa bara email-notifikationer
SELECT * FROM notification_log
WHERE data->>'method' IN ('email', 'both')
ORDER BY created_at DESC;
```

---

## 8. 🐛 Felsökning

### Problem: Ingen email skickas

1. **Kontrollera Resend API key:**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Kontrollera att användaren har email:**
   ```sql
   SELECT id, email FROM profiles WHERE id = 'user-id';
   SELECT email FROM auth.users WHERE id = 'user-id';
   ```

3. **Kontrollera delivery_method:**
   ```sql
   SELECT delivery_methods FROM notification_preferences 
   WHERE user_id = 'user-id';
   ```

4. **Kontrollera logs:**
   - Kolla server logs för felmeddelanden
   - Kolla Resend dashboard för bounce/delivery status

### Problem: Ingen push-notis

1. **Kontrollera att push är aktiverat:**
   ```sql
   SELECT * FROM push_subscriptions 
   WHERE user_id = 'user-id' AND is_active = true;
   ```

2. **Kontrollera Firebase config:**
   - Verifiera att alla Firebase env-variabler är satta
   - Kontrollera att FIREBASE_PRIVATE_KEY har `\n` för newlines

3. **Kontrollera browser permissions:**
   - Öppna Developer Tools → Application → Notifications
   - Se till att permission är "Allow"

4. **Kontrollera service worker:**
   - Developer Tools → Application → Service Workers
   - Se till att `firebase-messaging-sw.js` är aktiv

### Problem: Fel leveransmetod

1. **Kontrollera preferences:**
   ```sql
   SELECT delivery_methods FROM notification_preferences 
   WHERE user_id = 'user-id';
   ```

2. **Uppdatera i UI:**
   - Gå till Inställningar → Notiser
   - Ändra leveransmetod för önskad notifikationstyp
   - Spara och testa igen

---

## 9. ✅ Testchecklista

### Grundfunktionalitet
- [ ] Push-notiser fungerar
- [ ] Email-notiser fungerar
- [ ] Båda fungerar när "Båda" är valt
- [ ] Testnotis fungerar från UI
- [ ] Leveransmetod kan ändras i UI
- [ ] Preferences sparas korrekt

### Specifika typer
- [ ] Check-out påminnelser (cron)
- [ ] Team check-in notifikationer
- [ ] Approval notifikationer
- [ ] Project check-in reminders (cron)
- [ ] Project check-out reminders
- [ ] Late check-in alerts (cron)
- [ ] Forgotten checkout alerts (cron)

### Quiet hours
- [ ] Push respekterar quiet hours
- [ ] Email ignorera quiet hours
- [ ] Operational alerts (skipQuietHours) skickas ändå

### Edge cases
- [ ] Användare utan email får ingen email-notis
- [ ] Användare utan push-subscription får ingen push
- [ ] Default delivery method är 'push' för nya användare
- [ ] Cron-jobb fungerar med alla delivery methods

---

## 10. 📝 Test via script

### Skapa ett komplett test-script

Skapa `scripts/test-all-notifications.ts`:

```typescript
import { createAdminClient } from '../lib/supabase/server';
import { sendNotification } from '../lib/notifications';

async function testAllNotifications() {
  const supabase = createAdminClient();
  
  // Hämta första användare
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .limit(1);
  
  if (!profiles || profiles.length === 0) {
    console.error('❌ Ingen användare hittades');
    return;
  }
  
  const user = profiles[0];
  console.log(`🧪 Testar notifikationer för: ${user.full_name} (${user.email})`);
  
  // Test 1: Push only
  console.log('\n1. Testar Push only...');
  const pushResult = await sendNotification({
    userId: user.id,
    type: 'test',
    title: '🔔 Test Push',
    body: 'Detta är en push-notis',
    url: '/dashboard',
  });
  console.log('Resultat:', pushResult);
  
  // Test 2: Email only (uppdatera preferences först)
  // ... etc
}

testAllNotifications();
```

---

## 11. 🌐 Production testing

### Testa i production

1. **Testnotifikationer:**
   - Använd alltid testnotifikationer först
   - Kontrollera att email kommer fram innan du testar med riktiga notifikationer

2. **Cron-jobb i production:**
   - Vercel cron-jobb körs automatiskt enligt schema
   - För manuell test, använd Vercel Cron dashboard eller API

3. **Monitorera:**
   - Kolla `notification_log` för alla skickade notifikationer
   - Kolla Resend dashboard för email-delivery status
   - Kolla Firebase Console för push-notifikationer

---

## 12. 🎯 Snabbtest

För snabb test:

1. **Gå till:** `/dashboard/settings/notifications`
2. **Välj leveransmetod:** "Båda" för en notifikationstyp
3. **Klicka:** "Skicka testnotis"
4. **Kontrollera:** 
   - Push-notis i webbläsaren
   - Email i inbox

✅ Om båda kommer fram = allt fungerar!

---

## 💡 Tips

- **Utveckling:** Använd `localhost` för testning
- **Production:** Testa alltid med testnotifikationer först
- **Email:** Resend har en "test mode" - kontrollera att du inte är i test mode
- **Logs:** Alla notifikationer loggas i `notification_log` - använd detta för debugging
- **Multiple devices:** Testa på olika enheter för att se push-notiser

---

## 📞 Support

Om något inte fungerar:
1. Kolla server logs
2. Kolla `notification_log` i databasen
3. Kolla Resend dashboard (för email)
4. Kolla Firebase Console (för push)
5. Verifiera alla env-variabler är satta korrekt


