# Registreringsflöde & Email-verifiering

## 📋 Översikt

Applikationen använder ett tvåstegs registreringsflöde med email-verifiering för säkerhet och bättre användarupplevelse.

## 🔄 Flöde

### Steg 1: Grundläggande användarinformation
**Sida:** `/sign-up` (Steg 1)

Användaren fyller i:
- Namn
- Email
- Lösenord

Data sparas i `localStorage` för att kunna återupptas.

### Steg 2: Företagsinformation
**Sida:** `/sign-up` (Steg 2)

Användaren fyller i:
- Företagets namn (obligatorisk)
- Organisationsnummer (obligatorisk)
- Telefonnummer (valfri)
- Fullständig adress (valfri)

### Steg 3: Email-verifiering
**Sida:** `/verify-email?email=...`

- Användaren omdirigeras hit efter slutförd registrering
- Ett verifieringsmail skickas till användarens email
- Sidan visar instruktioner och väntemeddelande
- Användaren klickar på länken i mailet

### Steg 4: Välkomstsida
**Sida:** `/welcome`

- Efter verifiering omdirigeras användaren hit
- Välkomstmeddelande visas
- Förklaring av nästa steg
- Knapp för att gå till Dashboard

## 🔐 Säkerhet & Implementation

### API: `/api/auth/complete-signup`

Detta API hanterar hela registreringsprocessen atomärt:

1. **Validering och kontroller**
   - Kontrollerar att alla obligatoriska fält är ifyllda
   - Validerar lösenordslängd (minst 8 tecken)
   - Kontrollerar om email redan finns i `profiles` tabellen
   - Kontrollerar om organisationsnummer redan finns (unik constraint)
   - Returnerar tydliga felmeddelanden för användaren

2. **Skapar användare** med `supabaseClient.auth.signUp()`
   - Skickar automatiskt verifieringsmail via Supabase
   - `email_confirm: false` (kräver verifiering)
   - Sparar användarens namn i `user_metadata`
   - `emailRedirectTo` sätts till `/api/auth/callback`

3. **Genererar unikt slug** från företagsnamn
   - Konverterar till lowercase
   - Ersätter specialtecken och mellanslag med bindestreck
   - Kontrollerar om slug redan finns och gör den unik om nödvändigt

4. **Skapar organisation** automatiskt
   - Sparar alla företagsdetaljer
   - Inkluderar genererad slug
   - Kringgår RLS med service_role
   - **Unique constraint på `org_number`** - förhindrar duplicerade organisationer

5. **Skapar profil med retry-logik**
   - Väntar 500ms för att ge databas-trigger tid att köra
   - Kontrollerar om profil redan existerar (skapad av trigger)
   - Om profil saknas: använder `upsert` med retry-logik (3 försök)
   - Hanterar foreign key constraint-fel med väntetider mellan försök
   - Innehåller `full_name` och `email`

6. **Skapar medlemskap med retry-logik**
   - Retry-logik (3 försök) för att hantera timing-problem
   - Kopplar användaren till organisationen
   - Sätter rollen till 'admin'
   - Väntar mellan försök om foreign key-fel uppstår

7. **Skickar välkomstmail** (via Resend)
   - Skickas i bakgrunden (väntar inte på svar)
   - Använder `WelcomeEmail` template
   - Innehåller användarnamn, organisationsnamn och dashboard-länk
   - Loggar fel men stoppar inte registreringsprocessen om email misslyckas

### Auth Callback: `/api/auth/callback`

- Tar emot verifieringskod från email
- Skapar session för användaren
- Omdirigerar till `/welcome` (standard)
- Kan ta emot `next` parameter för anpassad redirect

## 🧹 Cleanup & Återupptagning

### localStorage-nycklar:
- `signup_step1` - Användarinformation från steg 1
- `signup_step2` - Företagsinformation från steg 2
- `signup_userId` - Användar-ID (sparas för framtida användning)

Dessa rensas automatiskt vid:
- Slutförd registrering
- När användaren når welcome-sidan

### Återupptagning av registrering:

Om användaren lämnar sidan mitt i processen kan de:
1. Gå tillbaka till `/sign-up`
2. Data från `localStorage` laddas automatiskt
3. Fortsätt från där de slutade

## 📧 Email-konfiguration

### Supabase Email (Verifieringsmail)

Supabase Email Settings krävs:
- SMTP konfigurerad eller Supabase default
- Email templates konfigurera för:
  - **Confirm signup** - Verifieringsmail
  - **Magic link** - Magic link inloggning (om aktiverad)

**Verifieringsmail innehåller:**
- Välkomsttext
- Länk till: `{site_url}/api/auth/callback?token={token}`
- Instruktioner
- Supportinformation

### Resend Email (Välkomstmail)

**Environment Variables krävs i Vercel:**
- `RESEND_API_KEY` - API-nyckel från Resend
- `FROM_EMAIL` - Avsändaradress (default: `EP Tracker <noreply@eptracker.app>`)
- `REPLY_TO_EMAIL` - Reply-to adress (default: `support@eptracker.app`)

**Välkomstmail skickas automatiskt efter lyckad registrering:**
- Innehåller personlig hälsning med användarnamn
- Visar organisationsnamn
- Lista över nyckelfunktioner
- Länk till dashboard
- Supportkontaktinformation

**Email-template:** `lib/email/templates/welcome.tsx`
- Optimerad för desktop email-klienter (Outlook, Apple Mail, etc.)
- Responsiv design
- Kompatibel med alla större email-leverantörer

## 🐛 Felsökning

### Användare kan inte logga in:

Kontrollera att email är verifierad:

```sql
SELECT 
  email, 
  email_confirmed_at, 
  confirmed_at 
FROM auth.users 
WHERE email = 'user@example.com';
```

För att manuellt bekräfta email:

```sql
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'user@example.com'
AND email_confirmed_at IS NULL;
```

### Verifieringsmail kommer inte fram:

1. Kontrollera Supabase email logs
2. Kolla spam-mappen
3. Verifiera SMTP-inställningar i Supabase Dashboard
4. Testa med en annan email-provider

### RLS errors vid registrering:

Kör SQL-scriptet:
```bash
# Applicera fix-signup-complete.sql i Supabase Studio
```

Detta fixar:
- Organizations tabell struktur
- RLS policies för profiles och organizations
- Service role permissions
- Database triggers

### Profilskapande-fel ("Kunde inte skapa profil"):

Om profilskapande misslyckas:
1. Kontrollera att `handle_new_user()` trigger finns och fungerar:
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

2. Kontrollera att användaren finns i `auth.users`:
```sql
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

3. Koden har nu retry-logik (3 försök) men om problemet kvarstår:
   - Kontrollera foreign key constraint: `profiles_id_fkey`
   - Verifiera att trigger-funktionen har `SECURITY DEFINER`
   - Kolla Supabase logs för detaljerade felmeddelanden

### Organisationsnummer redan finns:

Om användaren får "Organisationsnummer X finns redan":
- Systemet har en **unique constraint** på `organizations.org_number`
- Kontrollera vilken organisation som har numret:
```sql
SELECT id, name, org_number 
FROM organizations 
WHERE org_number = '559465-6943';
```
- Om organisationen är från ett tidigare misslyckat registreringsförsök, radera den först

## ✅ Testplan

### Manuell test:

1. **Lyckad registrering:**
   - Fyll i alla fält korrekt
   - Verifiera att email skickas
   - Klicka på länk i email
   - Verifiera omdirigering till `/welcome`
   - Klicka "Gå till Dashboard"
   - Verifiera att användaren är inloggad

2. **Återupptagning:**
   - Starta registrering
   - Stäng flik mitt i steg 2
   - Öppna `/sign-up` igen
   - Verifiera att data finns kvar

3. **Felhantering:**
   - Testa med ogiltig email
   - Testa med svagt lösenord
   - Testa med befintlig email
   - Verifiera felmeddelanden

4. **Email-verifiering:**
   - Testa att klicka på gammal verifieringslänk
   - Testa att klicka på länk flera gånger
   - Testa utgången länk (>24h)

## 📊 Databasstruktur

### Tabeller involverade:

1. **auth.users** (Supabase Auth)
   - Email, lösenord, metadata
   - email_confirmed_at datum

2. **profiles** (Vår tabell)
   - user_id (FK till auth.users)
   - full_name
   - created_at

3. **organizations** (Vår tabell)
   - name, org_number (UNIQUE constraint)
   - slug (URL-vänlig version av name, UNIQUE)
   - phone, address, postal_code, city
   - campaign_code (valfritt)
   - created_at

4. **memberships** (Vår tabell)
   - user_id, org_id
   - role ('admin' för först registrerade)
   - is_active

## 🔄 Recent Improvements (2026-01-09)

✅ **Välkomstmail-funktionalitet**
- Automatisk skickning av välkomstmail via Resend efter registrering
- Desktop-kompatibel email-template (Outlook, Apple Mail)
- Personlig hälsning med användarnamn och organisationsnamn

✅ **Förbättrad profilskapande**
- Retry-logik (3 försök) för att hantera timing-problem
- Använder `upsert` istället för `insert` för att undvika konflikter
- Väntar efter signup för att ge databas-trigger tid att köra
- Bättre hantering av foreign key constraint-fel

✅ **Unik organisationsnummer-kontroll**
- Unique constraint på `organizations.org_number`
- API-validering innan organisation skapas
- Tydliga felmeddelanden om duplicerade organisationsnummer

✅ **Förbättrad email-validering**
- Tidig kontroll av befintlig email i `profiles` tabellen
- Tydliga felmeddelanden för användaren
- Bättre felhantering vid registrering

## 🔄 Future Improvements

- [ ] Magic link som alternativ till lösenord
- [ ] Social login (Google, Microsoft)
- [ ] Multi-faktor autentisering (MFA)
- [ ] Email-ändring med reverifiering
- [ ] Onboarding wizard efter registrering
- [ ] Företagsverifiering via org-nummer API
- [ ] Email-bekräftelse vid organisationsnummer-ändring

