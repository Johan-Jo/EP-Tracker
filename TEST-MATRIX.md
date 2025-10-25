# EP Tracker - Test Matrix

**Version:** 1.0  
**Datum:** 2025-10-24

---

## Snabbreferens - Test Coverage Matrix

### ✅ = Måste testas | ⚠️ = Rekommenderat | 📝 = Dokumentera resultat

| Modul | Feature | Worker | Foreman | Admin | Finance | Super Admin | Prioritet |
|-------|---------|---------|---------|-------|---------|-------------|-----------|
| **Autentisering** |
| | Sign-up | ✅ | ✅ | ✅ | ✅ | ✅ | Kritisk |
| | Sign-in | ✅ | ✅ | ✅ | ✅ | ✅ | Kritisk |
| | Magic Link | ✅ | ✅ | ✅ | ✅ | ✅ | Medel |
| | Logout | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Session timeout | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Medel |
| **Dashboard** |
| | Översikt | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Statskort | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Desktop nav | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Mobile nav | ✅ | ✅ | ✅ | ✅ | ✅ | Kritisk |
| **Projekt** |
| | Lista projekt | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Skapa projekt | - | - | ✅ | - | ✅ | Kritisk |
| | Redigera projekt | - | ⚠️ | ✅ | - | ✅ | Hög |
| | Projektdetaljer | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Faser | - | ⚠️ | ✅ | - | ✅ | Medel |
| | Arbetsorder | ✅ | ✅ | ✅ | ✅ | ✅ | Medel |
| | Projektteam | - | ✅ | ✅ | - | ✅ | Medel |
| **Tidrapportering** |
| | Timer widget | ✅ | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Starta timer | ✅ | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Stoppa timer | ✅ | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Timer persistence | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Manuell tidrapport | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Se egna tidrapporter | ✅ | ✅ | ✅ | ✅ | ✅ | Kritisk |
| | Se andras tidrapporter | - | ✅ | ✅ | ✅ | ✅ | Kritisk |
| | Redigera egen tidrapport | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Redigera andras tidrapport | - | - | ✅ | - | ✅ | Kritisk |
| | Ta bort tidrapport | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Starta bemanning | - | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Filter tidrapporter | ✅ | ✅ | ✅ | ✅ | ✅ | Medel |
| **Material** |
| | Skapa material | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Material med foto | ✅ | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Material utan foto | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Se egna material | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Se andras material | - | ✅ | ✅ | ✅ | ✅ | Kritisk |
| | Redigera material | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Ta bort material | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Fotogalleri | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Filter material | ✅ | ✅ | ✅ | ✅ | ✅ | Medel |
| **Utlägg** |
| | Skapa utlägg | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Utlägg med kvitto | ✅ | ✅ | ✅ | - | ⚠️ | Kritisk |
| | VAT toggle | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Se utlägg | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Redigera utlägg | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Ta bort utlägg | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| **Milersättning** |
| | Skapa milersättning | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Standard rate | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Custom rate | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Km → mil konvertering | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Redigera milersättning | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| **ÄTA** |
| | Skapa ÄTA | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | ÄTA med foton | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Digital signatur | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Skicka för godkännande | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Godkänn ÄTA | - | ⚠️ | ✅ | - | ⚠️ | Kritisk |
| | Redigera ÄTA | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| **Dagbok** |
| | Skapa dagboksinlägg | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Väder & temperatur | ✅ | ✅ | ✅ | ✅ | ⚠️ | Medel |
| | Dagbok med foton | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Kalendervy | ✅ | ✅ | ✅ | ✅ | ⚠️ | Medel |
| **Checklistor** |
| | Välj mall | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Skapa från mall | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Checka av items | ✅ | ✅ | ✅ | - | ⚠️ | Hög |
| | Lägg till anteckningar | ✅ | ✅ | ✅ | - | ⚠️ | Medel |
| | Progress tracking | ✅ | ✅ | ✅ | ✅ | ⚠️ | Medel |
| **Godkännanden** |
| | Veckoöversikt | - | ✅ | ✅ | ✅ | ⚠️ | Kritisk |
| | Granska tidrapporter | - | ✅ | ✅ | ✅ | ⚠️ | Kritisk |
| | Granska material | - | ✅ | ✅ | ✅ | ⚠️ | Kritisk |
| | Godkänn vecka | - | ⚠️ | ✅ | ✅ | ⚠️ | Kritisk |
| | Lås period | - | ⚠️ | ✅ | ⚠️ | ⚠️ | Hög |
| | Export lönerapport CSV | - | ⚠️ | ✅ | ✅ | ⚠️ | Kritisk |
| | Export faktura CSV | - | ⚠️ | ✅ | ✅ | ⚠️ | Kritisk |
| **Planering** |
| | Veckoplanering grid | - | ✅ | ✅ | - | ⚠️ | Hög |
| | Skapa tilldelning | - | ✅ | ✅ | - | ⚠️ | Hög |
| | Drag-and-drop | - | ✅ | ✅ | - | ⚠️ | Kritisk |
| | Redigera tilldelning | - | ✅ | ✅ | - | ⚠️ | Medel |
| | Ta bort tilldelning | - | ✅ | ✅ | - | ⚠️ | Medel |
| | Projektfilter | - | ✅ | ✅ | - | ⚠️ | Medel |
| | Kapacitetsindikatorer | - | ✅ | ✅ | - | ⚠️ | Medel |
| | Konfliktdetektering | - | ✅ | ✅ | - | ⚠️ | Medel |
| | Mobile Today-lista | ✅ | ✅ | ✅ | - | - | Kritisk |
| | Checka in jobb | ✅ | ✅ | ✅ | - | - | Kritisk |
| | Checka ut jobb | ✅ | ✅ | ✅ | - | - | Kritisk |
| | Navigation till plats | ✅ | ✅ | ✅ | - | - | Hög |
| **Inställningar** |
| | Visa profil | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Redigera profil | ✅ | ✅ | ✅ | ✅ | ✅ | Hög |
| | Upload avatar | ✅ | ✅ | ✅ | ✅ | ✅ | Medel |
| | Organisationsinställningar | - | - | ✅ | - | ✅ | Kritisk |
| | Användarlista | - | - | ✅ | - | ✅ | Hög |
| | Bjud in användare | - | - | ✅ | - | ✅ | Kritisk |
| | Ändra användarroll | - | - | ✅ | - | ✅ | Kritisk |
| | Inaktivera användare | - | - | ✅ | - | ✅ | Hög |
| **Super Admin** |
| | Org-lista | - | - | - | - | ✅ | Kritisk |
| | Org-detaljer | - | - | - | - | ✅ | Hög |
| | Redigera org | - | - | - | - | ✅ | Hög |
| | Global användarlista | - | - | - | - | ✅ | Kritisk |
| | Sök användare | - | - | - | - | ✅ | Hög |
| | Ändra användarroll (global) | - | - | - | - | ✅ | Kritisk |
| | Billing översikt | - | - | - | - | ✅ | Kritisk |
| | Stripe Customer Portal | - | - | - | - | ✅ | Kritisk |
| | System analytics | - | - | - | - | ✅ | Medel |
| | Audit logs | - | - | - | - | ✅ | Medel |
| | Email logs | - | - | - | - | ✅ | Medel |

---

## Testomfattning per testtyp

### Funktionell testning
- [ ] Autentisering & Onboarding (8 testfall)
- [ ] Dashboard & Navigation (6 testfall)
- [ ] Projekthantering (12 testfall)
- [ ] Tidrapportering (15 testfall)
- [ ] Material/Utlägg/Milersättning (15 testfall)
- [ ] ÄTA (8 testfall)
- [ ] Dagbok (5 testfall)
- [ ] Checklistor (6 testfall)
- [ ] Godkännanden & Export (10 testfall)
- [ ] Planering (8 testfall)
- [ ] Super Admin (15 testfall)

**Total:** ~108 funktionella testfall

### Säkerhetstestning
- [ ] RBAC - Worker permissions (SEC-001)
- [ ] RBAC - Foreman permissions (SEC-002)
- [ ] RBAC - Finance read-only (SEC-003)
- [ ] Multi-tenancy isolation (SEC-004)
- [ ] XSS protection (SEC-005)
- [ ] Session timeout (SEC-006)
- [ ] Logout security (SEC-007)

**Total:** 7 säkerhetstestfall

### Prestandatestning
- [ ] Initial page load (PERF-001)
- [ ] Navigation speed (PERF-002)
- [ ] API response times (PERF-003)
- [ ] Large dataset (1000+ entries) (PERF-004)

**Total:** 4 prestandatestfall

### Kompatibilitetstestning
- [ ] Desktop browsers (COMP-001)
- [ ] Mobile browsers (COMP-002)
- [ ] Breakpoints/Skärmstorlekar (COMP-003)

**Total:** 3 kompatibilitetstestfall

### Offline & PWA-testning
- [ ] PWA installation iOS (PWA-001)
- [ ] PWA installation Android (PWA-002)
- [ ] Offline queue - single (OFFLINE-001)
- [ ] Offline queue - multiple (OFFLINE-002)
- [ ] Service worker caching (OFFLINE-003)

**Total:** 5 offline/PWA-testfall

### Användbarhetstestning
- [ ] Keyboard navigation (UX-001)
- [ ] Screen reader (UX-002)
- [ ] Swedish language (LANG-001)
- [ ] English fallback (LANG-002)
- [ ] Form validation (ERR-001)
- [ ] Network error handling (ERR-002)

**Total:** 6 användbarhetstestfall

### Integrationstestning
- [ ] Stripe subscription (STRIPE-001)
- [ ] Stripe webhooks (STRIPE-002)
- [ ] Welcome email (EMAIL-001)
- [ ] Invitation email (EMAIL-002)
- [ ] Photo upload Storage (STORAGE-001)

**Total:** 5 integrationstestfall

---

## **Total testomfattning: ~138 testfall**

---

## Uppskattad testtid

### Per modul

| Modul | Testfall | Tid per test | Total tid |
|-------|----------|--------------|-----------|
| Autentisering | 8 | 5 min | 40 min |
| Dashboard | 6 | 5 min | 30 min |
| Projekt | 12 | 8 min | 96 min |
| Tidrapportering | 15 | 8 min | 120 min |
| Material/Utlägg/Mil | 15 | 8 min | 120 min |
| ÄTA | 8 | 8 min | 64 min |
| Dagbok | 5 | 8 min | 40 min |
| Checklistor | 6 | 8 min | 48 min |
| Godkännanden | 10 | 10 min | 100 min |
| Planering | 8 | 10 min | 80 min |
| Super Admin | 15 | 10 min | 150 min |
| Säkerhet | 7 | 15 min | 105 min |
| Prestanda | 4 | 15 min | 60 min |
| Kompatibilitet | 3 | 60 min | 180 min |
| Offline/PWA | 5 | 10 min | 50 min |
| Användbarhet | 6 | 15 min | 90 min |
| Integration | 5 | 15 min | 75 min |

**Total uppskattad tid:** ~1,448 minuter ≈ **24 timmar**

### Testomgångar rekommenderade

#### 🔥 Critical Path (Prioritet 1) - 8 timmar
Kritiska features som måste fungera för grundläggande användning:
- Autentisering (sign-in/out)
- Timer widget
- Skapa tidrapport
- Material med foto
- Mobile navigation
- PWA installation
- RBAC grundläggande

#### ⚡ Core Features (Prioritet 2) - 10 timmar
Kärnfunktionalitet för daglig användning:
- Projekt CRUD
- Starta bemanning
- Utlägg & milersättning
- ÄTA godkännande
- Veckoplanering (desktop)
- Mobile Today
- Export CSV

#### 🎯 Extended (Priorit 3) - 6 timmar
Utökad funktionalitet och edge cases:
- Dagbok
- Checklistor
- Super Admin panel
- Analytics
- Offline mode avancerat
- Accessibility

---

## Testprioritering per release

### Release 1.0 (MVP)
**Måste testas innan release:**
- ✅ Alla Critical Path tests
- ✅ Säkerhetstestning (RBAC)
- ✅ PWA installation
- ✅ Mobile kompatibilitet

**Kan skjutas upp:**
- ⚠️ Dagbok
- ⚠️ Checklistor avancerade features
- ⚠️ Super Admin analytics

### Release 1.1 (Planning system)
**Måste testas:**
- ✅ Veckoplanering grid
- ✅ Drag-and-drop
- ✅ Mobile Today
- ✅ Check-in/out

### Release 2.0 (Super Admin)
**Måste testas:**
- ✅ Alla Super Admin features
- ✅ Stripe integration
- ✅ Email system
- ✅ Org management

---

## Browser Test Matrix

| Feature | Chrome | Firefox | Edge | Safari | iOS Safari | Chrome Mobile |
|---------|--------|---------|------|--------|------------|---------------|
| Timer widget | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Photo upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Camera capture | N/A | N/A | N/A | N/A | ✅ | ✅ |
| Drag-and-drop | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| PWA install | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Offline mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Device Test Matrix

| Enhet | OS | Skärmstorlek | Prioritet | Test? |
|-------|----|--------------|-----------| ------|
| iPhone SE | iOS 17 | 375x667 | Hög | [ ] |
| iPhone 12 Pro | iOS 17 | 390x844 | Kritisk | [ ] |
| iPhone 12 Pro Max | iOS 17 | 428x926 | Medel | [ ] |
| iPad | iOS 17 | 768x1024 | Medel | [ ] |
| Samsung Galaxy S21 | Android 13 | 360x800 | Hög | [ ] |
| Google Pixel 6 | Android 13 | 412x915 | Medel | [ ] |
| Desktop 1080p | Windows/Mac | 1920x1080 | Kritisk | [ ] |
| Desktop 4K | Windows/Mac | 2560x1440 | Medel | [ ] |

---

## Risk Matrix

| Risk | Sannolikhet | Impact | Prioritet | Mitigation |
|------|-------------|--------|-----------|------------|
| PWA installation misslyckas | Medel | Kritisk | Hög | Testa på riktiga enheter |
| Offline sync data loss | Låg | Kritisk | Hög | Omfattande offline-testning |
| RBAC-bypass | Låg | Kritisk | Hög | Security audit + penetration testing |
| Cross-org data leak | Låg | Kritisk | Hög | Multi-tenancy testing |
| Photo upload timeout | Medel | Medel | Medel | Testa olika filstorlekar |
| Timer inte persisterar | Medel | Hög | Hög | Regression testing |
| Export CSV felaktig | Låg | Hög | Medel | Validera export-format |

---

## Test Environment Setup

### Utvecklingsmiljö
```bash
# Start dev server
npm run dev

# URL
http://localhost:3000
```

### Testdata
```sql
-- Skapa testorganisationer
INSERT INTO organizations (name) VALUES
  ('Test Org Alpha'),
  ('Test Org Beta'),
  ('Test Org Gamma');

-- Skapa testanvändare för varje roll
-- Se huvudsaklig testplan för detaljer
```

### Test Credentials
**Obs:** Lagra INTE riktiga credentials i denna fil!

- Admin: `admin@test.local`
- Foreman: `foreman@test.local`
- Worker: `worker@test.local`
- Finance: `finance@test.local`
- Super Admin: `superadmin@test.local`

---

## Testrapport Template

**Testomgång:** [ID]  
**Datum:** [YYYY-MM-DD]  
**Testare:** [Namn]

| Test ID | Status | Notes |
|---------|--------|-------|
| AUTH-001 | ✅ PASS | |
| AUTH-002 | ✅ PASS | |
| TIME-001 | ❌ FAIL | Timer återställs efter refresh |
| ... | | |

**Sammanfattning:**
- **Godkända:** 120
- **Misslyckade:** 8
- **Blockerade:** 2
- **Success Rate:** 92%

---

## Quick Test Commands

```bash
# TypeScript check
npx tsc --noEmit

# Linting
npm run lint

# Build test
npm run build

# Start production build
npm run start

# Test offline mode
# DevTools → Network → Offline

# Clear cache & storage
# DevTools → Application → Clear storage
```

---

**Senast uppdaterad:** 2025-10-24  
**Version:** 1.0

