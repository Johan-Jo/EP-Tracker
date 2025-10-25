# Push-notiser

EP-Tracker har stöd för push-notiser så att du kan få realtidsuppdateringar om viktiga händelser, även när du inte har appen öppen.

## 📱 Plattformar som stöds

- **iOS 16.4+** (iPhone/iPad med Safari eller andra webbläsare)
- **Android** (Chrome, Firefox, Edge)
- **Desktop** (Chrome, Firefox, Edge, Safari 16+)

## 🔔 Aktivera notiser

1. Gå till **Inställningar → Notiser**
2. Klicka på **"Aktivera push-notiser"**
3. Godkänn behörigheten när webbläsaren frågar
4. Skicka en testnotis för att verifiera att det fungerar

**OBS för iOS-användare:**
- Du måste först **lägga till EP-Tracker på hemskärmen** (klicka dela-knappen och välj "Lägg till på hemskärmen")
- Öppna appen från hemskärmen (inte från Safari)
- Aktivera sedan notiser från Inställningar

## 📢 Notis-typer

### Check-out påminnelser
Påminner dig att checka ut i slutet av arbetsdagen (kl 16:45 mån-fre)

**Exempel:**
> "Glöm inte checka ut! Du är incheckad på Vasavägen 12 sedan 07:15 (9.5h)"

### Team check-ins
Se när dina kollegor checkar in och ut från projekt

**Exempel:**
> "👤 Erik Svensson checkade in på Vasavägen 12"

### Godkännanden väntar
För admins/arbetsledare - notis när tidrapporter behöver godkännas

**Exempel:**
> "5 tidrapporter väntar på godkännande för vecka 15, 2025"

### Din rapport godkänd
Bekräftelse när din tidrapport har godkänts

**Exempel:**
> "✓ Din tidrapport har godkänts av Anna Johansson (5 poster)"

### ÄTA-uppdateringar
Notis när nya ÄTA skapas på dina projekt

### Dagboksinlägg
Notis när nya dagboksinlägg görs på dina projekt

### Veckosammanfattning
Sammanfattning av din arbetsvecka (skickas fredag kväll)

## 🕐 Tyst läge

Vill du inte bli störd nattetid? Aktivera **Tyst läge**:

1. Gå till **Inställningar → Notiser**
2. Scrolla ner till **"Tyst läge"**
3. Aktivera och ställ in tider (standard 22:00-07:00)

Under tyst läge kommer inga notiser skickas till din enhet.

## 🏗️ Projektspecifika alerts (Admin/Arbetsledare)

Som admin eller arbetsledare kan du ställa in projektspecifika påminnelser och varningar:

### Inställningar
1. Gå till projektet
2. Klicka **"Alert-inställningar"**
3. Konfigurera:
   - **Arbetstider** (start/slut för arbetsdagen)
   - **Incheckningspåminnelse** (X min innan arbetsdag)
   - **Utcheckningspåminnelse** (X min innan arbetsdag slutar)
   - **Sen incheckningsvarning** (varna om arbetare är sen)
   - **Glömt utcheckningsvarning** (varna om arbetare glömt checka ut)

### Varningar
Arbetsledare och admins får automatiska varningar om:
- Arbetare inte checkat in 15 min efter arbetsdagens start
- Arbetare inte checkat ut 30 min efter arbetsdagens slut

**Exempel:**
> "⚠️ 2 arbetare har inte checkat in på Vasavägen 12 (arbetsdag började 07:00)"

## 📜 Notishistorik

Se alla notiser du fått de senaste 50 dagarna:

1. Gå till **Inställningar → Notiser**
2. Klicka **"Historik"**

Här kan du se:
- 📅 Datum och tid
- 📋 Notis-typ
- ✅ Status (läst, klickad)
- ❌ Eventuella fel

## 🔧 Felsökning

### Jag får inga notiser

**iOS (iPhone/iPad):**
1. Lägg till EP-Tracker på hemskärmen
2. Öppna appen från hemskärmen (inte Safari)
3. Gå till Inställningar → Notiser → Aktivera
4. Kontrollera att iOS-inställningar tillåter notiser:
   - Gå till iOS Inställningar → EP-Tracker → Notiser
   - Aktivera "Tillåt notiser"

**Android:**
1. Kontrollera att Chrome/Firefox tillåter notiser
2. Gå till webbläsarens inställningar → Webbplatsinställningar → Notiser
3. Kontrollera att eptracker.app är tillåten

**Alla plattformar:**
- Kontrollera att du inte är i Tyst läge (22:00-07:00)
- Testa med "Skicka testnotis" i inställningar
- Kontrollera din internetanslutning

### Jag har blockerat notiser av misstag

**Chrome/Edge:**
1. Klicka på låsikonen i adressfältet
2. Klicka "Webbplatsinställningar"
3. Ändra "Notiser" från "Blockera" till "Tillåt"
4. Uppdatera sidan och aktivera i EP-Tracker

**Firefox:**
1. Klicka på skölden i adressfältet
2. Klicka "Behörigheter"
3. Ändra notiser till "Tillåt"

**Safari:**
1. Safari → Inställningar → Webbplatser → Notiser
2. Hitta eptracker.app och ändra till "Tillåt"

### Notiser slutar fungera efter ett tag

Detta kan hända om:
- Du rensar webbläsarens cache/cookies
- Du har flera enheter och byte mellan dem
- Din enhet har varit offline länge

**Lösning:**
1. Gå till Inställningar → Notiser
2. Klicka "Inaktivera alla notiser"
3. Vänta 5 sekunder
4. Klicka "Aktivera push-notiser" igen

## 🔒 Integritet & säkerhet

- Notiser skickas via Firebase Cloud Messaging (FCM)
- Vi sparar endast FCM-token, inte ditt telefonnummer
- Du kan inaktivera notiser när som helst
- Historik raderas automatiskt efter 30 dagar
- Inga notiser skickas till tredje part

## ℹ️ Mer hjälp

Har du fortfarande problem? Kontakta support:
- 📧 Email: support@eptracker.app
- 💬 Interaktiv guide: Gå till Inställningar → Notiser och klicka "Starta interaktiv guide"

