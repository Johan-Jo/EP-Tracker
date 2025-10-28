# 📱 iOS PWA Notis Debug Guide

## Problem
- ✅ PWA installerad
- ✅ Notis-tillstånd beviljat (grönt)
- ✅ Test-notis säger "skickad"
- ❌ Ingen notis visas på iPhone

## Möjliga orsaker

### 1. iOS Fokusläge aktiverat
- Gå till **Kontrollcenter** (svajpa ner från övre högra hörnet)
- Se till att **"Fokus"** är AV (ingen ikon aktiv)

### 2. EP-Tracker inte i Notis-listan
- **iOS Inställningar → Notiser**
- EP-Tracker måste finnas där och ha allt aktiverat

### 3. Service Worker inte aktiv
- Stäng PWA:n helt (svajpa upp från botten)
- Öppna den igen
- Vänta 5 sekunder
- Testa igen

### 4. FCM Token inte registrerad
Kolla i browser console (om möjligt):
```
Should see: "FCM Token: [long string]"
```

## Snabb Lösning: Desktop Test

**För att verifiera att SERVERSIDAN fungerar:**

1. Öppna **Chrome** på din **dator**
2. Gå till `https://eptracker.app`
3. Logga in som **oi@johan.com.br**
4. Gå till **Inställningar → Notiser**
5. Klicka **"Aktivera notiser"**
6. Tillåt i Chrome-prompten
7. Klicka **"Skicka test-notis"**

**Om du får notis på desktop:** Problemet är iOS-specifikt (PWA-cache eller iOS-config)
**Om du INTE får notis på desktop:** Problemet är på server-sidan

## iOS PWA Workaround

**Om inget annat fungerar:**

### Metod A: Använd Safari istället för PWA
- Öppna `eptracker.app` i **Safari** (inte PWA)
- Gå till Inställningar → Notiser
- Aktivera notiser
- Test

Safari har bättre notis-stöd än iOS PWA i vissa fall.

### Metod B: Använd Desktop/Android
- Använd desktop-versionen för admin-uppgifter
- iOS PWA för workers (check-in/out fungerar)
- Notiser går till desktop

## Nästa steg

1. **Kolla iOS Fokusläge** (vanligaste orsaken!)
2. **Testa på Desktop Chrome** (verifierar server)
3. **Testa Safari iOS** (workaround)
4. **Rapportera resultat**

