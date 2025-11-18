# Fortnox Environment Variables Setup

## 📋 Översikt

Fortnox-integrationen kräver två environment variables som **INTE** sätts i Supabase Dashboard, utan i din Next.js-miljö:

- `FORTNOX_CLIENT_ID` - Ditt Fortnox OAuth Client ID
- `FORTNOX_CLIENT_SECRET` - Ditt Fortnox OAuth Client Secret

---

## 🔧 Lokal utveckling (.env.local)

### Steg 1: Skapa `.env.local` fil

Skapa en fil som heter `.env.local` i projektets rotmapp (samma nivå som `package.json`):

```bash
# I projektets rotmapp
touch .env.local
```

### Steg 2: Lägg till Fortnox-variabler

Öppna `.env.local` och lägg till:

```env
# Fortnox OAuth Credentials
FORTNOX_CLIENT_ID=ditt_client_id_här
FORTNOX_CLIENT_SECRET=ditt_client_secret_här

# Existerande Supabase-variabler (om du inte redan har dem)
NEXT_PUBLIC_SUPABASE_URL=https://ditt-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_anon_key_här
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key_här
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Steg 3: Hämta Fortnox-credentials

1. Logga in på [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Skapa ett nytt OAuth-applikation
3. Kopiera **Client ID** och **Client Secret**
4. Sätt **Redirect URI** till: `http://localhost:3000/api/integrations/fortnox/oauth/callback` (för lokal utveckling)
5. **Viktigt - Behörigheter/Scopes**: 
   - I Fortnox Developer Portal kan du välja vilka behörigheter (permissions) som appen har
   - För fakturaexport behöver du: **Faktura** (Invoice) och **Kund** (Customer)
   - För att hämta företagsinformation automatiskt: **Företagsinformation** (Company Information) - aktivera detta i Developer Portal
   - OAuth-scopes i koden måste matcha permissions i Developer Portal
   - Standard: `invoice customer` (motsvarar "Faktura" och "Kund" i Developer Portal)
   - Om du aktiverat "Företagsinformation" i Developer Portal, kan du prova lägga till `companyinformation` i `FORTNOX_OAUTH_SCOPES` om det behövs
   - OBS: `/companyinformation` endpoint kan fungera med bara `invoice customer` scopes - testa först innan du lägger till extra scope

### Steg 4: Starta om dev-servern

```bash
# Stoppa servern (Ctrl+C) och starta om
npm run dev
```

---

## 🚀 Production (Vercel)

### Steg 1: Gå till Vercel Dashboard

1. Logga in på [Vercel Dashboard](https://vercel.com/dashboard)
2. Välj ditt **EP-Tracker** projekt
3. Gå till **Settings** → **Environment Variables**

### Steg 2: Lägg till Fortnox-variabler

Klicka på **Add New** och lägg till:

**Variabel 1:**
- **Name**: `FORTNOX_CLIENT_ID`
- **Value**: Ditt Fortnox Client ID
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (valfritt)

**Variabel 2:**
- **Name**: `FORTNOX_CLIENT_SECRET`
- **Value**: Ditt Fortnox Client Secret
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (valfritt)

**Variabel 3 (Rekommenderas om du får redirect_uri_mismatch):**
- **Name**: `FORTNOX_REDIRECT_URI`
- **Value**: `https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback`
- **Environment**: 
  - ✅ Production
  - ✅ Preview
  - ✅ Development (valfritt)
  
  **Viktigt:** Denna URI måste matcha **exakt** den som är registrerad i Fortnox Developer Portal

### Steg 3: Uppdatera Fortnox Redirect URI

I Fortnox Developer Portal, lägg till production redirect URI:

```
https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback
```

### Steg 4: Redeploy

Efter att ha lagt till environment variables:

1. Gå till **Deployments** i Vercel
2. Klicka på **...** (tre prickar) på senaste deployment
3. Välj **Redeploy**

Eller pusha en ny commit:

```bash
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push
```

---

## ⚠️ Viktigt: Supabase Dashboard

**Du behöver INTE sätta Fortnox-variabler i Supabase Dashboard.**

Supabase Dashboard används för:
- ✅ Supabase-specifika secrets (API keys, service role keys)
- ✅ Edge Functions secrets (om du använder Supabase Edge Functions)
- ❌ **INTE** för Next.js environment variables

Fortnox-variabler körs i Next.js API routes, inte i Supabase.

---

## 🔍 Verifiera att variabler är satta

### Lokalt

Kontrollera att variablerna laddas korrekt:

```bash
# I terminalen
node -e "console.log('FORTNOX_CLIENT_ID:', process.env.FORTNOX_CLIENT_ID ? '✅ Satt' : '❌ Saknas')"
```

### I Production

1. Gå till Vercel Dashboard → Settings → Environment Variables
2. Kontrollera att båda variablerna finns
3. Testa OAuth-flödet i produktion

---

## 📝 Komplett .env.local exempel

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Fortnox OAuth
FORTNOX_CLIENT_ID=din_client_id
FORTNOX_CLIENT_SECRET=din_client_secret
# Optional: Explicit redirect URI (använd om du får redirect_uri_mismatch fel)
# FORTNOX_REDIRECT_URI=http://localhost:3000/api/integrations/fortnox/oauth/callback
# Optional: Custom OAuth scopes (standard: 'invoice customer')
# Kontrollera i Fortnox Developer Portal vilka permissions som är aktiverade för din app
# Om du har aktiverat "Företagsinformation" i Developer Portal och /companyinformation inte fungerar med bara 'invoice customer', prova:
# FORTNOX_OAUTH_SCOPES=invoice customer companyinformation
# OBS: Testa först med bara 'invoice customer' - det borde fungera för de flesta endpoints
```

---

## 🐛 Felsökning

### Problem: "FORTNOX_CLIENT_ID must be set"

**Lösning:**
1. Kontrollera att `.env.local` finns i projektets rotmapp
2. Kontrollera att variablerna är korrekt namngivna (ingen `NEXT_PUBLIC_` prefix)
3. Starta om dev-servern (`npm run dev`)

### Problem: "invalid_scope" eller "An unsupported scope was requested"

**Lösning:**
1. **Kontrollera terminal-loggning**: När du försöker ansluta, kolla loggen för:
   ```
   [Fortnox OAuth] Requested scopes: invoice customer companyinformation
   ```
   Detta visar vilka scopes som begärs.

2. **Kontrollera Fortnox Developer Portal**: Gå till din app i [Fortnox Developer Portal](https://developer.fortnox.se/) och se vilka scopes som är aktiverade/tillgängliga för din app.

3. **Använd endast giltiga scopes**: Standard är `invoice customer`. Om `companyinformation` inte fungerar, ta bort det:
   ```env
   # I .env.local - använd bara scopes som är bekräftade som giltiga i Fortnox Developer Portal
   FORTNOX_OAUTH_SCOPES=invoice customer
   ```

4. **Testa utan companyinformation**: Kundnummer kan fortfarande användas - du kan bara inte hämta det automatiskt från Fortnox API utan `companyinformation` scope. Manuell inmatning fungerar fortfarande.

### Problem: "redirect_uri_mismatch" eller OAuth redirect fungerar inte

**Lösning:**
1. **Kontrollera terminal-loggning**: När du försöker ansluta, kolla terminalen för loggmeddelanden som:
   ```
   [Fortnox OAuth] Redirect URI: http://...
   [Fortnox OAuth] Environment check: { ... }
   ```
   Detta visar exakt vilken redirect URI som används.

2. **Matcha i Fortnox Developer Portal**: Redirect URI:n i Fortnox Developer Portal måste matcha **exakt** den som visas i loggen. Kontrollera:
   - Samma protokoll (http vs https)
   - Samma domän (localhost vs produktion)
   - Samma port (om relevant)
   - Ingen trailing slash
   - Exakt samma sökväg: `/api/integrations/fortnox/oauth/callback`

3. **Använd explicit miljövariabel**: Om du får problem med automatisk detektering, sätt en explicit redirect URI:
   ```env
   # I .env.local för lokal utveckling
   FORTNOX_REDIRECT_URI=http://localhost:3000/api/integrations/fortnox/oauth/callback
   
   # I Vercel för produktion
   FORTNOX_REDIRECT_URI=https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback
   ```

4. **Standard-inställningar** (om `FORTNOX_REDIRECT_URI` inte är satt):
   - Systemet använder `NEXT_PUBLIC_SITE_URL` eller `NEXT_PUBLIC_APP_URL` först
   - Om ingen är satt, används request-host som fallback
   - Detta kan vara problematiskt om du kör bakom en proxy eller CDN

5. **För produktion**: Se till att både `NEXT_PUBLIC_SITE_URL` och `FORTNOX_REDIRECT_URI` är satta i Vercel miljövariabler

### Problem: Variabler fungerar inte i production

**Lösning:**
1. Kontrollera att variablerna är satta i Vercel Dashboard
2. Kontrollera att de är aktiverade för **Production** environment
3. Gör en ny deployment efter att ha lagt till variablerna

---

## 📚 Ytterligare resurser

- [Fortnox Developer Portal](https://developer.fortnox.se/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)


