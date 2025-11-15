# Godkännanden - Användarhandbok

## Översikt

Som administratör eller arbetsledare kan du granska och godkänna olika typer av poster som användare har skickat in. Systemet samlar alla poster som väntar på godkännande på en central plats.

## Godkännandetyper

Systemet stöder godkännande för följande typer:

1. **Tidrapporter** - Arbetsrapporter från användare
2. **Material** - Material som beställts eller använts
3. **Utlägg** - Kostnader och utgifter
4. **Miltal** - Miltalsersättning
5. **ÄTA** - Ändringsbeslut (förändringsbeslut)

**Observera:** Dagboksposter kräver inte godkännande och inkluderas direkt i fakturor.

---

## Statusvärden

Alla poster kan ha följande status:

| Status | Beskrivning | Vad betyder det? |
|--------|-------------|------------------|
| **Utkast** | Posten är inte skickad | Användaren har skapat posten men inte skickat den för godkännande än |
| **Väntar godkännande** | Posten är inskickad | Användaren har skickat posten och den väntar på ditt godkännande |
| **Godkänd** | Posten är godkänd | Du har godkänt posten och den kan inkluderas i fakturor |
| **Avvisad** | Posten är avvisad | Du har avvisat posten och användaren kan redigera den |

**Specialfall för ÄTA:**
- **Fakturerad** - ÄTA har fakturerats och ingår inte längre i väntande fakturor

---

## Godkännandeflöde

### 1. Gå till Godkännanden

1. Logga in som administratör eller arbetsledare
2. Klicka på "Godkännanden" i menyn
3. Du ser en översikt över alla poster som väntar på godkännande

### 2. Välj period

1. Använd veckoväljaren för att navigera mellan veckor
2. Standard: Nuvarande vecka
3. Du kan gå bakåt eller framåt i tiden

### 3. Filtrera

**Filteralternativ:**
- **Alla** - Visa alla poster oavsett status
- **Väntar** - Visa poster som väntar på godkännande (Utkast + Inskickat)
- **Utkast** - Visa endast utkast
- **Inskickat** - Visa endast inskickade poster
- **Godkända** - Visa endast godkända poster
- **Avvisade** - Visa endast avvisade poster

### 4. Granska poster

**Tidrapporter:**
- Se vem som rapporterat
- Se projekt, fas och uppdrag
- Se tider och arbetade timmar
- Se anteckningar

**Material:**
- Se materialbeskrivning
- Se antal, enhet och pris
- Se kvitton/foton (om uppladdat)

**Utlägg:**
- Se utläggsbeskrivning
- Se kategori och belopp
- Se kvitton/foton (om uppladdat)

**Miltal:**
- Se datum och sträcka
- Se från/till adresser
- Se belopp

**ÄTA:**
- Se ÄTA-nummer och titel
- Se beskrivning
- Se belopp och faktureringstyp
- Se kopplade material och utlägg

### 5. Godkänn poster

**Bulk-godkännande (rekommenderat):**

1. Markera flera poster genom att klicka på checkboxarna
2. Klicka på "Godkänn"-knappen
3. Alla markerade poster godkänns samtidigt
4. Användare får notifikation om godkännande

**Enskilt godkännande:**

1. Klicka på checkboxen för en enskild post
2. Klicka på "Godkänn"-knappen

**Vad händer vid godkännande:**
- Status ändras till "Godkänd"
- Din signatur (namn) sparas
- Tidpunkt för godkännande registreras
- Posten kan nu inkluderas i fakturaunderlag
- Användare får notifikation

### 6. Avvisa poster

Om en post behöver ändras eller är felaktig:

**Tidrapporter:**
1. Klicka på meddelande-ikonen på posten
2. Skriv vad som behöver ändras
3. Skicka feedback
4. Användaren kan redigera posten och skicka in igen

**ÄTA:**
1. Markera ÄTA:et
2. Klicka på "Avvisa"-knappen
3. Skriv kommentar med anledning till avslag (obligatoriskt)
4. Skicka avslag
5. Användaren kan redigera ÄTA:et och skicka in igen

---

## Bulk-åtgärder

### Godkänn flera samtidigt

1. Markera flera poster med checkboxarna
2. Klicka på "Godkänn"-knappen
3. Alla markerade poster godkänns i en operation

**Tips:**
- Du kan markera alla med "Välj alla"-checkboxen
- Du kan avmarkera alla genom att klicka igen
- Du kan kombinera olika typer (t.ex. både material och utlägg)

### Export godkända poster

När poster är godkända kan de exporteras för fakturering:
- Exportera till CSV för import i ekonomisystem
- Exportera till PDF för fakturering

---

## Översikt och statistik

På godkännandesidan ser du:

**Översiktskort:**
- Antal väntande tidrapporter
- Antal väntande kostnader (material, utlägg, miltal, ÄTA)
- Antal unika användare med väntande poster
- Statusfördelning (hur många i varje status)

**Veckoväljare:**
- Navigera mellan veckor
- Se datumintervall för varje vecka

---

## Fakturaunderlag

**Viktigt:** Endast **godkända** poster inkluderas i fakturaunderlag.

När du godkänner poster:
1. Posterna läggs till i fakturaunderlag automatiskt
2. Du kan exportera fakturaunderlag för fakturering
3. Material och utlägg som är kopplade till ÄTA ingår i ÄTA-beloppet, inte separat

---

## Behörigheter

**Kan godkänna:**
- Administratörer
- Arbetsledare

**Kan inte godkänna:**
- Arbetare (Workers)
- Finansansvariga (Finance)
- Uppdragsledare (UE)

**Kan se:**
- Alla användare kan se sina egna poster och deras status
- Administratörer och arbetsledare kan se alla poster i organisationen

---

## Notifikationer

### Användare får notifikation när:

✅ **Posten godkänns:**
- E-postnotifikation
- Push-notifikation (om aktiverat)
- Visas i notifikationslista

❌ **Posten avvisas:**
- E-postnotifikation med anledning
- Push-notifikation (om aktiverat)
- Visas i notifikationslista

### Användare kan sedan:

✅ **Vid godkännande:**
- Se att posten är godkänd
- Posten kan inte längre redigeras
- Posten ingår i fakturaunderlag

❌ **Vid avslag:**
- Se anledning till avslag
- Redigera posten
- Skicka in igen när ändringar är gjorda

---

## Tips och bästa praxis

### 1. Granska regelbundet
- Sätt en dag i veckan för godkännande
- Undvik att låta poster ackumuleras
- Påskyndar fakturering

### 2. Använd bulk-godkännande
- Spara tid genom att godkänna flera poster samtidigt
- Godkänn alla poster från samma användare i taget
- Godkänn alla poster för samma projekt i taget

### 3. Ge konstruktiv feedback vid avslag
- Förklara vad som behöver ändras
- Använd tydlig och respektfull språk
- Hjälp användaren att förstå vad som förväntas

### 4. Kontrollera kopplingar
- Se till att material och utlägg är kopplade till rätt projekt
- Verifiera att ÄTA:er är korrekt dokumenterade
- Kontrollera att miltal är rimliga

### 5. Övervaka statusfördelning
- Använd översiktssiffror för att se mönster
- Identifiera användare som ofta har avvisade poster
- Ge extra stöd där det behövs

---

## Vanliga frågor

**Q: Kan jag ångra ett godkännande?**
A: Nej, när en post är godkänd kan den inte ångras. Kontakta support om du behöver ändra ett godkännande.

**Q: Varför ser jag inte alla poster?**
A: Kontrollera att du har rätt filterval och period. Poster med status "Godkänd" visas inte under "Väntar"-filtret.

**Q: Kan jag godkänna poster från olika veckor samtidigt?**
A: Nej, varje vecka måste godkännas separat. Använd veckoväljaren för att navigera mellan veckor.

**Q: Vad händer om jag godkänner en post av misstag?**
A: Kontakta support omedelbart. De kan hjälpa till att korrigera felet.

**Q: Varför krävs inte godkännande för dagboksposter?**
A: Dagboksposter är dokumentation av daglig verksamhet och inkluderas direkt i fakturor utan separat godkännande.

---

## Support

Om du har frågor eller stöter på problem:
1. Kontrollera denna hjälpsida
2. Kontakta din systemadministratör
3. Kontakta support via help-funktionen i appen

