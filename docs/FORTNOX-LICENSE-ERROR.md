# Fix: Fortnox OAuth License Error

## Problem

Du får felet:
```
error_missing_license Resource owner is not licensed for the requested scope(s).
```

Detta betyder att ditt Fortnox-konto **inte har licens** för de scope:n (behörigheter) som begärs.

## Lösning

### Steg 1: Kontrollera vilka scope:n som begärs

I terminalen ser du:
```
[Fortnox OAuth] Redirect URI: http://localhost:3000/api/integrations/fortnox/oauth/callback
```

Koden begär för närvarande scope:n: `invoice customer`

### Steg 2: Begränsa till endast nödvändiga scope:n

**Alternativ 1: Använd bara `invoice` (rekommenderat för att börja)**

Lägg till i `.env.local`:
```env
FORTNOX_OAUTH_SCOPES=invoice
```

**Alternativ 2: Använd bara `customer` (om du bara behöver importera kunder)**

```env
FORTNOX_OAUTH_SCOPES=customer
```

### Steg 3: Kontrollera Fortnox-paket/licenser

För att använda Fortnox API behöver ditt Fortnox-konto ha:

1. **Faktura-scope (`invoice`):**
   - Fortnox Fakturering (grundpaket)
   - Eller Fortnox Plus/Pro

2. **Kund-scope (`customer`):**
   - Fortnox Fakturering (grundpaket)
   - Eller Fortnox Plus/Pro

3. **Företagsinformation-scope (`companyinformation`):**
   - Kräver vanligtvis Fortnox Plus eller högre

### Steg 4: Uppgradera Fortnox-paket (om nödvändigt)

Om du har ett testkonto eller grundpaket:

1. Logga in på Fortnox
2. Gå till **Inställningar** → **Prenumeration**
3. Kontrollera vilket paket du har
4. Uppgradera till ett paket som inkluderar API-åtkomst om nödvändigt

### Steg 5: Testa med minimal scope

1. Sätt i `.env.local`:
   ```env
   FORTNOX_OAUTH_SCOPES=invoice
   ```

2. Starta om dev-servern:
   ```bash
   npm run dev
   ```

3. Försök ansluta igen

4. Om det fungerar, kan du lägga till fler scope:n en i taget:
   ```env
   FORTNOX_OAUTH_SCOPES=invoice customer
   ```

## Vanliga Fortnox-paket och scope-stöd

| Fortnox-paket | Invoice | Customer | CompanyInformation |
|--------------|---------|----------|-------------------|
| Fortnox Start | ❌ | ❌ | ❌ |
| Fortnox Fakturering | ✅ | ✅ | ❌ |
| Fortnox Plus | ✅ | ✅ | ✅ |
| Fortnox Pro | ✅ | ✅ | ✅ |

## Felsökning

### Problem: Fortfarande "error_missing_license" med bara `invoice`

**Lösning:**
1. Kontrollera att ditt Fortnox-konto har faktureringspaketet aktiverat
2. Kontakta Fortnox support för att verifiera API-åtkomst
3. Kontrollera att ditt konto inte är i testläge eller begränsat läge

### Problem: Behöver fler scope:n men får licensfel

**Lösning:**
1. Uppgradera Fortnox-paketet
2. Eller begränsa funktionaliteten till scope:n som är tillgängliga

### Problem: Vet inte vilket Fortnox-paket jag har

**Lösning:**
1. Logga in på Fortnox
2. Gå till **Inställningar** → **Prenumeration**
3. Eller kontakta Fortnox support

## Rekommendation

För att börja, använd bara `invoice` scope:
```env
FORTNOX_OAUTH_SCOPES=invoice
```

Detta ger dig möjlighet att:
- Exportera fakturor till Fortnox
- Skapa fakturor via API

När det fungerar kan du lägga till `customer` scope för att importera kunder.


