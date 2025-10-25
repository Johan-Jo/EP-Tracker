# FIX: Magic Link Redirect Problem (redirect_to är fel)

## Problemet vi hittat

Din magic link URL visar:
```
redirect_to=https://eptracker.app/
```

Men det SKA vara:
```
redirect_to=https://eptracker.app/api/auth/callback
```

## Varför händer detta?

Supabase ignorerar `emailRedirectTo` parametern och använder "Site URL" från Supabase Dashboard istället.

## LÖSNING 1: Lägg till Environment Variable (Rekommenderat)

### I Vercel (Production)

1. Gå till: https://vercel.com/dashboard
2. Välj ditt EP-Tracker projekt
3. Gå till **Settings → Environment Variables**
4. Lägg till en NY variabel:
   - **Name**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://eptracker.app`
   - **Environment**: Production ✓
5. Klicka **Save**
6. **VIKTIGT**: Gör en ny deployment (push till git eller klicka "Redeploy" i Vercel)

### I din lokala .env.local

Lägg till denna rad i din `.env.local` fil:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## LÖSNING 2: Ändra Supabase Configuration (Alternativt)

### Metod A: Ändra Site URL till callback URL

1. Gå till Supabase Dashboard → Authentication → URL Configuration
2. Ändra **Site URL** från:
   ```
   https://eptracker.app
   ```
   Till:
   ```
   https://eptracker.app/api/auth/callback
   ```
3. Spara

**⚠️ VARNING**: Detta kan påverka andra auth flows (OAuth, password reset, etc.)

### Metod B: Lägg till URL Pattern i Email Template

1. Gå till: Authentication → Email Templates → Magic Link
2. Leta efter länken i template som använder `{{ .ConfirmationURL }}`
3. Om template har en hårdkodad URL, ta bort den och använd:
   ```html
   <a href="{{ .ConfirmationURL }}">Logga in</a>
   ```

## TESTA ÄNDRINGARNA

### Steg 1: Efter du lagt till NEXT_PUBLIC_SITE_URL i Vercel

1. Vänta tills Vercel deployment är klar (ca 2-3 min)
2. Gå till https://eptracker.app/sign-in
3. Begär en NY magic link
4. Öppna din email
5. Högerklicka på "Logga in" knappen → "Copy link address"
6. Kontrollera att URL:en nu innehåller:
   ```
   redirect_to=https://eptracker.app/api/auth/callback
   ```

### Steg 2: Testa inloggning

1. Klicka på länken i emailet
2. Du ska nu komma till `/api/auth/callback` först
3. Sedan redirectas du till `/dashboard` eller `/complete-setup`
4. ✅ Du är inloggad!

## DEBUG: Kontrollera vad som skickas

Efter att du deployat med environment variabeln, begär en ny magic link och kolla server logs i Vercel:

1. Gå till: Vercel Dashboard → ditt projekt → Deployments
2. Klicka på senaste deployment → Runtime Logs
3. Leta efter:
   ```
   === MAGIC LINK REQUEST ===
   [MAGIC LINK] Site URL from env: https://eptracker.app
   [MAGIC LINK] Final redirect URL: https://eptracker.app/api/auth/callback
   ```

Om `Site URL from env` är `undefined`, så har variabeln inte laddats korrekt.

## Checklist

- [ ] Lagt till `NEXT_PUBLIC_SITE_URL` i Vercel Environment Variables
- [ ] Redeployat i Vercel (viktigt!)
- [ ] Lagt till `NEXT_PUBLIC_SITE_URL` i lokal `.env.local`
- [ ] Begärt en NY magic link (gamla fungerar inte)
- [ ] Verifierat att `redirect_to` URL:en är korrekt i emailen
- [ ] Testat att klicka på länken
- [ ] Kan logga in! 🎉

## Om det FORTFARANDE inte fungerar

### Kontrollera Supabase Site URL

1. Gå till: Authentication → URL Configuration
2. Scrolla upp till **Site URL**
3. Vad står det där? (ska vara `https://eptracker.app`)
4. Om det står något annat (t.ex. `https://eptracker.app/api/auth/callback`), ändra tillbaka till `https://eptracker.app`

### Kontrollera Supabase Auth Hook

Det kan finnas en custom auth hook som override:ar redirect URL:

1. I Supabase Dashboard, gå till: Database → Functions
2. Leta efter funktioner som börjar med `auth_` eller innehåller `hook`
3. Om det finns en `custom_access_token` hook eller liknande, kontrollera den

### Kontrollera Email Rate Limit

Om du har begärt för många magic links (fler än 2 per timme enligt din config), kan Supabase använda en cached redirect URL:

1. Vänta 1 timme
2. Begär en helt ny magic link
3. Testa igen

## Nästa steg om allt fungerar

När magic links fungerar, överväg att:

1. Lägga till wildcard URLs i Supabase:
   - `https://eptracker.app/**`
   - `http://localhost:3000/**`

2. Förbättra error messages i UI

3. Lägga till "resend magic link" funktion

4. Överväg att öka rate limit för email (från 2 till 5-10)

## Production Environment Variables - Komplett lista

Se till att du har dessa i Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ngmqqtryojmyeixicekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://eptracker.app
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Summering

**Root cause**: `emailRedirectTo` parameter ignoreras av Supabase när Site URL är satt.

**Fix**: Lägg till `NEXT_PUBLIC_SITE_URL` environment variable så att vi explicit sätter rätt URL.

**Verifiering**: Magic link email ska innehålla `redirect_to=https://eptracker.app/api/auth/callback`

