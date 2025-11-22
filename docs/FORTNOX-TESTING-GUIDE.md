# Fortnox Integration - Testguide

## 📋 Översikt

Denna guide tar dig genom hela testprocessen för Fortnox-integrationen, från OAuth-anslutning till fakturaexport.

---

## ✅ Förutsättningar

Innan du börjar, se till att du har:

- ✅ Skapat en testanvändare i Fortnox
- ✅ Skapat en OAuth-applikation i [Fortnox Developer Portal](https://developer.fortnox.se/)
- ✅ Kopierat `Client ID` och `Client Secret` från Fortnox Developer Portal
- ✅ Node.js och npm installerat
- ✅ Supabase-projekt konfigurerat
- ✅ Kör `npm run dev` för att starta utvecklingsservern

---

## 🔧 Steg 1: Konfigurera Environment Variables

### 1.1 Skapa `.env.local` fil

Skapa en fil som heter `.env.local` i projektets rotmapp (samma nivå som `package.json`).

### 1.2 Lägg till Fortnox-variabler

Öppna `.env.local` och lägg till:

```env
# Fortnox OAuth Credentials
FORTNOX_CLIENT_ID=ditt_client_id_här
FORTNOX_CLIENT_SECRET=ditt_client_secret_här

# Supabase (om du inte redan har dem)
NEXT_PUBLIC_SUPABASE_URL=https://ditt-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_anon_key_här
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key_här
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 1.3 Starta om dev-servern

```bash
# Stoppa servern (Ctrl+C) och starta om
npm run dev
```

---

## 🔗 Steg 2: Konfigurera OAuth Redirect URI i Fortnox

### 2.1 Gå till Fortnox Developer Portal

1. Logga in på [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Välj din OAuth-applikation
3. Gå till **Settings** eller **OAuth Configuration**

### 2.2 Lägg till Redirect URI

Lägg till följande Redirect URI för lokal utveckling:

```
http://localhost:3000/api/integrations/fortnox/oauth/callback
```

**Viktigt:** URI:n måste matcha exakt, inklusive protokoll (`http://`), port (`3000`), och sökväg.

### 2.3 Spara ändringar

Klicka på **Save** eller **Update** i Fortnox Developer Portal.

---

## 🔐 Steg 3: Anslut Fortnox i Appen

### 3.1 Logga in som Admin eller Finance

1. Öppna appen: `http://localhost:3000`
2. Logga in med en användare som har rollen **admin** eller **finance**
3. **Viktigt:** Endast admin och finance kan ansluta Fortnox-konton

### 3.2 Navigera till Fortnox-inställningar

1. Gå till **Inställningar** (Settings) i huvudmenyn
2. Klicka på **Fortnox**-kortet
3. Du kommer till `/dashboard/settings/fortnox`

### 3.3 Initiera OAuth-anslutning

1. På Fortnox-inställningssidan, klicka på **"Anslut Fortnox"** eller liknande knapp
2. Du omdirigeras till Fortnox inloggningssida
3. Logga in med din **Fortnox testanvändare**
4. Godkänn behörigheterna (companyinformation, invoice)
5. Du omdirigeras tillbaka till appen

### 3.4 Verifiera anslutning

Efter OAuth-flödet bör du se:
- ✅ Status: **Ansluten**
- ✅ Token-utgångstid (expires at)
- ✅ En **"Koppla från"**-knapp

**Om det inte fungerar:**
- Kontrollera browser-konsolen för felmeddelanden
- Kontrollera att redirect URI matchar exakt i Fortnox Developer Portal
- Kontrollera att environment variables är korrekt satta

---

## 👤 Steg 4: Skapa en Kund med Fortnox-kundnummer

### 4.1 Skapa en kund i Fortnox (valfritt)

Om du vill använda en befintlig kund i Fortnox:
1. Logga in på Fortnox
2. Gå till **Kunder** (Customers)
3. Skapa en ny kund eller välj en befintlig
4. **Notera kundnumret** (t.ex. "1", "1001", etc.)

### 4.2 Lägg till kund i EP-Tracker

1. Gå till **Kunder** (Customers) i appen
2. Klicka på **"Ny kund"** eller **"Skapa kund"**
3. Fyll i kundinformation:
   - **Namn**: T.ex. "Test AB"
   - **Typ**: Välj **Företag** (Company)
   - **Fortnox kundnummer**: Ange kundnumret från Fortnox (t.ex. "1")
4. Spara kunden

**Viktigt:** Fortnox-kundnumret måste matcha en befintlig kund i Fortnox för att exporten ska fungera.

---

## 📄 Steg 5: Skapa en Faktura (Invoice Basis)

### 5.1 Skapa ett projekt (om du inte har ett)

1. Gå till **Projekt** (Projects)
2. Skapa ett nytt projekt eller välj ett befintligt

### 5.2 Skapa en faktura

1. Gå till **Fakturor** (Invoices) eller **Invoice Basis**
2. Klicka på **"Ny faktura"** eller **"Skapa faktura"**
3. Välj det projekt du skapade
4. Välj kunden du skapade (med Fortnox-kundnummer)
5. Fyll i fakturainformation:
   - **Datum**: Välj ett datum
   - **Beskrivning**: T.ex. "Testfaktura för Fortnox-integration"
6. Lägg till fakturarader:
   - **Typ**: Välj t.ex. "Arbetstid" (Time), "Material" (Materials), etc.
   - **Beskrivning**: T.ex. "Arbetstid - 8 timmar"
   - **Antal**: T.ex. 8
   - **Pris**: T.ex. 500
   - **Moms**: Välj moms-sats (t.ex. 25%)
7. Spara fakturan

### 5.3 Verifiera fakturan

Kontrollera att fakturan är korrekt:
- ✅ Alla rader är ifyllda
- ✅ Belopp är korrekt
- ✅ Moms är korrekt beräknad
- ✅ Kunden är vald

---

## 🔒 Steg 6: Låsa Fakturan

### 6.1 Lås fakturan

1. Öppna fakturan du skapade
2. Scrolla ner till **"Lock & Export"**-sektionen
3. Klicka på **"Lås faktura"** eller **"Lock Invoice"**
4. Bekräfta att du vill låsa fakturan

**Viktigt:** En faktura måste vara låst innan den kan exporteras till Fortnox.

### 6.2 Verifiera att fakturan är låst

Efter låsning bör du se:
- ✅ Status: **Låst** (Locked)
- ✅ Fakturan kan inte längre redigeras
- ✅ Fortnox Export-sektionen visas

---

## 📤 Steg 7: Exportera till Fortnox

### 7.1 Förbered export

1. I **Fortnox Export**-sektionen, kontrollera att:
   - **Fortnox kundnummer** är ifyllt (förfylls automatiskt från kunden om det är satt)
   - Om kundnumret saknas, ange det manuellt

### 7.2 Exportera fakturan

1. Klicka på **"Skapa kundfaktura i Fortnox"**
2. Vänta på att exporten slutförs (kan ta några sekunder)
3. Du bör se en bekräftelse eller fakturanummer

### 7.3 Verifiera export

**I appen:**
- ✅ Status uppdateras till: **"Exporterad till Fortnox – fakturanummer X"**
- ✅ Export-knappen är inaktiverad (fakturan kan inte exporteras igen)

**I Fortnox:**
1. Logga in på Fortnox
2. Gå till **Fakturor** (Invoices)
3. Sök efter fakturan med numret som visas i appen
4. Öppna fakturan och verifiera:
   - ✅ Kund är korrekt
   - ✅ Fakturarader matchar
   - ✅ Belopp är korrekt
   - ✅ Moms är korrekt

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
   ```
   http://localhost:3000/api/integrations/fortnox/oauth/callback
   ```
2. Kontrollera att `NEXT_PUBLIC_SITE_URL` är satt till `http://localhost:3000`
3. Kontrollera browser-konsolen för felmeddelanden

### Problem: "Forbidden" när du försöker ansluta

**Lösning:**
1. Kontrollera att din användare har rollen **admin** eller **finance**
2. Kontrollera att du är medlem i organisationen
3. Logga ut och logga in igen

### Problem: Export misslyckas med "Customer not found"

**Lösning:**
1. Kontrollera att Fortnox-kundnumret matchar en befintlig kund i Fortnox
2. Logga in på Fortnox och verifiera att kunden finns
3. Kontrollera att kundnumret är korrekt angivet (ingen extra whitespace)

### Problem: Export misslyckas med API-fel

**Lösning:**
1. Kontrollera browser-konsolen för detaljerade felmeddelanden
2. Kontrollera att OAuth-token inte har gått ut (försök koppla från och anslut igen)
3. Kontrollera Fortnox API-status
4. Verifiera att faktura-payloaden är korrekt formaterad (kolla i Network-tabben)

### Problem: Fakturan exporteras men visas inte i Fortnox

**Lösning:**
1. Kontrollera att du är inloggad på rätt Fortnox-konto (samma som OAuth-anslutningen)
2. Kontrollera att fakturan inte är i "Utkast" (Draft) i Fortnox
3. Sök efter fakturan med fakturanumret från appen

---

## ✅ Testchecklista

Använd denna checklista för att säkerställa att allt fungerar:

- [ ] Environment variables är satta i `.env.local`
- [ ] Dev-servern är igång (`npm run dev`)
- [ ] OAuth redirect URI är konfigurerad i Fortnox Developer Portal
- [ ] Inloggad som admin eller finance
- [ ] Fortnox-konto är anslutet i appen
- [ ] En kund är skapad med Fortnox-kundnummer
- [ ] En faktura (invoice_basis) är skapad
- [ ] Fakturan är låst
- [ ] Export till Fortnox lyckades
- [ ] Fakturan visas i Fortnox med korrekt information

---

## 🎯 Nästa steg

Efter att ha testat grundfunktionaliteten, testa även:

1. **Token refresh**: Vänta tills token går ut och försök exportera igen (token bör förnyas automatiskt)
2. **Flera fakturor**: Exportera flera fakturor för samma kund
3. **Olika kunder**: Exportera fakturor för olika kunder
4. **Felhantering**: Testa att exportera med felaktigt kundnummer
5. **Rollbaserad åtkomst**: Testa att en foreman kan se export-status men inte exportera

---

## 📚 Ytterligare resurser

- [Fortnox API Dokumentation](https://developer.fortnox.se/documentation/)
- [Fortnox Developer Portal](https://developer.fortnox.se/)
- [Environment Variables Setup](./FORTNOX-ENV-SETUP.md)


