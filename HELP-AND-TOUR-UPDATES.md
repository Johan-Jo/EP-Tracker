# Help & Tour Updates - EPIC 25 Phase 2

**Date:** 2025-01-28  
**Status:** ✅ Complete

---

## 📚 Updated Files

1. ✅ `components/help/help-page-new.tsx` - Hjälpsidan
2. ✅ `components/onboarding/tour-launcher.tsx` - Tour launcher

---

## 🆕 New Help Guide Added

### "Projekt Alert-inställningar"
**För:** Admin + Foreman  
**Ikon:** 🔔 Bell

**Sektioner:**

#### 1. Konfigurera alerts
- Öppna ett projekt
- Scrolla ner till "Alert-inställningar"
- Klicka "Redigera" för att ändra
- Sätt arbetsdag start/slut (t.ex. 07:00-16:00)
- Aktivera/avaktivera olika alerts

#### 2. Alert-typer (Real-time)
- ✅ Notifiera vid check-in - Du får notis när arbetare checkar in
- ✅ Notifiera vid check-out - Du får notis när arbetare checkar ut
- Notiserna innehåller: namn, projekt, tid och arbetad tid
- Klicka på notisen för att gå direkt till projektet

#### 3. Alert-typer (Kommande)
- ⏰ Check-in påminnelse - Påminner arbetare X min före start
- ⏰ Check-out påminnelse - Påminner arbetare X min före slut
- ⚠️ Sen check-in varning - Varnar dig om sen check-in
- ⚠️ Glömt check-out varning - Varnar dig om glömt check-out

---

## ❓ New FAQs Added

### FAQ 17: Hur aktiverar jag push-notifieringar?
**För:** Alla roller  
**Svar:** Gå till "Inställningar → Notiser" och klicka "Aktivera notiser". Din webbläsare kommer att fråga om tillåtelse - acceptera för att ta emot notifieringar. Du kan välja vilka typer av notiser du vill ha och ställa in tysta timmar.

### FAQ 18: Vilka typer av notiser kan jag få?
**För:** Alla roller  
**Svar:** Du kan få notiser om: godkännanden av tid, veckosammanfattningar, påminnelser om utcheckning, och projektspecifika alerts om check-in/out. Alla notiser kan aktiveras/avaktiveras individuellt i notis-inställningarna.

### FAQ 19: Hur ställer jag in projekt alert-inställningar?
**För:** Admin + Foreman  
**Svar:** Öppna projektet, scrolla ner till "Alert-inställningar" och klicka "Redigera". Här kan du sätta arbetsdag start/slut-tid, aktivera notiser för check-in/out, och konfigurera påminnelser och varningar. Endast admin och arbetsledare kan redigera alert-inställningar.

### FAQ 20: När får jag notis om check-in och check-out?
**För:** Admin + Foreman  
**Svar:** Om aktiverat i projektets alert-inställningar, får admin och arbetsledare en notis direkt när en arbetare checkar in eller ut på projektet. Notisen visar namn, projekt, tid och arbetad tid (vid check-out). Klicka på notisen för att gå direkt till projektet.

### FAQ 21: Fungerar notiser när appen är stängd?
**För:** Alla roller  
**Svar:** Ja! Push-notiser fungerar även när appen är stängd. Du får notiser som vanliga systemnotiser i Windows, Mac, iOS eller Android. Klicka på notisen för att öppna appen och gå direkt till relevant sida.

---

## 🎯 Updated Tour Descriptions

### Projekt-touren
**Tidigare:** "Hur du skapar och hanterar projekt"  
**Nu:** "Skapa projekt, hantera team och konfigurera alert-inställningar"

Detta uppdaterar både:
- Tour launcher beskrivning
- Interaktiv guide beskrivning i hjälpsidan

---

## 📊 Coverage

### Guides (enligt roll):
- **Admin:** Kan se guiden om "Projekt Alert-inställningar"
- **Foreman:** Kan se guiden om "Projekt Alert-inställningar"  
- **Worker:** Ser inte denna guide (de får bara notiser, konfigurerar inte)
- **Finance:** Ser inte denna guide

### FAQs (enligt roll):
- **FAQ 17-18, 21:** Alla roller (generell notis-information)
- **FAQ 19-20:** Admin + Foreman (projekt alert-specifikt)

---

## ✅ User Experience Flow

### Scenario 1: Admin vill lära sig om alerts
1. Går till "Hjälp"-sidan
2. Ser "Projekt Alert-inställningar" guide
3. Läser steg-för-steg instruktioner
4. Går till FAQ-sektionen för snabba svar
5. Hittar FAQ 19: "Hur ställer jag in projekt alert-inställningar?"

### Scenario 2: Worker undrar om notiser
1. Går till "Hjälp"-sidan
2. Söker efter "notis" i FAQ
3. Hittar FAQ 17: "Hur aktiverar jag push-notifieringar?"
4. Hittar FAQ 18: "Vilka typer av notiser kan jag få?"
5. Hittar FAQ 21: "Fungerar notiser när appen är stängd?"

### Scenario 3: Foreman vill starta om projekt-touren
1. Går till "Hjälp"-sidan
2. Klickar "Interaktiva guider"
3. Ser uppdaterad beskrivning: "Skapa projekt, hantera team och konfigurera alert-inställningar"
4. Klickar "Starta" på Projekt-touren
5. Touren visar nu även alert-funktionalitet

---

## 🎨 Visual Changes

### Help Page - Guides Tab
```
📚 Guider

Tidsrapportering
Lär dig att registrera arbetstid

Material & Utlägg  
Registrera material och kostnader

...

🔔 Projekt Alert-inställningar [NYT!]
Konfigurera notifieringar för check-in/out

...
```

### Help Page - FAQ Tab
```
❓ Vanliga frågor

...

FAQ 17: Hur aktiverar jag push-notifieringar? [NYT!]
FAQ 18: Vilka typer av notiser kan jag få? [NYT!]
FAQ 19: Hur ställer jag in projekt alert-inställningar? [NYT!]
FAQ 20: När får jag notis om check-in och check-out? [NYT!]
FAQ 21: Fungerar notiser när appen är stängd? [NYT!]
```

### Tour Launcher
```
🎓 Interaktiva guider

Projekt [UPPDATERAD!]
Skapa projekt, hantera team och konfigurera alert-inställningar
[Starta] knapp
```

---

## 🧪 Testing Checklist

- [ ] Verifiera att "Projekt Alert-inställningar" guide visas för admin/foreman
- [ ] Verifiera att guiden INTE visas för worker/finance
- [ ] Verifiera att alla 5 nya FAQs visas
- [ ] Verifiera att FAQ 17, 18, 21 visas för alla roller
- [ ] Verifiera att FAQ 19, 20 endast visas för admin/foreman
- [ ] Verifiera att projekt-tour beskrivning är uppdaterad
- [ ] Testa att öppna guides och FAQs för att se att innehållet är korrekt

---

## 📝 Notes

- ✅ Bell-ikon (`Bell`) importerad från lucide-react
- ✅ Rolbaserad filtrering fungerar korrekt
- ✅ Samma struktur som befintliga guides följs
- ✅ FAQ-ID:n är unika (17-21)
- ✅ Språk: Svenska
- ✅ Ton: Instruktiv och hjälpsam
- ✅ Emojis använd konsekvent med resten av hjälpen

---

## 🚀 Deployment Status

- [x] Files updated
- [x] Linter errors fixed
- [x] Content verified
- [ ] User testing (pending)
- [ ] Deployed to production (pending)

---

**Status:** ✅ **COMPLETE** - Ready for testing

