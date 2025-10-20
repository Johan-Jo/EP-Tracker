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

1. **Skapar användare** med `admin.createUser`
   - `email_confirm: false` (kräver verifiering)
   - Sparar användarens namn i `user_metadata`

2. **Skapar organisation** automatiskt
   - Sparar alla företagsdetaljer
   - Kringgår RLS med service_role

3. **Skapar medlemskap**
   - Kopplar användaren till organisationen
   - Sätter rollen till 'admin'

4. **Skapar profil** (via databas-trigger)
   - Automatisk skapande när användare autentiseras
   - Innehåller `full_name` från `user_metadata`

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

Supabase Email Settings krävs:
- SMTP konfigurerad eller Supabase default
- Email templates konfigurera för:
  - **Confirm signup** - Verifieringsmail
  - **Magic link** - Magic link inloggning (om aktiverad)

### Verifieringsmail innehåller:

- Välkomsttext
- Länk till: `{site_url}/api/auth/callback?token={token}`
- Instruktioner
- Supportinformation

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
   - name, org_number
   - phone, address, postal_code, city
   - created_at

4. **memberships** (Vår tabell)
   - user_id, org_id
   - role ('admin' för först registrerade)
   - is_active

## 🔄 Future Improvements

- [ ] Magic link som alternativ till lösenord
- [ ] Social login (Google, Microsoft)
- [ ] Multi-faktor autentisering (MFA)
- [ ] Email-ändring med reverifiering
- [ ] Onboarding wizard efter registrering
- [ ] Företagsverifiering via org-nummer API

