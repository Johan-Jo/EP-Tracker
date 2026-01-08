# Test Guide: Projektarkiveringsfunktion

## 🎯 Testplan för produktion

### Steg 1: Verifiera Migration

Innan du testar funktionen, måste migrationen köras i Supabase:

1. **Gå till Supabase Dashboard:**
   - Öppna: https://app.supabase.com
   - Välj ditt projekt

2. **Kör Migration:**
   - Gå till: **SQL Editor**
   - Skapa ny query
   - Kopiera innehållet från: `supabase/migrations/20251201000001_add_project_archive_flag.sql`
   - Klicka **Run** (eller F5)

3. **Verifiera att kolumner finns:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'projects' 
   AND column_name IN ('is_archived', 'archived_at', 'archived_by');
   ```

---

## ✅ Test Checklist

### Test 1: Verifiera att knapparna finns

1. **Logga in som admin** på produktion
   - URL: https://eptracker.app
   
2. **Gå till ett projekt:**
   - Navigera till `/dashboard/projects`
   - Välj ett aktivt projekt (INTE arkiverat)
   - Öppna projektdetaljer

3. **Verifiera UI:**
   - [ ] Se "Arkivera"-knapp (för admin)
   - [ ] Knappen har arkiv-ikon
   - [ ] Knappen är synlig i projektets actions

### Test 2: Arkivera projekt (Admin)

1. **Klicka på "Arkivera"-knappen**
   - [ ] Dialog öppnas med bekräftelse
   - [ ] Dialog visar projektets namn
   - [ ] Varning om att projektet döljs

2. **Bekräfta arkivering:**
   - [ ] Klicka "Arkivera" i dialogen
   - [ ] Success-toast visas: "Projektet har arkiverats"
   - [ ] Omdirigering till `/dashboard/projects`
   - [ ] Projektet är INTE synligt i standardlistan

3. **Verifiera i databasen:**
   ```sql
   SELECT id, name, is_archived, archived_at, archived_by 
   FROM projects 
   WHERE id = 'ditt-projekt-id';
   ```
   - [ ] `is_archived = true`
   - [ ] `archived_at` har timestamp
   - [ ] `archived_by` har user_id

### Test 3: Filtrera arkiverade projekt

1. **Gå till projektlistan:**
   - URL: `/dashboard/projects`

2. **Använd filter:**
   - [ ] Se "Arkiverade" i status-dropdown
   - [ ] Välj "Arkiverade"
   - [ ] Det arkiverade projektet visas i listan

### Test 4: Återaktivera projekt (Admin)

1. **Gå till arkiverat projekt:**
   - Filtrera på "Arkiverade" projekt
   - Öppna det arkiverade projektet

2. **Verifiera UI:**
   - [ ] Se "Återaktivera"-knapp (för admin)
   - [ ] Se badge/indikator att projektet är arkiverat

3. **Klicka "Återaktivera":**
   - [ ] Dialog öppnas med bekräftelse
   - [ ] Klicka "Återaktivera" i dialogen
   - [ ] Success-toast: "Projektet har återaktiverats"
   - [ ] Projektet är synligt i aktiva projekt igen

4. **Verifiera i databasen:**
   ```sql
   SELECT is_archived, archived_at, archived_by 
   FROM projects 
   WHERE id = 'ditt-projekt-id';
   ```
   - [ ] `is_archived = false`
   - [ ] `archived_at = NULL`
   - [ ] `archived_by = NULL`

### Test 5: Behörigheter (Foreman/Worker)

1. **Logga in som Foreman eller Worker**

2. **Gå till ett projekt:**
   - [ ] Se INTE "Arkivera"-knappen
   - [ ] Endast admin kan arkivera

3. **Försök komma åt archive API:**
   - [ ] Få 403 Forbidden om man försöker arkivera

### Test 6: Arkiverade projekt exkluderas

1. **Efter arkivering, verifiera att:**
   - [ ] Projektet döljs från planeringssystemet
   - [ ] Projektet döljs från dropdowns (tidrapporter, material, etc.)
   - [ ] Projektet döljs från aktiva projektlistor (standardvy)

---

## 🔍 API Test (Alternativt)

Om du vill testa API:et direkt:

### Arkivera projekt:
```bash
curl -X POST https://eptracker.app/api/projects/[PROJECT_ID]/archive \
  -H "Cookie: [dina-cookies]" \
  -H "Content-Type: application/json"
```

### Återaktivera projekt:
```bash
curl -X DELETE https://eptracker.app/api/projects/[PROJECT_ID]/archive \
  -H "Cookie: [dina-cookies]" \
  -H "Content-Type: application/json"
```

---

## ⚠️ Kända Begränsningar

1. **Endast Admin** kan arkivera/återaktivera
2. Arkiverade projekt **döljs** från aktiva listor
3. Data **bevaras** för historisk referens
4. Migrationen måste köras **innan** funktionen fungerar

---

## 📝 Testresultat

Fyll i efter testning:

- [ ] Migration kördes framgångsrikt
- [ ] Arkivera-knapp syns för admin
- [ ] Arkivering fungerar
- [ ] Återaktivering fungerar
- [ ] Behörigheter fungerar korrekt
- [ ] Filtrering fungerar
- [ ] Projekt döljs korrekt

---

## 🐛 Om något inte fungerar

1. **Kontrollera migration:**
   - Kör migrationen igen i Supabase
   - Verifiera att kolumner finns

2. **Kontrollera logs:**
   - Vercel Dashboard → Deployment → Functions Logs
   - Supabase Dashboard → Logs → Postgres Logs

3. **Kontrollera behörigheter:**
   - Användaren måste vara admin
   - Projektet måste tillhöra användarens organisation

4. **Testa lokalt:**
   - Kör migrationen lokalt
   - Testa med `npm run dev`










