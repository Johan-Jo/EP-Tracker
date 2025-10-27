# Pushnotiser

## Översikt

EP Tracker kan skicka pushnotiser direkt till din enhet för att hålla dig uppdaterad om viktiga händelser. Notiser fungerar både på mobil och dator, även när appen inte är öppen.

## Aktivera Notiser

### Första gången

1. Gå till **Inställningar** → **Notiser**
2. Klicka på **"Aktivera pushnotiser"**
3. Godkänn webbläsarens behörighetsfråga
4. Du får en testnotis för att bekräfta att det fungerar

### Mobilanvändare (iOS/Android)

För bästa upplevelse på mobil:

#### iOS (Safari)
1. Öppna EP Tracker i Safari
2. Tryck på delningsknappen (📤)
3. Välj **"Lägg till på hemskärmen"**
4. Öppna appen från hemskärmen
5. Aktivera notiser i inställningarna

#### Android (Chrome)
1. Öppna EP Tracker i Chrome
2. Tryck på menyn (⋮)
3. Välj **"Lägg till på hemskärmen"** eller **"Installera appen"**
4. Öppna appen från hemskärmen
5. Aktivera notiser i inställningarna

## Typer av Notiser

### För Alla Användare

#### Utcheckningspåminnelse
- **Vad:** Påminner dig om att checka ut när arbetsdagen närmar sig slut
- **När:** 15 minuter innan projektets arbetsdagslut
- **Exempel:** "Glöm inte checka ut! Arbetsdagen slutar kl. 16:00"

#### Godkännande bekräftat
- **Vad:** Meddelar när dina tidrapporter eller utgifter godkänts
- **När:** Direkt när en admin/arbetsledare godkänner
- **Exempel:** "Dina 8 timmar på Projekt X har godkänts"

### För Arbetsledare & Admins

#### Teamincheckning
- **Vad:** Notis när någon i ditt team checkar in
- **När:** Direkt när en arbetare startar tidrapportering
- **Exempel:** "Johan har checkat in på Projekt X"

#### Godkännande behövs
- **Vad:** Påminnelse om väntande godkännanden
- **När:** Varje måndag kl. 08:00 (sammanfattning)
- **Exempel:** "15 tidrapporter väntar på godkännande"

#### Sent incheckning
- **Vad:** Varning när en arbetare checkar in sent
- **När:** Baserat på projektets inställningar (t.ex. 15 min efter start)
- **Exempel:** "Johan checkade in 20 min efter arbetsstart på Projekt X"

#### Glömd utcheckning
- **Vad:** Varning när en arbetare glömmer checka ut
- **När:** Baserat på projektets inställningar (t.ex. 30 min efter arbetsdagens slut)
- **Exempel:** "Johan har inte checkat ut från Projekt X"

## Inställningar

### Aktivera/Inaktivera Notiser
Du kan när som helst stänga av notiser helt:

1. Gå till **Inställningar** → **Notiser**
2. Stäng av **"Aktivera pushnotiser"**

### Typer av Notiser
Välj vilka notiser du vill ta emot:

- ✅ Utcheckningspåminnelser
- ✅ Teamincheckning (arbetsledare/admin)
- ✅ Godkännanden
- ✅ Projektvarningar (sent/glömt, arbetsledare/admin)

### Tysta Timmar
Sätt tider när du INTE vill få notiser:

1. Aktivera **"Tysta timmar"**
2. Välj **starttid** (t.ex. 20:00)
3. Välj **sluttid** (t.ex. 07:00)

**Exempel:** Med tysta timmar 20:00-07:00 får du inga notiser på kvällar och nätter.

**OBS:** Kritiska notiser (som säkerhetsvarningar) kan komma även under tysta timmar.

### Notishistorik
Se alla notiser du fått de senaste 30 dagarna:

1. Gå till **Inställningar** → **Notiser**
2. Klicka på **"Visa historik"**
3. Filtrera på typ, status och datum

## Projektspecifika Varningar (Admin/Arbetsledare)

### Konfigurera Projektvarningar

Som admin eller arbetsledare kan du ställa in projektspecifika varningar:

1. Gå till projektet
2. Välj **"Varningar"** i menyn
3. Konfigurera:
   - **Arbetsdag:** Start- och sluttid (t.ex. 07:00-16:00)
   - **Incheckningspåminnelse:** Hur många minuter innan arbetsdagstart (t.ex. 15 min)
   - **Utcheckningspåminnelse:** Hur många minuter innan arbetsdagslut (t.ex. 15 min)
   - **Sen incheckning:** Hur många minuter efter start som räknas som sent (t.ex. 15 min)
   - **Glömd utcheckning:** Hur många minuter efter arbetsdagslut innan varning (t.ex. 30 min)
   - **Mottagare:** Vilka roller som får varningar (arbetsledare, admin)

### Varningsexempel

**Scenario:** Projekt med arbetsdag 07:00-16:00

| Tid | Händelse | Notis |
|-----|---------|-------|
| 06:45 | - | Incheckningspåminnelse till arbetare: "Arbetet startar om 15 min" |
| 07:20 | Arbetare checkar in | Varning till arbetsledare: "Johan checkade in 20 min sent" |
| 15:45 | - | Utcheckningspåminnelse till arbetare: "Glöm inte checka ut om 15 min" |
| 16:30 | Arbetare har inte checkat ut | Varning till arbetsledare: "Johan har inte checkat ut (30 min sen)" |

## Felsökning

### Jag får inga notiser

**Kontrollera följande:**

1. **Notiser aktiverade i EP Tracker?**
   - Gå till Inställningar → Notiser
   - Se till att "Aktivera pushnotiser" är på

2. **Webbläsarbehörighet godkänd?**
   - **Chrome:** chrome://settings/content/notifications
   - **Safari (iOS):** Inställningar → Safari → EP Tracker
   - **Firefox:** about:preferences#privacy → Behörigheter → Notiser

3. **Tysta timmar aktivt?**
   - Kontrollera om du är inom dina tysta timmar
   - Inaktivera temporärt för att testa

4. **Mobilapp installerad?**
   - På mobil fungerar notiser bäst via "Lägg till på hemskärmen"
   - Öppna appen från hemskärmen, inte från webbläsaren

### Notiser kommer försenade

**Möjliga orsaker:**

- **Mobilenhet i viloläge:** iOS/Android kan fördröja notiser för att spara batteri
- **Webbläsaren stängd:** Vissa webbläsare kräver att appen är öppen för notiser
- **Dålig anslutning:** Notiser kan fördröjas vid svag mobilanslutning

**Lösning:** Installera som PWA (hemskärmsapp) för bästa prestanda.

### Jag får för många notiser

1. Gå till **Inställningar** → **Notiser**
2. Inaktivera specifika notistyper
3. Eller aktivera **Tysta timmar** för kvällar/helger

### Notiser fungerade, men har slutat

**Prova följande:**

1. **Logga ut och in igen:**
   - Detta uppdaterar din notisbehörighet

2. **Inaktivera och aktivera notiser:**
   - Gå till Inställningar → Notiser
   - Stäng av, vänta 5 sek, aktivera igen

3. **Rensa webbläsardata:**
   - OBS: Du kan behöva logga in igen
   - Webbläsarens inställningar → Rensa data

4. **Kontakta support:**
   - Om problemet kvarstår, kontakta din admin

## Sekretess & Data

### Vilken data lagras?

- **FCM-token:** En unik identifierare för din enhet (raderas vid utloggning)
- **Inställningar:** Dina val av notistyper och tysta timmar
- **Notishistorik:** Lista över skickade notiser (30 dagars historik)

### Vem ser min notisdata?

- **Du:** Ser all din egen notishistorik
- **Admins:** Kan INTE se din notishistorik eller inställningar
- **System:** Sparar metadata för felsökning (ingen personlig info)

### Radera min notisdata

1. **Inaktivera notiser:** Raderar FCM-token från servern
2. **Logga ut:** Tar bort lokala notisbehörigheter
3. **Kontakta admin:** För fullständig dataradering

## Systemkrav

### Webbläsare (Desktop)

✅ **Stöds:**
- Chrome 61+
- Firefox 60+
- Edge 79+
- Safari 16+ (macOS Ventura eller nyare)

❌ **Stöds EJ:**
- Internet Explorer
- Opera Mini
- Äldre webbläsarversioner

### Mobil

✅ **iOS (Safari):**
- iOS 16.4+ (via Add to Home Screen)
- Kräver PWA-läge

✅ **Android (Chrome):**
- Android 5.0+
- Fungerar direkt i webbläsaren ELLER som PWA

### Bakgrundsuppdateringar

För att ta emot notiser när appen är stängd:

- **Desktop:** Webbläsaren måste vara igång (kan vara minimerad)
- **iOS:** Appen måste installeras på hemskärmen
- **Android:** Fungerar automatiskt (även när webbläsaren är stängd)

## Bästa Praxis

### För Arbetare

1. **Installera som hemskärmsapp** för pålitliga notiser
2. **Aktivera utcheckningspåminnelser** för att inte glömma checka ut
3. **Ställ in tysta timmar** för kvällar och helger
4. **Kontrollera notishistoriken** om du misstänker missade notiser

### För Arbetsledare

1. **Aktivera teamincheckning** för att se när arbetare börjar
2. **Konfigurera projektvarningar** med rimliga tider (inte för känsligt)
3. **Prenumerera på veckosammanfattning** för godkännanden
4. **Använd tysta timmar** för att inte störas utanför arbetstid

### För Admins

1. **Testa notiser själv först** innan du rullar ut till teamet
2. **Utbilda användare** om hemskärmsappar (iOS)
3. **Övervaka notishistorik** för att identifiera tekniska problem
4. **Justera projektvarningar** baserat på feedback

## Support

Har du fortfarande problem?

1. **Kolla notishistoriken:** Inställningar → Notiser → Visa historik
2. **Testa med test-knappen:** Skickar en testnotis direkt
3. **Kontakta support:** Beskriv problemet och bifoga skärmdump
4. **Systemadmin:** Kontrollera Firebase-konfiguration och loggar

---

**Uppdaterad:** 2025-01-27  
**Version:** 1.0  
**EPIC:** 25 - Web Push Notifications

