# Supabase Invite Configuration

## Problem
När en admin bjuder in en ny användare, ska användaren få ett mail där de kan **sätta sitt lösenord**. Men mailet kanske länkar direkt till login-sidan istället.

## Lösning: Konfigurera Email Templates i Supabase

### 1. Gå till Supabase Dashboard

1. Öppna ditt projekt: https://supabase.com/dashboard/project/{PROJECT_ID}
2. Gå till **Authentication** → **Email Templates**

### 2. Konfigurera "Invite user" template

Hitta templaten som heter **"Invite user"** och se till att den innehåller:

```html
<h2>Du har blivit inbjuden till {{ .SiteURL }}</h2>

<p>Någon har bjudit in dig att gå med i EP-Tracker.</p>

<p>Klicka på länken nedan för att sätta ditt lösenord och komma igång:</p>

<p><a href="{{ .ConfirmationURL }}">Acceptera inbjudan och sätt lösenord</a></p>

<p>Eller kopiera och klistra in denna URL i din webbläsare:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Om du inte förväntade dig detta mail, kan du ignorera det.</p>
```

### 3. Kontrollera Redirect URLs

I **Authentication** → **URL Configuration**:

1. **Site URL:** `http://localhost:3000` (development) eller din produktions-URL
2. **Redirect URLs:** Lägg till:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/welcome`
   - Din produktions-URL + `/api/auth/callback`
   - Din produktions-URL + `/welcome`

### 4. Test Email Template

Du kan testa email-templaten genom att:

1. I Supabase Dashboard: **Authentication** → **Email Templates**
2. Klicka på "Send test email" under "Invite user" template
3. Ange din egen email-adress
4. Verifiera att mailet innehåller en länk som låter dig sätta lösenord

## Hur det fungerar

### Invite Flow:

```
1. Admin klickar "Invite User" i /dashboard/settings/users
   ↓
2. API: POST /api/users/invite
   ↓
3. Supabase: admin.inviteUserByEmail()
   ↓
4. Supabase skickar "Invite user" email
   ↓
5. Användaren klickar länken i mailet
   ↓
6. Supabase visar "Set Password" sida (hostad av Supabase)
   ↓
7. Användaren sätter lösenord och klickar "Set Password"
   ↓
8. Redirect till: /api/auth/callback?code=XXX&next=/welcome
   ↓
9. Callback exchangar code för session
   ↓
10. Redirect till: /welcome (välkomstsida)
    ↓
11. Användaren klickar "Gå till Dashboard"
    ↓
12. Dashboard laddas med full åtkomst
```

## Vanliga Problem

### Problem: Länken går till login istället för "set password"

**Orsak:** Email-templaten använder fel URL-variabel.

**Lösning:** Se till att templaten använder `{{ .ConfirmationURL }}` (inte `{{ .SiteURL }}`)

### Problem: "Invalid redirect URL" error

**Orsak:** Redirect URL:en är inte whitelistad i Supabase.

**Lösning:** 
1. Gå till **Authentication** → **URL Configuration**
2. Lägg till `http://localhost:3000/api/auth/callback` under "Redirect URLs"
3. För production, lägg till din production URL

### Problem: Användaren får "link expired" error

**Orsak:** Invite-länken har gått ut (default: 24 timmar).

**Lösning:**
1. Be admin skicka en ny inbjudan
2. Eller justera expiration time i Supabase:
   - **Authentication** → **Email Templates** → "Invite user"
   - Scrolla ner till "Token expiration"
   - Öka från 24h till 7 dagar (eller valfri tid)

## Custom Email Server (Optional)

Om du vill använda din egen SMTP-server istället för Supabase's:

1. **Authentication** → **Email**
2. Aktivera "Custom SMTP"
3. Fyll i dina SMTP-uppgifter
4. Testa connection

**Fördelar:**
- Bättre deliverability
- Anpassade "from" adresser
- Ingen rate limiting från Supabase

## Testing Invite Flow

### 1. Testa lokalt:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test invite API
curl -X POST http://localhost:3000/api/users/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "email": "test@example.com",
    "role": "worker",
    "full_name": "Test Worker"
  }'
```

### 2. Kontrollera email:

- Kolla inbox för `test@example.com`
- Verifiera att mailet innehåller "Sätt lösenord"-länk
- Klicka länken och testa flödet

### 3. Verifiera redirect:

- Efter att sätta lösenord, ska du redirectas till `/welcome`
- Välkomstsidan ska visa rätt roll-baserat innehåll
- Dashboard ska vara tillgänglig

## Production Checklist

Innan deploy till production:

- [ ] Email templates är anpassade och testade
- [ ] Production redirect URLs är whitelistade
- [ ] Custom SMTP är konfigurerad (om applicable)
- [ ] Invite flow är testad end-to-end
- [ ] Email deliverability är verifierad
- [ ] Rate limits är konfigurerade

## Support

Om invite-flödet fortfarande inte fungerar:

1. **Kontrollera Supabase Logs:**
   - Dashboard → **Logs** → Filter på "auth"
   - Leta efter invite-relaterade errors

2. **Testa manuellt:**
   - Skapa en test-användare direkt i Supabase Dashboard
   - **Authentication** → **Users** → "Invite user"
   - Se vilket mail som skickas

3. **Verifiera Environment Variables:**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Krävs för admin operations
   ```

## Summary

Invite-flödet kräver korrekt Supabase-konfiguration för att fungera. Huvudpunkterna:

1. **Email template måste använda `{{ .ConfirmationURL }}`**
2. **Redirect URLs måste vara whitelistade**
3. **Service role key måste finnas i .env.local**
4. **Test invite flow innan production deploy**




