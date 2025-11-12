# EPIC 25 Phase 2: Project Alerts - Test Guide

**Status:** ✅ Implementation Complete - Ready for Testing  
**Date:** 2025-01-28

---

## ✅ What's Been Implemented

### 1. Database Migration ✅
- Added `alert_settings` column to `projects` table
- Default values set for all existing projects

### 2. UI Components ✅
- `ProjectAlertSettings` component created
- Integrated into project create/edit forms
- All 6 alert types configurable

### 3. API Integration ✅
- Check-in notifications (real-time)
- Check-out notifications (real-time)
- Updated time entries API routes

### 4. Notification Logic ✅
- `lib/notifications/project-alerts.ts` created
- All 6 notification types implemented:
  1. ✅ Check-in notis till admin/foreman (real-time)
  2. ✅ Check-out notis till admin/foreman (real-time)
  3. ⏰ Check-in påminnelse till arbetare (cron - Phase 3)
  4. ⏰ Check-out påminnelse till arbetare (cron - Phase 3)
  5. ⏰ Sen check-in varning (cron - Phase 3)
  6. ⏰ Glömt check-out varning (cron - Phase 3)

---

## 🧪 Test Plan - Phase 2A (Real-time Alerts)

### Förberedelser
1. ✅ Server körs på http://localhost:3001
2. ✅ Migration kördes framgångsrikt
3. 🔔 Firebase notifications aktiverade

---

### TEST 1: Skapa Projekt med Alert Settings

**Steg:**
1. Gå till http://localhost:3001/dashboard/projects/new
2. Fyll i projektuppgifter:
   - Namn: "Test Alert Project"
   - Starttid: 07:00
   - Sluttid: 16:00
3. Scrolla ner till **"Alert-inställningar"** sektionen
4. Verifiera att alla fält visas:
   - ✅ Arbetsdag (start/slut)
   - ✅ Real-time notifieringar (2 switches)
   - ✅ Påminnelser till arbetare (2 switches med minuter)
   - ✅ Varningar (2 switches med minuter)
5. Låt följande vara aktiverat (default):
   - ✅ Notifiera vid check-in
   - ✅ Notifiera vid check-out
6. Spara projektet

**Förväntat resultat:**
- ✅ Projekt skapas utan fel
- ✅ Redirects till projekt-sidan
- ✅ `alert_settings` sparas i databasen

---

### TEST 2: Check-in Notification (Worker → Admin/Foreman)

**Setup:**
- Du behöver 2 användare:
  - **User A**: Worker (den som checkar in)
  - **User B**: Admin eller Foreman (får notisen)

**Steg:**
1. Logga in som **User B (Admin/Foreman)**
2. Aktivera notiser på http://localhost:3001/dashboard/settings/notifications
3. Öppna en ny inkognito-fönster
4. Logga in som **User A (Worker)**
5. Gå till http://localhost:3001/dashboard/time
6. Klicka **"Checka in"** på "Test Alert Project"
7. Välj projekt, fas (optional)
8. Klicka "Starta tid"

**Förväntat resultat:**
- ✅ User A checkar in framgångsrikt
- ✅ User B får en notis inom 3 sekunder:
  ```
  👷 [User A Namn] checkade in
  På projekt: Test Alert Project
  Tid: 14:23
  ```
- ✅ Klicka på notisen → går till projektsidan

---

### TEST 3: Check-out Notification (Worker → Admin/Foreman)

**Steg:**
1. (Fortsätt från TEST 2)
2. Som **User A (Worker)**
3. Gå till http://localhost:3001/dashboard/time
4. Hitta den incheckade tiden
5. Klicka "Checka ut"
6. Confirm check-out

**Förväntat resultat:**
- ✅ User A checkar ut framgångsrikt
- ✅ User B får en notis inom 3 sekunder:
  ```
  🏠 [User A Namn] checkade ut
  På projekt: Test Alert Project
  Tid: 16:05
  Arbetat: 1h 42min
  ```
- ✅ Klicka på notisen → går till projektsidan

---

### TEST 4: View Alert Settings on Project Page

**Steg:**
1. Logga in som Admin/Foreman
2. Gå till projektsidan: http://localhost:3001/dashboard/projects/[project-id]
3. Scrolla ner under "Project Summary"
4. Se "Alert-inställningar" kortet

**Förväntat resultat:**
- ✅ Alert settings visas med alla 6 alert-typer
- ✅ Aktuell status visas (Aktiverad/Inaktiverad)
- ✅ Tider visas (start/slut, påminnelser)
- ✅ "Redigera" knapp syns i övre högra hörnet

---

### TEST 5: Edit Project Alert Settings

**Steg:**
1. På projektsidan, i "Alert-inställningar" kortet
2. Klicka "Redigera" knappen (övre högra hörnet)
3. En dialog öppnas med alla alert settings
4. Ändra:
   - Starttid till 08:00
   - Sluttid till 17:00
   - Avaktivera "Notifiera vid check-in"
   - Aktivera "Varna om sen check-in" med 15 min
5. Klicka "Spara ändringar"

**Förväntat resultat:**
- ✅ Dialog öppnas med editerbart formulär
- ✅ Sparar utan fel
- ✅ Dialog stängs
- ✅ Sidan refresh:as och visar nya inställningar
- ✅ Toast: "Alert-inställningar uppdaterade"

---

### TEST 6: Verify No Notification When Disabled

**Steg:**
1. Efter TEST 5 (check-in notis är avaktiverad)
2. Som Worker, checka in på projektet igen
3. Verifiera att Admin/Foreman INTE får någon notis

**Förväntat resultat:**
- ✅ Check-in fungerar
- ❌ INGEN notis skickas till admin/foreman
- ✅ Check-out notis fungerar fortfarande (om aktiverad)

---

### TEST 7: Create New Project with Custom Alert Settings

**Steg:**
1. Gå till http://localhost:3001/dashboard/projects/new
2. Fyll i projekt-info
3. Scrolla till "Alert-inställningar"
4. Sätt custom times (t.ex. 06:00 start, 15:00 slut)
5. Aktivera "Check-in påminnelse" med 30 min före
6. Spara projekt
7. Gå till projektsidan
8. Verifiera att alert settings sparades korrekt

**Förväntat resultat:**
- ✅ Projekt skapas med custom alert settings
- ✅ Settings visas korrekt på projektsidan
- ✅ Påminnelser beräknas rätt (t.ex. 05:30 för 30 min före 06:00)

---

## 🔍 Debugging

### Check Server Logs
Om notiser inte kommer, kolla terminalen för:

```
✅ Sent check-in notification for [Namn] on [Projekt]
```

eller

```
❌ Firebase Admin SDK not configured
```

### Check Firebase Token
1. Gå till http://localhost:3001/dashboard/settings/notifications
2. Öppna DevTools Console
3. Kolla att det finns ett FCM Token
4. Om inte, klicka "Aktivera notiser" igen

### Check Database
```sql
-- Verify alert_settings
SELECT id, name, alert_settings 
FROM projects 
WHERE name = 'Test Alert Project';

-- Should return:
{
  "work_day_start": "07:00",
  "work_day_end": "16:00",
  "notify_on_checkin": true,
  "notify_on_checkout": true,
  ...
}
```

---

## 📊 Success Criteria (Phase 2A)

- [x] Database migration kördes utan fel
- [x] Alert settings visas i projekt-formuläret
- [x] Projekt kan skapas med alert settings
- [x] Projekt kan redigeras för att ändra alerts
- [ ] Check-in trigger notis till admin/foreman
- [ ] Check-out trigger notis till admin/foreman
- [ ] Notiser kan avaktiveras per projekt
- [ ] Notiser respekterar user preferences

---

## 🚀 Next Steps (Phase 2B - Cron Jobs)

**Kommer senare:**
- ⏰ Check-in påminnelser (15 min före start)
- ⏰ Check-out påminnelser (15 min före slut)
- ⏰ Sen check-in varningar (X min efter start)
- ⏰ Glömt check-out varningar (X min efter slut)

Dessa kräver cron jobs som körs periodiskt.

---

## 📝 Notes

- Real-time alerts fungerar direkt via API
- Scheduled alerts (cron) implementeras i Phase 3
- Alert settings är per projekt (inte globalt)
- Endast admin + foreman får alerts
- Workers får påminnelser (när cron är implementerat)

**Status:** Ready for testing! 🚀

