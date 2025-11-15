# Organisationsinställningar

Denna guide beskriver hur du hanterar organisationsinställningar i EP Tracker, inklusive kontaktuppgifter, bankinformation, momsregistrering och standardarbetstider.

## Översikt

Organisationsinställningarna hittar du under **Inställningar → Organisation**. Endast administratörer kan ändra dessa inställningar. Alla ändringar påverkar fakturering, rapporter och standardvärden för nya projekt.

## Bolagsinformation

### Adress via Geoapify

1. Öppna "Inställningar → Organisation"
2. Skriv organisationens adress i fältet "Adress"
3. Förslag hämtas automatiskt från Geoapify när du skriver
4. Välj ett av sökförslagen från listan
5. Postnummer och ort fylls i automatiskt och kan inte ändras manuellt
6. Om du behöver ändra adress: sök igen och välj ett nytt förslag

**Viktigt:** Adressen måste väljas från Geoapify-förslagen för att postnummer och ort ska fyllas i korrekt.

### Kontaktuppgifter

- **Organisationsnamn:** Bolagets officiella namn (obligatoriskt)
- **Organisationsnummer:** Svenska organisationsnummer (t.ex. 556123-4567)
- **Telefon:** Kontakttelefonnummer

## Bankinformation

Bankinformationen används för att visa betalningsuppgifter på fakturor som genereras för kunder. Alla fält är valfria - fyll bara i de som är relevanta för din organisation.

### Tillgängliga fält

1. **Bankgiro**
   - Format: `123-4567`
   - Används för svenska betalningar via Bankgiro
   - Visas på fakturor om ifylld

2. **Plusgiro**
   - Format: `12 34 56-7`
   - Används för svenska betalningar via Plusgiro
   - Visas på fakturor om ifylld

3. **IBAN**
   - Format: `SE35 5000 0000 0549 1000 0003`
   - Internationellt bankkontonummer
   - Används för internationella betalningar
   - Visas på fakturor om ifylld

4. **BIC/SWIFT**
   - Format: `ESSESESS`
   - Bankidentifieringskod för internationella överföringar
   - Används tillsammans med IBAN
   - Visas på fakturor om ifylld

### Hur bankinformation används

- Bankinformationen sparas i organisationsinställningarna
- När du genererar en faktura (PDF) inkluderas automatiskt alla ifyllda bankfält
- Information visas i fakturans "Betalningsinformation"-sektion
- OCR-nummer (om tillgängligt) visas också tillsammans med bankinformation

**Tips:** Fyll i minst ett betalningsalternativ (Bankgiro, Plusgiro eller IBAN) så att kunder vet hur de ska betala fakturor.

## Momsregistrering

### Aktivera momsregistrering

1. Aktivera reglaget "Bolaget är momsregistrerat"
2. Fyll i **VAT-nummer** (t.ex. SE556123456701)
3. Ange **Standard momssats** i procent (t.ex. 25%)
4. Dessa uppgifter används i:
   - Fakturaunderlag
   - CSV-exporter
   - Rapporter

**Viktigt:** Om bolaget inte är momsregistrerat, lämna reglaget avstängt. VAT-nummer och momssats används inte om reglaget är avstängt.

## Ordinarie arbetstid

### Standardtider

- **Starttid:** Standard starttid för arbetsdagen (förvalt: 07:00)
- **Sluttid:** Standard sluttid för arbetsdagen (förvalt: 16:00)
- **Ordinarie arbetstid:** Antal timmar per dag (förvalt: 8 timmar)

Dessa värden används som:
- Förslag när nya projekt skapas
- Standardvärden i planeringssystemet
- Grund för beräkningar i löneunderlag

### Raster

1. Lunchen är förvald till 11:00–12:00
2. Klicka "Lägg till rast" för att lägga till fler pauser
3. Ange beskrivning (t.ex. "Fika", "Lunch")
4. Sätt start- och sluttid för varje rast
5. Ta bort raster med papperskorgen

**Tips:** Rasttider används för att beräkna nettotid i rapporter och löneunderlag.

## Spara ändringar

Efter att ha gjort ändringar:

1. Scrolla ner till botten av sidan
2. Klicka "Spara organisationsinställningar"
3. Vänta på bekräftelse ("Organisationsinställningar sparade!")
4. Sidan uppdateras automatiskt med nya värden

**Viktigt:** Alla ändringar måste sparas manuellt. Om du navigerar bort från sidan utan att spara går ändringarna förlorade.

## Vanliga frågor

### Varför kan jag inte redigera postnummer och ort manuellt?

Postnummer och ort hämtas från Geoapify för att säkerställa korrekthet och konsistens. Detta förhindrar felaktiga adresser och säkerställer att adressdata är korrekt formaterad.

### Behöver jag fylla i alla bankfält?

Nej, alla bankfält är valfria. Fyll bara i de betalningsmetoder som din organisation använder. Minst ett fält rekommenderas för att kunder ska kunna betala fakturor.

### När visas bankinformation på fakturor?

Bankinformation visas automatiskt på PDF-fakturor när de genereras, förutsatt att minst ett bankfält är ifyllt i organisationsinställningarna.

### Kan jag ändra bankinformation efter att fakturor har genererats?

Ja, bankinformation kan ändras när som helst. Ändringar påverkar endast nya fakturor som genereras efter ändringen. Befintliga fakturor behåller den bankinformation som fanns när de skapades.

### Varför visas inte bankinformation på min faktura?

Kontrollera att:
1. Minst ett bankfält är ifyllt i organisationsinställningarna
2. Du har sparat ändringarna
3. Fakturan genererades efter att bankinformationen sparades

