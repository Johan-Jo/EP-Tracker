# Fix för Magic Link Inloggningsproblem

## Problem
Magic link-inloggningen skickar användaren tillbaka till login-sidan istället för att logga in dem.

## Orsaker
1. **Felaktiga Redirect URLs i Supabase** - Den vanligaste orsaken
2. **Cookie-problem** - Sessionen sparas inte korrekt
3. **Rate limiting** - För många OTP-försök

## Lösning: Steg för Steg

### Steg 1: Kontrollera Redirect URLs i Supabase (VIKTIGAST)

1. Gå till din Supabase Dashboard: https://supabase.com/dashboard
2. Välj ditt projekt (ngmqqtryojmyeixicekt)
3. Gå till **Authentication** → **URL Configuration**
4. Kontrollera följande inställningar:

#### Site URL
```
http://localhost:3000
```
(eller din produktions-URL om du kör i produktion)

#### Redirect URLs
Lägg till **ALLA** dessa URLs (en per rad):
```
http://localhost:3000/**
http://localhost:3000/api/auth/callback
http://127.0.0.1:3000/**
http://127.0.0.1:3000/api/auth/callback
```

Om du kör i produktion, lägg även till:
```
https://dindomän.se/**
https://dindomän.se/api/auth/callback
```

5. Klicka **Save** längst ner på sidan

### Steg 2: Testa Magic Link Flow

1. Starta utvecklingsservern:
```bash
npm run dev
```

2. Öppna terminalen och håll koll på loggarna

3. Gå till http://localhost:3000/sign-in

4. Ange din e-postadress och klicka på "Skicka inloggningslänk"

5. Kontrollera loggarna för dessa meddelanden:
```
=== MAGIC LINK REQUEST ===
[MAGIC LINK] Sending magic link to: din@email.se
[MAGIC LINK] Request origin: http://localhost:3000
[MAGIC LINK] Redirect URL: http://localhost:3000/api/auth/callback
```

6. Öppna din e-post och klicka på magic link

7. Du ska nu se dessa loggar:
```
=== AUTH CALLBACK START ===
[AUTH CALLBACK] Code present: true
[AUTH CALLBACK] Attempting to exchange code for session...
[AUTH CALLBACK] Exchange result: { hasSession: true, hasUser: true }
=== AUTH CALLBACK SUCCESS ===
```

### Steg 3: Felsökning

#### Problem: "link_expired" eller "already been used"
**Lösning**: Magic links kan bara användas en gång och expirerar efter 1 timme. Begär en ny länk.

#### Problem: "auth_error" eller "auth_callback_error"  
**Lösning**: 
1. Kontrollera att redirect URLs är korrekt konfigurerade i Supabase
2. Kolla loggarna för mer specifik information
3. Kontrollera att du använder samma domän (localhost vs 127.0.0.1)

#### Problem: Ingen felmeddelande, men hamnar tillbaka på login-sidan
**Lösning**:
1. Öppna DevTools (F12) → Application → Cookies
2. Kontrollera att dessa cookies finns:
   - `sb-<project-ref>-auth-token`
   - `sb-<project-ref>-auth-token-code-verifier`
3. Om cookies saknas, kan det vara:
   - Browser-inställningar blockerar cookies
   - Secure/SameSite cookie-problem (kontrollera HTTPS)
   - Supabase redirect URL är felkonfigurerad

### Steg 4: Rate Limiting

I `supabase/config.toml` ser jag att rate limit för e-post är satt till 2 per timme:
```toml
[auth.rate_limit]
email_sent = 2
```

Om du testar mycket, kan du tillfälligt öka detta värde för lokal utveckling.

## Debugging-tips

### Kontrollera Supabase Logs
1. Gå till Supabase Dashboard → Logs → Auth
2. Kolla efter felmeddelanden relaterade till OTP och magic links

### Kontrollera Browser Console
Öppna DevTools och kolla efter JavaScript-fel i konsolen.

### Kontrollera Network Tab
1. Öppna DevTools → Network
2. Klicka på magic link
3. Leta efter request till `/api/auth/callback`
4. Kontrollera:
   - Status code (ska vara 307 Temporary Redirect)
   - Response headers (ska sätta cookies)
   - Redirect location

## Vanliga Misstag

1. ❌ Glömmer att lägga till `**` efter domänen i redirect URLs
2. ❌ Använder http://localhost:3000 men länkar går till http://127.0.0.1:3000
3. ❌ Har gamla cookies kvar - rensa browser cache/cookies
4. ❌ Rate limit nådd - vänta 1 timme eller öka rate limit
5. ❌ Klickar på samma magic link flera gånger

## Ytterligare Förbättringar

### 1. Lägg till bättre felmeddelanden
Se till att användaren förstår vad som gick fel:

```typescript
// I sign-in/page.tsx, lägg till specifika felmeddelanden:
if (errorParam === 'link_expired') {
  setError('Länken har gått ut eller redan använts. Begär en ny inloggningslänk.');
} else if (errorParam === 'auth_callback_error') {
  setError('Kunde inte logga in. Kontrollera att du klickade på rätt länk.');
}
```

### 2. Lägg till loading state
Visa användaren att något händer när de klickar på länken.

### 3. Använd Supabase Email Templates
Anpassa e-postmallen för magic links i Supabase Dashboard → Authentication → Email Templates.

## Support

Om problemet kvarstår efter dessa steg:
1. Kontrollera loggarna i terminalen
2. Kontrollera Supabase Dashboard → Logs
3. Kontrollera browser DevTools → Console och Network
4. Ta en skärmdump av felmeddelandet

## Snabb Checklista

- [ ] Redirect URLs konfigurerade i Supabase Dashboard
- [ ] Site URL matchar din utvecklings-URL
- [ ] Browser cookies är aktiverade
- [ ] Ingen rate limiting aktiv
- [ ] Samma domän används överallt (localhost eller 127.0.0.1)
- [ ] Magic link är färsk (< 1 timme gammal)
- [ ] Magic link har inte använts tidigare
- [ ] Dev server körs på rätt port (3000)

