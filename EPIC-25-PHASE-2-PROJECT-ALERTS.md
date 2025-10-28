# EPIC 25 - Phase 2: Project-Specific Alerts

**Status:** ✅ Phase 2A Complete - Ready for Testing  
**Date:** 2025-01-28  
**Parent Epic:** EPIC 25 - Web Push Notifications

**Phase 2A:** Real-time alerts (check-in/out) ✅ COMPLETE  
**Phase 2B:** Scheduled alerts (cron jobs) ⏸️ TODO (Phase 3)

---

## 🎯 Krav från Johan

### 1. Obligatoriska projektfält:
- **Daglig starttid** (t.ex. 07:00)
- **Daglig stopptid** (t.ex. 16:00)

### 2. Alert-inställningar för Admin/Foreman:
- ✅ Notifiering vid varje check-in
- ✅ Notifiering vid varje check-out
- ✅ Notifiering om arbetare INTE checkat in X minuter efter starttid
- ✅ Notifiering om arbetare INTE checkat ut X minuter efter stopptid

---

## 📋 Implementation Plan

### Step 1: Database Schema ✅
**Tabell:** `projects`  
**Ny kolumn:** `alert_settings` (JSONB)

```sql
ALTER TABLE projects ADD COLUMN alert_settings JSONB DEFAULT '{
  "work_day_start": "07:00",
  "work_day_end": "16:00",
  "notify_on_checkin": true,
  "notify_on_checkout": true,
  "late_checkin_enabled": true,
  "late_checkin_minutes": 15,
  "forgotten_checkout_enabled": true,
  "forgotten_checkout_minutes": 30
}'::jsonb;
```

### Step 2: UI - Project Alert Settings
**Fil:** `app/dashboard/projects/[id]/edit/page.tsx`  
**Komponent:** `components/projects/project-alert-settings.tsx`

Visa i projekt-create/edit:
- Time pickers för start/stopp-tid
- Checkboxes för alert-typer
- Number inputs för minuter (X)

### Step 3: API Updates
**Filer att uppdatera:**
- `app/api/projects/route.ts` - Create med alert_settings
- `app/api/projects/[id]/route.ts` - Update alert_settings
- `app/api/time/entries/route.ts` - Trigga alerts vid check-in/out

### Step 4: Notification Logic
**Ny fil:** `lib/notifications/project-alerts.ts`

Funktioner:
- `notifyOnCheckIn()` - Skicka vid check-in
- `notifyOnCheckOut()` - Skicka vid check-out
- `checkLateCheckIns()` - Kör periodiskt, kolla sena
- `checkForgottenCheckOuts()` - Kör periodiskt, kolla glömda

### Step 5: Cron Jobs (för senare)
**Fil:** `app/api/cron/check-late-checkins/route.ts`
- Körs var 5:e minut
- Kollar alla projekt med `late_checkin_enabled: true`
- Skickar notis till admin/foreman

---

## 🏗️ Implementation Order

1. ✅ Database migration (alert_settings kolumn) - DONE
2. ✅ Project alert settings UI component - DONE
3. ✅ Uppdatera project create/edit forms - DONE
4. ✅ Uppdatera time entries API (check-in/out alerts) - DONE
5. ✅ Implementera project-alerts.ts logic - DONE
6. ⏸️ Cron jobs (Phase 3) - TODO LATER

---

## ✅ Implementation Summary (2025-01-28)

### Files Created:
- ✅ `supabase/migrations/20250128000002_add_project_alerts.sql`
- ✅ `components/projects/project-alert-settings.tsx`
- ✅ `lib/notifications/project-alerts.ts`
- ✅ `EPIC-25-PHASE-2-PROJECT-ALERTS.md`
- ✅ `EPIC-25-PHASE-2-TEST-GUIDE.md`

### Files Modified:
- ✅ `lib/schemas/project.ts` - Added AlertSettings type
- ✅ `components/projects/project-form.tsx` - Integrated alert settings
- ✅ `app/api/time/entries/route.ts` - Added check-in notifications
- ✅ `app/api/time/entries/[id]/route.ts` - Added check-out notifications
- ✅ `lib/notifications/index.ts` - Exported project alert functions

### What Works Now:
1. ✅ Admin/Foreman kan sätta alert settings när de skapar projekt
2. ✅ Alert settings kan redigeras för befintliga projekt
3. ✅ Check-in trigger real-time notis till admin/foreman
4. ✅ Check-out trigger real-time notis till admin/foreman (med arbetad tid)
5. ✅ Notiser respekterar projekt settings (kan avaktiveras)
6. ✅ Endast admin/foreman får notiser (inte workers)

### What's Next (Phase 3):
- ⏰ Cron job för check-in påminnelser (till workers)
- ⏰ Cron job för check-out påminnelser (till workers)
- ⏰ Cron job för sen check-in varningar (till admin/foreman)
- ⏰ Cron job för glömt check-out varningar (till admin/foreman)

---

## 🎨 UI Design

### Project Edit - Alert Settings Section

```
┌─────────────────────────────────────────────┐
│ Alert-inställningar                          │
│                                              │
│ Arbetsdag                                    │
│ ├─ Starttid:  [07:00] ⏰                     │
│ └─ Sluttid:   [16:00] ⏰                     │
│                                              │
│ Notifieringar                                │
│ ├─ ☑ Notifiera vid check-in                 │
│ ├─ ☑ Notifiera vid check-out                │
│ ├─ ☑ Varna om sen check-in                  │
│ │   └─ [15] minuter efter start              │
│ └─ ☑ Varna om glömt check-out               │
│     └─ [30] minuter efter slut               │
│                                              │
│ Vem får notiser?                             │
│ ├─ ☑ Admins                                  │
│ └─ ☑ Arbetsledare (Foremen)                 │
└─────────────────────────────────────────────┘
```

---

## 📊 Notification Types

### 1. Check-in Notification (Real-time)
**Till:** Admin + Foreman  
**När:** Worker checkar in  
**Meddelande:**
```
👷 [Namn] checkade in
På projekt: [Projekt]
Tid: 07:05
```

### 2. Check-out Notification (Real-time)
**Till:** Admin + Foreman  
**När:** Worker checkar ut  
**Meddelande:**
```
🏠 [Namn] checkade ut
På projekt: [Projekt]
Tid: 16:02
Arbetade: 8h 57min
```

### 3. Late Check-in Alert (Cron-based)
**Till:** Admin + Foreman  
**När:** X minuter efter starttid, ingen check-in  
**Meddelande:**
```
⚠️ Sen check-in
[Namn] har inte checkat in på [Projekt]
Starttid var 07:00 (nu 07:15)
```

### 4. Forgotten Check-out Alert (Cron-based)
**Till:** Admin + Foreman  
**När:** X minuter efter stopptid, ingen check-out  
**Meddelande:**
```
⚠️ Glömt check-out
[Namn] har inte checkat ut från [Projekt]
Sluttid var 16:00 (nu 16:30)
Incheckad sedan: 07:05
```

---

## 🔄 Flow Diagram

```
Project Created/Updated
        ↓
alert_settings saved to DB
        ↓
Worker checks in
        ↓
    ┌───────────────────────┐
    │ notify_on_checkin?    │
    └───────┬───────────────┘
            ↓ YES
    Send notification to
    Admin + Foreman
            ↓
    Log in notification_log
```

```
Cron runs every 5 min
        ↓
Get all projects with
late_checkin_enabled: true
        ↓
For each project:
    ├─ Get work_day_start
    ├─ Get team members
    ├─ Check who hasn't checked in
    └─ If > late_checkin_minutes
        └─ Send alert to Admin/Foreman
```

---

## ✅ Success Criteria

- [ ] Projekt kan skapas med start/stopp-tid
- [ ] Alert settings visas i projekt-edit
- [ ] Check-in triggers notis om enabled
- [ ] Check-out triggers notis om enabled
- [ ] Sena check-ins upptäcks och varnar
- [ ] Glömda check-outs upptäcks och varnar
- [ ] Endast admin/foreman får alerts
- [ ] Notiser respekterar user preferences

---

## 🚀 Timeline

**Phase 2A (Real-time alerts):** 2-3 timmar
- Database migration
- UI components
- Check-in/out notifications

**Phase 2B (Scheduled alerts):** 2-3 timmar (senare)
- Cron jobs
- Late check-in detection
- Forgotten check-out detection

---

## 📝 Notes

- Real-time alerts (check-in/out) implementeras FÖRST
- Scheduled alerts (late/forgotten) kräver cron jobs → Phase 3
- Alert settings är per projekt (inte globalt)
- Team members = alla users med project_member relation
- Endast admin + foreman får alerts (inte workers)

