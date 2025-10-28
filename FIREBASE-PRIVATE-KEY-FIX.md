# 🔑 Fix Firebase Private Key i Vercel

## Problem
```
error:1E08010C:DECODER routines::unsupported
```

Detta betyder att Firebase Private Key är felaktigt formaterad i Vercel.

## Lösning A: Kopiera från lokal .env.local

1. Öppna `.env.local` fil lokalt
2. Hitta `FIREBASE_PRIVATE_KEY=`
3. Kopiera HELA värdet (en lång rad med `\n`)
4. Gå till Vercel → Settings → Environment Variables
5. Redigera `FIREBASE_PRIVATE_KEY`
6. Klistra in värdet (ska vara EN lång rad)
7. Spara och redeploy

## Lösning B: Skapa ny Service Account Key

Om du inte har tillgång till `.env.local`:

### 1. Gå till Firebase Console

https://console.firebase.google.com

### 2. Välj ditt projekt

`ep-tracker-dev-6202a`

### 3. Gå till Project Settings

- Klicka på kugghjulet (⚙️) uppe till vänster
- Välj **"Project settings"**

### 4. Service Accounts

- Klicka på fliken **"Service accounts"**
- Klicka **"Generate new private key"**
- Bekräfta och ladda ner JSON-filen

### 5. Konvertera JSON till Environment Variables

JSON-filen innehåller:
```json
{
  "type": "service_account",
  "project_id": "ep-tracker-dev-6202a",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@ep-tracker-dev-6202a.iam.gserviceaccount.com",
  ...
}
```

**Använd dessa värden i Vercel:**

- `FIREBASE_PROJECT_ID` = `project_id` (utan quotes)
- `FIREBASE_CLIENT_EMAIL` = `client_email` (utan quotes)
- `FIREBASE_PRIVATE_KEY` = `private_key` (MED `\n`, utan extra quotes)

### 6. VIKTIGT: Private Key Format

**RÄTT format (i Vercel):**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAAS...(lång string)...\n-----END PRIVATE KEY-----\n
```

**FEL format (riktiga line breaks):**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAAS...
...
-----END PRIVATE KEY-----
```

### 7. Konvertera med Node.js (om behövs)

Om din key har riktiga line breaks, konvertera den:

```javascript
// I Node.js console eller browser dev tools
const privateKeyWithNewlines = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAAS...
...
-----END PRIVATE KEY-----`;

const escaped = JSON.stringify(privateKeyWithNewlines);
console.log(escaped);
// Kopiera output (utan yttre quotes) till Vercel
```

## Verifiering

Efter att du uppdaterat i Vercel och redeployat:

1. Skicka test-notis från appen
2. Kolla Vercel logs
3. Du ska NU se:
   ```
   🔔 [sendNotification] Firebase response: {"successCount":1,"failureCount":0}
   ✅ Sent notification to 1/1 devices
   ```

## Vanliga misstag

❌ **Glömmer `\n` i private key**
- Lösning: Använd escaped newlines (`\n`), inte riktiga

❌ **Lägger till extra quotes runt key**
- Lösning: Kopiera BARA key-innehållet, inte extra `""`

❌ **Kopierar från fel environment (dev vs prod)**
- Lösning: Använd samma Firebase projekt som lokalt

❌ **Glömmer att redeploy efter uppdatering**
- Lösning: Environment variables kräver redeploy för att aktiveras

