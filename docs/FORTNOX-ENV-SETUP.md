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
```

---

## 🐛 Felsökning

### Problem: "FORTNOX_CLIENT_ID must be set"

**Lösning:**
1. Kontrollera att `.env.local` finns i projektets rotmapp
2. Kontrollera att variablerna är korrekt namngivna (ingen `NEXT_PUBLIC_` prefix)
3. Starta om dev-servern (`npm run dev`)

### Problem: OAuth redirect fungerar inte

**Lösning:**
1. Kontrollera att redirect URI i Fortnox Developer Portal matchar exakt:
   - Lokalt: `http://localhost:3000/api/integrations/fortnox/oauth/callback`
   - Production: `https://ditt-domän.vercel.app/api/integrations/fortnox/oauth/callback`
2. Kontrollera att `NEXT_PUBLIC_SITE_URL` är korrekt satt

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


