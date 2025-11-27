# Work Orders - Manuell Testplan

## Översikt
Detta dokument beskriver hur man manuellt testar work order-funktionaliteten. Fokus ligger på huvudfunktionerna och vanliga användningsscenarier.

## Förberedelser

### Testdata som behövs
- Minst 1 organisation med admin/foreman-användare
- Minst 1 kund (företag eller privatperson)
- Minst 1 projekt kopplat till kunden
- Minst 2 användare (1 admin/foreman, 1 worker)

### Testmiljö
- Logga in som admin/foreman för att skapa arbetsorder
- Logga in som worker för att testa tilldelningar och godkännande

---

## 1. Skapa Arbetsorder

### 1.1 Grundläggande skapande
**Steg:**
1. Gå till `/dashboard/work-orders`
2. Klicka på "Skapa arbetsorder"
3. Fyll i:
   - Välj kund (obligatoriskt)
   - Välj projekt (obligatoriskt - bara projekt för vald kund visas)
   - Titel: "Test arbetsorder"
   - Beskrivning: "Testbeskrivning"
   - Status: PLANERAD
   - Prioritet: NORMAL
   - Datum: Idag
   - Starttid: 08:00
   - Sluttid: 17:00
4. Klicka "Skapa"

**Förväntat resultat:**
- Arbetsordern skapas med unikt nummer (WO-YYYY-NNNN)
- Arbetsordern visas i listan
- Status är PLANERAD

### 1.2 Skapa med tilldelningar
**Steg:**
1. Följ steg 1.1, men i "Tilldelningar":
   - Välj minst 1 användare
   - Markera "Ansvarig" för en användare (valfritt)
2. Klicka "Skapa"

**Förväntat resultat:**
- Arbetsordern skapas
- Tilldelade användare får email (om email är konfigurerat)
- Tilldelningar visas på detaljsidan

### 1.3 Skapa med adress (Geoapify)
**Steg:**
1. Följ steg 1.1, men i "Plats":
   - Välj "Annan adress" (inte "Huvudprojektets adress")
   - I adressfältet, börja skriva en adress (t.ex. "Observatoriegatan")
   - Vänta på att Geoapify-förslag visas
   - Välj ett förslag från listan
2. Klicka "Skapa"

**Förväntat resultat:**
- Geoapify-förslag visas när du skriver (efter ~200ms debounce)
- Adress fylls i automatiskt i formatet "Gata Gatunummer, Postnummer Stad" när du väljer
- Koordinater (lat/lng) sparas automatiskt
- Karta visas på detaljsidan med korrekt position
- I översikten visas platsen som "Gata Gatunummer, Stad" (utan postnummer)

### 1.4 Skapa ny kund från modal
**Steg:**
1. Öppna "Skapa arbetsorder"
2. I kund-dropdown, klicka "Skapa ny kund"
3. Fyll i kundinformation och spara
4. Fortsätt skapa arbetsordern

**Förväntat resultat:**
- Ny kund skapas
- Kund väljs automatiskt
- Projekt-dropdown visas

### 1.5 Skapa nytt projekt från modal
**Steg:**
1. Öppna "Skapa arbetsorder"
2. Välj kund
3. Om kunden saknar projekt, klicka "Skapa nytt projekt"
4. Fyll i projektinformation (kund är förvald)
5. Spara projekt
6. Fortsätt skapa arbetsordern

**Förväntat resultat:**
- Nytt projekt skapas
- Projekt väljs automatiskt
- Arbetsordern kan skapas

---

## 2. Visa och Filtrera Arbetsorder

### 2.1 Lista alla arbetsorder
**Steg:**
1. Gå till `/dashboard/work-orders`
2. Kontrollera listan

**Förväntat resultat:**
- Alla arbetsorder visas
- Sorterade efter datum (nyaste först)
- Grundläggande info syns (nummer, titel, status, projekt)

### 2.2 Filtrera efter projekt
**Steg:**
1. I filter-sektionen, välj ett specifikt projekt
2. Kontrollera listan

**Förväntat resultat:**
- Endast arbetsorder för valt projekt visas

### 2.3 Filtrera efter status
**Steg:**
1. Välj status "PÅGÅENDE" i filter
2. Kontrollera listan

**Förväntat resultat:**
- Endast arbetsorder med status PÅGÅENDE visas

### 2.4 Filtrera efter datum
**Steg:**
1. Välj datumintervall (t.ex. denna vecka)
2. Kontrollera listan

**Förväntat resultat:**
- Endast arbetsorder inom datumintervallet visas

---

## 3. Visa Arbetsorderdetaljer

### 3.1 Öppna detaljsida
**Steg:**
1. Klicka på en arbetsorder i listan
2. Kontrollera detaljsidan

**Förväntat resultat:**
- All information visas korrekt
- Projekt, kund, tilldelningar syns
- Karta visas om adress finns

### 3.2 Redigera arbetsorder
**Steg:**
1. Öppna en arbetsorder
2. Klicka "Redigera"
3. Ändra titel, beskrivning, status, eller prioritet
4. Spara

**Förväntat resultat:**
- Ändringar sparas
- Uppdaterad information visas

### 3.3 Redigera adress med Geoapify
**Steg:**
1. Öppna en arbetsorder
2. Klicka "Redigera"
3. I "Plats"-sektionen, klicka i adressfältet
4. Börja skriva en ny adress (t.ex. "Storgatan")
5. Välj ett förslag från Geoapify
6. Spara

**Förväntat resultat:**
- Geoapify-förslag visas när du skriver
- Adress, postnummer, stad och koordinater uppdateras automatiskt
- Karta uppdateras med ny position

---

## 4. Tilldelningar

### 4.1 Lägga till tilldelning
**Steg:**
1. Öppna en arbetsorder
2. Gå till "Tilldelningar"-sektionen
3. Klicka "Lägg till tilldelning"
4. Välj användare och spara

**Förväntat resultat:**
- Tilldelning läggs till
- Användare får email (om konfigurerat)

### 4.2 Ta bort tilldelning
**Steg:**
1. Öppna en arbetsorder med tilldelningar
2. Ta bort en tilldelning
3. Spara

**Förväntat resultat:**
- Tilldelning tas bort
- Listan uppdateras

---

## 5. Tidregistrering

### 5.1 Registrera tid för arbetsorder
**Steg:**
1. Öppna en arbetsorder
2. Gå till "Tid"-fliken
3. Klicka "Lägg till tid"
4. Fyll i:
   - Datum: Idag
   - Starttid: 08:00
   - Sluttid: 17:00
5. Spara

**Förväntat resultat:**
- Tiden registreras
- Visas i listan under "Tid"-fliken
- Räknas in i total tid

### 5.2 Kontrollera faktisk vs planerad tid
**Steg:**
1. Registrera tid för en arbetsorder (se 5.1)
2. Kontrollera jämförelsen på "Tid"-fliken

**Förväntat resultat:**
- Planerad tid visas
- Faktisk tid visas
- Skillnad visas (över/under planerad tid)

---

## 6. Godkännande av Tid (Tvåstegsprocess)

### 6.1 Worker bekräftar tid
**Förutsättningar:**
- Arbetsorder har registrerad tid
- `planned_end_at` har passerat
- `send_time_approval_email` är true

**Steg:**
1. Worker loggar in
2. Worker får email med länk för godkännande (eller går direkt till godkänningssidan)
3. Klicka på godkänn-länken i email
4. Klicka "Bekräfta tid"

**Förväntat resultat:**
- Worker bekräftar sin registrerade tid
- Manager får email för godkännande

### 6.2 Manager godkänner tid
**Steg:**
1. Manager loggar in
2. Manager får email med länk för godkännande
3. Klicka på godkänn-länken
4. Klicka "Godkänn tid"

**Förväntat resultat:**
- Manager godkänner tiden
- Status uppdateras i arbetsordern

---

## 7. Mobilvy - Dagens Arbetsorder

### 7.1 Visa dagens arbetsorder
**Steg:**
1. Logga in som worker
2. Gå till `/dashboard/work-orders/today`
3. Kontrollera listan

**Förväntat resultat:**
- Endast arbetsorder för idag visas
- Endast arbetsorder tilldelade till inloggad användare visas
- Status är "assigned" eller "in_progress"

### 7.2 Starta arbete
**Steg:**
1. I mobilvyn, klicka "Starta arbete" på en arbetsorder
2. Kontrollera status

**Förväntat resultat:**
- `actual_start_at` sätts
- Status ändras till PÅGÅENDE

### 7.3 Avsluta arbete
**Steg:**
1. Efter att ha startat arbete, klicka "Avsluta arbete"
2. Kontrollera status

**Förväntat resultat:**
- `actual_end_at` sätts
- Status kan ändras till KLAR

---

## 8. Planeringskalender

### 8.1 Visa arbetsorder i kalender
**Steg:**
1. Gå till planeringskalendern
2. Kontrollera att arbetsorder visas

**Förväntat resultat:**
- Arbetsorder visas som kort i kalendern
- Visar arbetsordernummer, titel, planerad tid

### 8.2 Dra och släpp arbetsorder
**Steg:**
1. Dra en arbetsorder till annan dag/användare
2. Släpp

**Förväntat resultat:**
- Arbetsordern flyttas
- `planned_start_at` och `planned_end_at` uppdateras
- Tilldelning uppdateras om flyttad till annan användare

### 8.3 Skapa arbetsorder från kalender
**Steg:**
1. I planeringskalendern, klicka "Skapa arbetsorder"
2. Fyll i information (datum är förvalt)
3. Spara

**Förväntat resultat:**
- Arbetsordern skapas
- Visas direkt i kalendern på valt datum

---

## 9. Dagbok

### 9.1 Skapa dagbokspost för arbetsorder
**Steg:**
1. Öppna en arbetsorder
2. Gå till "Dagbok"-fliken
3. Klicka "Skapa dagbokspost"
4. Fyll i dagboksinformation
5. Spara

**Förväntat resultat:**
- Dagboksposten skapas
- Kopplad till arbetsordern
- Visas i arbetsorderns dagbok-flik

### 9.2 Visa dagboksposter
**Steg:**
1. Öppna en arbetsorder med dagboksposter
2. Gå till "Dagbok"-fliken
3. Kontrollera listan

**Förväntat resultat:**
- Alla dagboksposter för arbetsordern visas
- Foton visas om de finns

---

## 10. Fakturering

### 10.1 Arbetsorder i faktureringsunderlag
**Steg:**
1. Skapa en arbetsorder med `external_summary`
2. Registrera tid för arbetsordern
3. Gå till faktureringsunderlag
4. Filtrera på projektet

**Förväntat resultat:**
- Tidregistreringar kopplade till arbetsordern visas
- `external_summary` används som beskrivning om den finns
- Arbetsordernummer visas

---

## 11. Geoapify - Adress & Karta

### 11.1 Adressautocomplete i "Skapa arbetsorder"
**Steg:**
1. Öppna "Skapa arbetsorder"
2. Välj kund och projekt
3. I "Plats", välj "Annan adress"
4. I adressfältet, skriv "Observatoriegatan"
5. Vänta på förslag (efter ~500ms)
6. Välj ett förslag

**Förväntat resultat:**
- Förslag visas i dropdown-lista
- Varje förslag visar adress, postnummer och stad
- När du väljer ett förslag:
  - Adressfältet fylls med formaterad adress
  - Koordinater (lat/lng) sparas automatiskt
  - Inga manuella felmeddelanden

### 11.2 Adressautocomplete i "Redigera arbetsorder"
**Steg:**
1. Öppna en arbetsorder
2. Klicka "Redigera"
3. I "Plats"-sektionen, klicka i adressfältet
4. Skriv en ny adress
5. Välj ett förslag

**Förväntat resultat:**
- Samma beteende som i 11.1
- Befintlig adress kan ändras
- Karta uppdateras efter sparning

### 11.3 Statisk karta på detaljsida
**Steg:**
1. Skapa eller öppna en arbetsorder med adress
2. Gå till detaljsidan
3. Kontrollera kartbilden

**Förväntat resultat:**
- Statisk karta visas (600x250px)
- Karta centreras på adressen
- Markör visas på adressen (orange färg)
- Om koordinater finns: används för exakt position
- Om bara adress finns: geokodas via Geoapify
- Om ingen adress: ingen karta visas

### 11.4 Karta med koordinater (prioriteras)
**Steg:**
1. Skapa arbetsorder med adress via Geoapify (sparar koordinater)
2. Öppna detaljsidan
3. Kontrollera kartbildens URL (via DevTools)

**Förväntat resultat:**
- URL innehåller `center=lonlat:18.0686,59.3293` (exempel)
- URL innehåller `marker=lonlat:18.0686,59.3293`
- Koordinater används direkt (ingen geokodning behövs)

### 11.5 Karta med bara adresssträng (fallback)
**Steg:**
1. Skapa arbetsorder med manuellt inmatad adress (ingen Geoapify-val)
2. Öppna detaljsidan
3. Kontrollera kartbilden

**Förväntat resultat:**
- URL innehåller `center=text:...` (adresssträng)
- URL innehåller `marker=text:...`
- Geoapify geokodar adressen automatiskt

### 11.6 Felhantering - Saknad API-nyckel
**Steg:**
1. Ta bort eller kommentera ut `NEXT_PUBLIC_GEOAPIFY_API_KEY` i `.env.local`
2. Starta om dev-servern
3. Försök använda adressautocomplete

**Förväntat resultat:**
- Adressautocomplete fungerar inte (ingen förslag visas)
- Konsolen visar varning: "Geoapify API key is missing"
- Användaren kan fortfarande skriva adress manuellt
- Karta visas inte på detaljsidan (eller visar fel)

### 11.7 Testa olika adresser
**Steg:**
1. Testa adressautocomplete med:
   - Stockholmsadresser (t.ex. "Observatoriegatan")
   - Göteborgsadresser (t.ex. "Avenyn")
   - Mindre städer (t.ex. "Uppsala")
   - Postnummer (t.ex. "113 29")
2. Kontrollera att förslag visas för alla

**Förväntat resultat:**
- Förslag visas för alla typer av adresser
- Förslag är relevanta för Sverige (countrycodes=se,no,dk,fi)
- Förslag är på svenska (lang=sv)

---

## 12. Felhantering

### 12.1 Validering vid skapande
**Steg:**
1. Försök skapa arbetsorder utan att välja kund
2. Försök skapa utan att välja projekt
3. Försök skapa utan titel

**Förväntat resultat:**
- Tydliga felmeddelanden visas
- Formuläret kan inte sparas

### 12.2 Behörigheter
**Steg:**
1. Logga in som worker
2. Försök skapa arbetsorder
3. Försök redigera arbetsorder som inte är tilldelad till dig

**Förväntat resultat:**
- Worker kan inte skapa arbetsorder
- Worker kan bara redigera tilldelade arbetsorder

---

## 13. Email (Om konfigurerat)

### 13.1 Tilldelningsemail
**Steg:**
1. Skapa arbetsorder med tilldelningar
2. Kontrollera att tilldelade användare får email

**Förväntat resultat:**
- Email skickas med arbetsorderdetaljer
- Länk till "Registrera tid" fungerar
- Länk till arbetsordern fungerar

### 13.2 Tidgodkänningsemail (Worker)
**Steg:**
1. Registrera tid för arbetsorder
2. Vänta tills `planned_end_at` har passerat
3. Kontrollera att worker får email

**Förväntat resultat:**
- Email skickas med länk för bekräftelse
- Länken fungerar och bekräftar tiden

### 13.3 Tidgodkänningsemail (Manager)
**Steg:**
1. Efter att worker bekräftat tid
2. Kontrollera att manager får email

**Förväntat resultat:**
- Email skickas med jämförelse planerad vs faktisk tid
- Länk för godkännande fungerar

---

## Checklista för Snabbtest

### Grundfunktioner
- [ ] Skapa arbetsorder
- [ ] Visa lista med arbetsorder
- [ ] Filtrera arbetsorder
- [ ] Öppna detaljsida
- [ ] Redigera arbetsorder
- [ ] Lägga till tilldelningar
- [ ] Registrera tid
- [ ] Visa tid-jämförelse

### Avancerade funktioner
- [ ] Skapa kund från modal
- [ ] Skapa projekt från modal
- [ ] Dra och släpp i kalender
- [ ] Mobilvy - dagens arbetsorder
- [ ] Starta/Avsluta arbete
- [ ] Dagbok för arbetsorder

### Geoapify (Adress & Karta)
- [ ] Adressautocomplete i "Skapa arbetsorder"
- [ ] Adressautocomplete i "Redigera arbetsorder"
- [ ] Förslag visas när man skriver
- [ ] Val av förslag fyller i alla fält korrekt
- [ ] Statisk karta visas på detaljsidan
- [ ] Karta fungerar med koordinater
- [ ] Karta fungerar med adresssträng
- [ ] Felhantering vid saknad API-nyckel

### Godkännande
- [ ] Worker bekräftar tid (via email eller direkt)
- [ ] Manager godkänner tid (via email eller direkt)
- [ ] Email skickas korrekt

### Integration
- [ ] Arbetsorder i faktureringsunderlag
- [ ] Arbetsorder i planeringskalender
- [ ] Arbetsorder i dagbok

### Geoapify (Adress & Karta)
- [ ] Adressautocomplete fungerar i "Skapa arbetsorder"
- [ ] Adressautocomplete fungerar i "Redigera arbetsorder"
- [ ] Förslag visas när man skriver (efter ~500ms)
- [ ] Val av förslag fyller i adress, postnummer, stad och koordinater
- [ ] Statisk karta visas på detaljsidan (om adress finns)
- [ ] Karta uppdateras när adress ändras
- [ ] Karta fungerar med koordinater (prioriteras)
- [ ] Karta fungerar med adresssträng (fallback)

---

## Vanliga Problem att Kontrollera

1. **Långsam laddning av modal**
   - Kontrollera att data cachas efter första laddningen

2. **Adressautocomplete fungerar inte**
   - Kontrollera att Geoapify API-nyckel är satt
   - Testa att adresser hämtas korrekt

3. **Email skickas inte**
   - Kontrollera att Resend API-nyckel är satt
   - Kontrollera att `send_time_approval_email` är true
   - Kontrollera att `planned_end_at` har passerat

4. **Valideringsfel**
   - Kontrollera att alla obligatoriska fält är ifyllda
   - Kontrollera att projekt är valt efter kundval

5. **Behörighetsfel**
   - Kontrollera att worker inte kan skapa/redigera utan behörighet
   - Kontrollera att admin/foreman har full behörighet

---

## Testmiljöer

### Utvecklingsmiljö
- Lokal databas
- Testanvändare
- Mockade email (eller test-email)

### Testmiljö
- Separata testdata
- Verkliga email (testadresser)
- Fullständig konfiguration

### Produktionsmiljö
- Endast kritiska tester
- Verkliga användare
- Övervakning av fel

---

## Rapportering

För varje test:
1. **Status:** ✅ Passerade / ❌ Misslyckades / ⚠️ Delvis
2. **Anteckningar:** Eventuella observationer
3. **Skärmdumpar:** För buggar eller oväntat beteende
4. **Steg för återskapning:** Om bugg hittas

---

## Prioritering

### Hög prioritet (Måste fungera)
- Skapa arbetsorder
- Visa lista
- Redigera arbetsorder
- Registrera tid
- Tilldelningar

### Medel prioritet (Viktigt)
- Filtrering
- Adressautocomplete
- Karta
- Mobilvy
- Planeringskalender

### Låg prioritet (Nice to have)
- Email-funktionalitet
- Avancerade filter
- Export

