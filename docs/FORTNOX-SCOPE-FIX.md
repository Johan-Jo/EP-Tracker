# Fix: Fortnox OAuth Invalid Scope Error

## Problem

Du får felet:
```
error=invalid_scope
error_description=An unsupported scope was requested
```

Detta betyder att scope:n som skickas till Fortnox inte är korrekt eller inte är aktiverad i din Fortnox-applikation.

## Lösning

### Steg 1: Kontrollera vilka scope:n som är tillgängliga

1. Logga in på [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Välj din OAuth-applikation
3. Gå till **Settings** eller **OAuth Configuration**
4. Hitta sektionen för **Scopes** eller **Permissions**
5. **Notera exakt vilka scope:n som är aktiverade** (t.ex. `invoice`, `customer`, `companyinformation`)

### Steg 2: Uppdatera scope:n i koden

Scope:n måste matcha exakt vad som är aktiverat i Fortnox Developer Portal.

**Alternativ 1: Använd environment variable (rekommenderat)**

Lägg till i `.env.local`:
```env
FORTNOX_OAUTH_SCOPES=invoice customer
```

**Alternativ 2: Uppdatera koden direkt**

I `app/api/integrations/fortnox/oauth/initiate/route.ts`, ändra:
```typescript
authUrl.searchParams.set('scope', 'invoice customer');
```

Till exakt de scope:n som är aktiverade i Fortnox Developer Portal.

### Steg 3: Vanliga Fortnox OAuth Scopes

Här är några vanliga scope:n som Fortnox stödjer:

- `invoice` - Skapa och hantera fakturor
- `customer` - Läsa och skapa kunder
- `companyinformation` - Läsa företagsinformation
- `article` - Hantera artiklar/produkter
- `account` - Kontoplan
- `price` - Priser
- `project` - Projekt
- `supplier` - Leverantörer

**Viktigt:** 
- Scope:n måste vara separerade med **mellanslag** (inte komma)
- Scope:n måste matcha exakt (case-sensitive)
- Du kan bara använda scope:n som är aktiverade i din Fortnox-applikation

### Steg 4: Verifiera i Fortnox Developer Portal

1. Gå till din Fortnox-applikation
2. Kontrollera att scope:n du vill använda är **aktiverade**
3. Om scope:n inte är aktiverade, aktivera dem och spara

### Steg 5: Testa igen

1. Spara ändringarna
2. Starta om dev-servern om du ändrade `.env.local`
3. Försök ansluta igen

## Exempel

### Om du bara behöver fakturor:
```env
FORTNOX_OAUTH_SCOPES=invoice
```

### Om du behöver fakturor och kunder:
```env
FORTNOX_OAUTH_SCOPES=invoice customer
```

### Om du behöver allt:
```env
FORTNOX_OAUTH_SCOPES=invoice customer companyinformation article
```

## Felsökning

### Problem: Fortfarande "invalid_scope"

**Lösning:**
1. Kontrollera att scope-namnen är korrekta (case-sensitive)
2. Kontrollera att scope:n är separerade med **mellanslag** (inte komma eller semikolon)
3. Kontrollera att scope:n är aktiverade i Fortnox Developer Portal
4. Prova med bara en scope först (t.ex. `invoice`) för att isolera problemet

### Problem: Vet inte vilka scope:n som är tillgängliga

**Lösning:**
1. Logga in på Fortnox Developer Portal
2. Gå till din applikations inställningar
3. Kolla vilka scope:n som listas/kan aktiveras
4. Aktivera de scope:n du behöver
5. Använd exakt samma scope-namn i koden

## Verifiering

Efter att ha fixat scope:n, bör du kunna:
1. Klicka på "Anslut till Fortnox" utan fel
2. Omdirigeras till Fortnox för att godkänna åtkomst
3. Se en lista över de scope:n som begärs
4. Godkänna och bli omdirigerad tillbaka till EP-Tracker

