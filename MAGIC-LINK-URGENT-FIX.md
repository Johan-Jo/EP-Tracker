# BRÅDSKANDE FIX: Magic Link Redirect Problem

## Problem
Magic link går till `https://eptracker.app/` istället för `https://eptracker.app/api/auth/callback`

Detta orsakar:
- ✗ OTP expired error (även om länken är färsk)
- ✗ access_denied error
- ✗ Ingen inloggning

## ROOT CAUSE
**Redirect URL i Supabase är INTE korrekt konfigurerad!**

## LÖSNING (GÖR DETTA NU)

### Steg 1: Öppna Supabase Dashboard
Gå till: https://supabase.com/dashboard/project/ngmqqtryojmyeixicekt/auth/url-configuration

### Steg 2: Kontrollera "Site URL"
Ska vara:
```
https://eptracker.app
```

### Steg 3: Kontrollera "Redirect URLs" 
**DETTA ÄR DET VIKTIGA!**

Du MÅSTE ha dessa URLs i listan (lägg till om de saknas):

```
https://eptracker.app/api/auth/callback
https://eptracker.app/**
http://localhost:3000/api/auth/callback
http://localhost:3000/**
```

**OBS:** Varje URL på en egen rad!

### Steg 4: Spara
Klicka på **"Save"** längst ner på sidan.

### Steg 5: Vänta 1-2 minuter
Supabase behöver lite tid att uppdatera konfigurationen.

### Steg 6: Testa igen
1. Gå till https://eptracker.app/sign-in
2. Begär en NY magic link (gamla länkar fungerar inte)
3. Öppna din mail
4. Klicka på den nya länken

## Varför händer detta?

När Supabase skickar magic link, inkluderar den en redirect URL som du specifierar i API-anropet:
```typescript
emailRedirectTo: `${requestUrl.origin}/api/auth/callback`
```

Men Supabase kontrollerar denna URL mot listan av tillåtna redirect URLs. Om URL:en inte finns i listan, redirectar Supabase till site_url (root) med ett error istället.

## Kontrollera att det fungerar

När du klickar på magic link ska du se URL:en ändras så här:

1. Först: `https://eptracker.app/api/auth/callback?code=...`
2. Sedan: `https://eptracker.app/dashboard` eller `https://eptracker.app/complete-setup`

Om du fortfarande hamnar på `https://eptracker.app/?error=...` så är redirect URLs INTE korrekt konfigurerade.

## Debug Checklist

Innan du testar igen, kontrollera:

- [ ] Du har lagt till `/api/auth/callback` URL i Supabase (inte bara `/**`)
- [ ] Du har sparat ändringarna i Supabase Dashboard
- [ ] Du har väntat 1-2 minuter efter att ha sparat
- [ ] Du begär en HELT NY magic link (gamla fungerar inte)
- [ ] Du klickar på länken i mailet (kopiera inte URL:en manuellt)

## Om det fortfarande inte fungerar

### Kontrollera Supabase Email Template
1. Gå till: Authentication → Email Templates → Magic Link
2. Kontrollera att template innehåller: `{{ .ConfirmationURL }}`
3. Länken ska vara: `<a href="{{ .ConfirmationURL }}">Logga in</a>`

### Kontrollera att API-route används
Lägg till denna debug-kod temporärt i `app/api/auth/magic-link/route.ts`:

```typescript
console.log('[MAGIC LINK] Full request URL:', request.url);
console.log('[MAGIC LINK] Request headers:', Object.fromEntries(request.headers.entries()));
console.log('[MAGIC LINK] Origin:', new URL(request.url).origin);
```

Sedan när du begär magic link, kolla terminal output och verifiera att origin är korrekt.

## Vercel Environment Variables

Om du kör på Vercel, kontrollera också att dessa environment variables är satta:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ngmqqtryojmyeixicekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://eptracker.app
```

## Production vs Development

**Production (eptracker.app):**
```
Site URL: https://eptracker.app
Redirect URLs:
  - https://eptracker.app/api/auth/callback
  - https://eptracker.app/**
```

**Development (localhost):**
```
Site URL: http://localhost:3000
Redirect URLs (LÄGG TILL båda):
  - http://localhost:3000/api/auth/callback
  - http://127.0.0.1:3000/api/auth/callback
  - http://localhost:3000/**
  - http://127.0.0.1:3000/**
```

**TIPS:** Du kan ha BÅDE production OCH development URLs i samma lista!

## Screenshot av rätt konfiguration

Din "Redirect URLs" sektion i Supabase ska se ut ungefär så här:

```
Redirect URLs
Add multiple URLs to allow different redirect paths after authentication.
Wildcard patterns are supported (e.g., https://example.com/**).

https://eptracker.app/api/auth/callback
https://eptracker.app/**
http://localhost:3000/api/auth/callback
http://localhost:3000/**
http://127.0.0.1:3000/api/auth/callback
http://127.0.0.1:3000/**

[+ Add URL]                                                      [Save]
```

## Vanliga Fel

1. ❌ Bara lagt till `https://eptracker.app/**` men INTE `/api/auth/callback`
   - Fix: Lägg till BÅDA

2. ❌ Glömt spara i Supabase Dashboard
   - Fix: Klicka "Save" och vänta 1-2 min

3. ❌ Använder gammal magic link
   - Fix: Begär en helt ny länk

4. ❌ Fel origin används (http vs https)
   - Fix: Kontrollera att NEXT_PUBLIC_SITE_URL är rätt

5. ❌ Konfigurerat lokalt (config.toml) men inte i Supabase Dashboard
   - Fix: `config.toml` är bara för lokal development. Production använder Supabase Dashboard!

## Support

Om problemet kvarstår:
1. Ta screenshot av din Supabase "URL Configuration" sida
2. Kopiera hela magic link URL:en från mailet
3. Kolla server logs när du klickar på länken

