# Fix: Fortnox OAuth Redirect URI Mismatch

## Problem

Du får felet:
```
{"error":"redirect_uri_mismatch","error_description":"The redirect URI provided is missing or does not match"}
```

Detta betyder att redirect URI:n som skickas till Fortnox inte matchar den som är registrerad i Fortnox Developer Portal.

## Lösning

### Steg 1: Kontrollera vilken Redirect URI som används

1. Öppna browser-konsolen (F12) när du klickar på "Anslut till Fortnox"
2. Kolla terminalen där `npm run dev` körs - du bör se en logg:
   ```
   [Fortnox OAuth] Redirect URI: http://localhost:3000/api/integrations/fortnox/oauth/callback
   ```
3. **Kopiera exakt denna URI** (inklusive protokoll, port, och sökväg)

### Steg 2: Uppdatera Redirect URI i Fortnox Developer Portal

1. Logga in på [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Välj din OAuth-applikation
3. Gå till **Settings** eller **OAuth Configuration**
4. Hitta fältet för **Redirect URI** eller **Callback URL**
5. **Lägg till exakt denna URI** (måste matcha 100%):
   ```
   http://localhost:3000/api/integrations/fortnox/oauth/callback
   ```

### Steg 3: För Production

När du deployar till production, lägg till production redirect URI också:

```
https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback
```

**Viktigt:**
- URI:n måste matcha **exakt** (inklusive `http://` vs `https://`)
- Ingen trailing slash (`/`) i slutet
- Portnummer måste matcha (t.ex. `:3000` för localhost)
- Sökvägen måste vara exakt: `/api/integrations/fortnox/oauth/callback`

### Steg 4: Verifiera Environment Variables

Kontrollera att du har rätt environment variables satta:

**Lokalt (`.env.local`):**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# eller
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (Vercel):**
```env
NEXT_PUBLIC_SITE_URL=https://ditt-domän.vercel.app
# eller
NEXT_PUBLIC_APP_URL=https://ditt-domän.vercel.app
```

### Steg 5: Testa igen

1. Spara ändringarna i Fortnox Developer Portal
2. Vänta några sekunder (kan ta upp till 1 minut att spridas)
3. Försök ansluta igen från EP-Tracker

## Felsökning

### Problem: Fortfarande samma fel

**Lösning:**
1. Kontrollera att du har sparat ändringarna i Fortnox Developer Portal
2. Vänta 1-2 minuter (Fortnox kan ha cache)
3. Kontrollera att URI:n i terminalen matchar exakt det du la till i Fortnox
4. Kontrollera att det inte finns extra mellanslag eller tecken

### Problem: Olika URI:n i olika miljöer

**Lösning:**
Lägg till **båda** redirect URI:erna i Fortnox Developer Portal:
- `http://localhost:3000/api/integrations/fortnox/oauth/callback` (för lokal utveckling)
- `https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback` (för production)

### Problem: URI:n ändras automatiskt

**Lösning:**
Kontrollera att `NEXT_PUBLIC_SITE_URL` eller `NEXT_PUBLIC_APP_URL` är korrekt satt. Om ingen av dem är satt, används request URL:n automatiskt, vilket kan variera.

## Exempel på korrekt konfiguration

### Fortnox Developer Portal
```
Redirect URIs:
- http://localhost:3000/api/integrations/fortnox/oauth/callback
- https://eptracker.app/api/integrations/fortnox/oauth/callback
```

### .env.local
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FORTNOX_CLIENT_ID=ditt_client_id
FORTNOX_CLIENT_SECRET=ditt_client_secret
```

### Vercel Environment Variables
```env
NEXT_PUBLIC_SITE_URL=https://eptracker.app
FORTNOX_CLIENT_ID=ditt_client_id
FORTNOX_CLIENT_SECRET=ditt_client_secret
```

## Verifiering

Efter att ha fixat redirect URI:n, bör du se i terminalen:
```
[Fortnox OAuth] Redirect URI: http://localhost:3000/api/integrations/fortnox/oauth/callback
```

Och när du klickar på "Anslut till Fortnox" bör du omdirigeras till Fortnox utan fel.


