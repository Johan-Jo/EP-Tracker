# Notification Messages - EPIC 25 Phase 2

## 📱 Så här ser notiserna ut

---

## 1. Check-in Notification (Real-time)
**Till:** Admin + Foreman  
**När:** Worker checkar in på projekt

### Exempel:
```
Titel: 👷 Johan Andersson checkade in

Meddelande:
På projekt: Nybyggnad Kungsbacka
Tid: 07:05
```

**Data som skickas:**
- `title`: "👷 Johan Andersson checkade in"
- `body`: "På projekt: Nybyggnad Kungsbacka\nTid: 07:05"
- `type`: "check_in"
- `tag`: "checkin-[project-id]-[user-id]"
- `url`: "/dashboard/projects/[project-id]"

---

## 2. Check-out Notification (Real-time)
**Till:** Admin + Foreman  
**När:** Worker checkar ut från projekt

### Exempel:
```
Titel: 🏠 Johan Andersson checkade ut

Meddelande:
På projekt: Nybyggnad Kungsbacka
Tid: 16:02
Arbetat: 8h 57min
```

**Data som skickas:**
- `title`: "🏠 Johan Andersson checkade ut"
- `body`: "På projekt: Nybyggnad Kungsbacka\nTid: 16:02\nArbetat: 8h 57min"
- `type`: "check_out"
- `tag`: "checkout-[project-id]-[user-id]"
- `url`: "/dashboard/projects/[project-id]"

---

## 3. Check-in Reminder (Scheduled - Phase 3)
**Till:** Worker  
**När:** X minuter före arbetsdagens start

### Exempel:
```
Titel: ⏰ Dags att checka in snart

Meddelande:
Projekt: Nybyggnad Kungsbacka
Starttid: 07:00
```

**Data som skickas:**
- `title`: "⏰ Dags att checka in snart"
- `body`: "Projekt: Nybyggnad Kungsbacka\nStarttid: 07:00"
- `type`: "reminder"
- `tag`: "checkin-reminder-[project-id]-[user-id]"
- `url`: "/dashboard/time"

---

## 4. Check-out Reminder (Scheduled - Phase 3)
**Till:** Worker  
**När:** X minuter före arbetsdagens slut

### Exempel:
```
Titel: ⏰ Glöm inte checka ut

Meddelande:
Projekt: Nybyggnad Kungsbacka
Sluttid: 16:00
```

**Data som skickas:**
- `title`: "⏰ Glöm inte checka ut"
- `body`: "Projekt: Nybyggnad Kungsbacka\nSluttid: 16:00"
- `type`: "reminder"
- `tag`: "checkout-reminder-[project-id]-[user-id]"
- `url`: "/dashboard/time"

---

## 5. Late Check-in Alert (Scheduled - Phase 3)
**Till:** Admin + Foreman  
**När:** Worker inte checkat in X minuter efter starttid

### Exempel:
```
Titel: ⚠️ Sen check-in

Meddelande:
Johan Andersson har inte checkat in på Nybyggnad Kungsbacka
Starttid var 07:00 (nu 07:15)
```

**Data som skickas:**
- `title`: "⚠️ Sen check-in"
- `body`: "Johan Andersson har inte checkat in på Nybyggnad Kungsbacka\nStarttid var 07:00 (nu 07:15)"
- `type`: "alert"
- `tag`: "late-checkin-[project-id]-[user-id]"
- `url`: "/dashboard/projects/[project-id]"

---

## 6. Forgotten Check-out Alert (Scheduled - Phase 3)
**Till:** Admin + Foreman  
**När:** Worker inte checkat ut X minuter efter sluttid

### Exempel:
```
Titel: ⚠️ Glömt check-out

Meddelande:
Johan Andersson har inte checkat ut från Nybyggnad Kungsbacka
Sluttid var 16:00 (nu 16:30)
Incheckad sedan: 07:05
```

**Data som skickas:**
- `title`: "⚠️ Glömt check-out"
- `body`: "Johan Andersson har inte checkat ut från Nybyggnad Kungsbacka\nSluttid var 16:00 (nu 16:30)\nIncheckad sedan: 07:05"
- `type`: "alert"
- `tag`: "forgotten-checkout-[project-id]-[user-id]"
- `url`: "/dashboard/projects/[project-id]"

---

## 📋 Notification Data Structure

Varje notis innehåller:

```typescript
{
  userId: string;           // Mottagarens ID
  type: string;             // 'check_in' | 'check_out' | 'reminder' | 'alert'
  title: string;            // Notis-titel (visas stort)
  body: string;             // Notis-meddelande (visas under titel)
  data: {
    projectId: string;      // Projekt-ID
    userId?: string;        // Worker som det gäller
    type: string;           // Samma som type ovan
    url: string;            // URL att navigera till vid klick
  };
  tag: string;              // Unik identifierare för notisen
}
```

---

## 🎨 Visuellt i Windows Notification Center

### Check-in Notification:
```
┌───────────────────────────────────────┐
│ EP-Tracker                            │
├───────────────────────────────────────┤
│ 👷 Johan Andersson checkade in        │
│                                       │
│ På projekt: Nybyggnad Kungsbacka      │
│ Tid: 07:05                            │
└───────────────────────────────────────┘
```

### Check-out Notification:
```
┌───────────────────────────────────────┐
│ EP-Tracker                            │
├───────────────────────────────────────┤
│ 🏠 Johan Andersson checkade ut        │
│                                       │
│ På projekt: Nybyggnad Kungsbacka      │
│ Tid: 16:02                            │
│ Arbetat: 8h 57min                     │
└───────────────────────────────────────┘
```

### Late Check-in Alert:
```
┌───────────────────────────────────────┐
│ EP-Tracker                            │
├───────────────────────────────────────┤
│ ⚠️ Sen check-in                       │
│                                       │
│ Johan Andersson har inte checkat in   │
│ på Nybyggnad Kungsbacka               │
│ Starttid var 07:00 (nu 07:15)         │
└───────────────────────────────────────┘
```

---

## 🔔 Interaktion

**När användaren klickar på notisen:**
1. Applikationen öppnas/fokuseras
2. Navigerar till relevant URL:
   - Check-in/out/alerts → Projektsidan
   - Reminders → Tidsregistreringssidan

**Notification tags:**
- Förhindrar duplicerade notiser
- Samma tag = ersätter gammal notis
- Olika tags = flera notiser kan visas samtidigt

---

## 🛠️ Implementation Details

**Kod-location:**
- `lib/notifications/project-alerts.ts` - Alla funktioner
- `app/api/time/entries/route.ts` - Check-in trigger
- `app/api/time/entries/[id]/route.ts` - Check-out trigger

**Service Worker:**
- `public/firebase-messaging-sw.js` - Hanterar background notifications
- `public/sw.js` - Generell PWA service worker

**Firebase Payload Format:**
```json
{
  "notification": {
    "title": "👷 Johan Andersson checkade in",
    "body": "På projekt: Nybyggnad Kungsbacka\nTid: 07:05",
    "icon": "/images/faviconEP.png"
  },
  "data": {
    "projectId": "abc-123",
    "userId": "user-456",
    "type": "check_in",
    "url": "/dashboard/projects/abc-123"
  }
}
```

---

## ✅ Current Status

- ✅ Check-in notifications (Real-time) - **WORKING**
- ✅ Check-out notifications (Real-time) - **WORKING**
- ⏰ Check-in reminders (Scheduled) - Phase 3
- ⏰ Check-out reminders (Scheduled) - Phase 3
- ⏰ Late check-in alerts (Scheduled) - Phase 3
- ⏰ Forgotten check-out alerts (Scheduled) - Phase 3

---

**Testable Now:** Check-in & Check-out notifications  
**Coming in Phase 3:** Scheduled reminders & alerts (requires cron jobs)

