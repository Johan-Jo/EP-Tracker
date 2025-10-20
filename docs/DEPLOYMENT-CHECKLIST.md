# EP Tracker - Deployment Checklist

**Version:** Phase 1 MVP  
**Datum:** 2025-10-19

---

## 🎯 Pre-Deployment

### Code Quality
- [x] Build utan fel (`npm run build` ✅)
- [x] Alla TypeScript-fel fixade
- [x] Critical ESLint errors fixade
- [ ] End-to-end tests körda (Playwright)
- [ ] Performance test genomförd (Lighthouse >85 score)

### Environment Configuration
- [ ] `.env.local` korrekt konfigurerad för production
- [ ] `NEXT_PUBLIC_SUPABASE_URL` verifierad
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` verifierad
- [ ] `SUPABASE_SERVICE_ROLE_KEY` verifierad (server-only)
- [ ] Database connection testad
- [ ] Storage buckets verifierade (public access)

### Database
- [x] Migrations körda i production Supabase
- [x] RLS policies aktiverade för alla tabeller
- [x] Storage buckets skapade (`materials-photos`, `expenses-photos`, `diary-photos`, `checklist-attachments`, `profile-photos`)
- [ ] Seed data för pilot-organisation
- [ ] Backup-strategi dokumenterad

### Security
- [x] RLS policies implementerade
- [x] Server-side auth checks för känsliga routes
- [ ] Rate limiting konfigurerat (om möjligt via Vercel)
- [ ] CORS policies verifierade
- [ ] Secrets aldrig committade till git

---

## 🚀 Vercel Deployment

### Initial Setup
- [ ] Vercel-projekt skapat
- [ ] GitHub repository länkat
- [ ] Environment variables satta i Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Build settings verifierade:
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

### Domain Configuration
- [ ] Custom domain (om tillämpligt)
- [ ] SSL certifikat aktiverat
- [ ] Redirects konfigurerade (www → apex eller vice versa)

### Deployment Environments
- [ ] **Production:** `main` branch → production domain
- [ ] **Preview:** All PRs → preview URLs
- [ ] Edge Functions aktiverade (om behövs)

---

## 🧪 Post-Deployment Verification

### Smoke Tests (Critical Path)
- [ ] **Sign Up:** Nytt konto kan skapas
- [ ] **Sign In:** Inloggning fungerar
- [ ] **Create Organization:** Första organisationen skapas
- [ ] **Invite User:** Användare kan bjudas in
- [ ] **Create Project:** Nytt projekt kan skapas
- [ ] **Start Timer:** Timer startar och stoppar
- [ ] **Create Time Entry:** Manuell tidrapport kan skapas
- [ ] **Add Material:** Material kan registreras
- [ ] **Add Expense:** Utlägg kan registreras
- [ ] **Approve Time:** Tidrapport kan godkännas (admin/foreman)
- [ ] **Export CSV:** Löne-CSV och Faktura-CSV kan exporteras
- [ ] **Offline Mode:** Tidrapport skapas offline → synkas vid återanslutning
- [ ] **PWA Install:** App kan installeras på mobil (iOS/Android)

### Cross-Browser Testing
- [ ] Chrome (senaste version)
- [ ] Safari (senaste version)
- [ ] Firefox (senaste version)
- [ ] Edge (senaste version)

### Mobile Testing
- [ ] iOS Safari (iPhone)
- [ ] Chrome Mobile (Android)
- [ ] PWA installation (iOS & Android)

### Performance Checks
- [ ] Lighthouse score > 85 (Performance)
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Service Worker registreras korrekt

---

## 📊 Monitoring & Observability

### Error Tracking
- [ ] Sentry projekt skapat (optional)
- [ ] Sentry DSN konfigurerad
- [ ] Error boundaries testad (throw error → friendly message)

### Analytics
- [ ] PostHog projekt skapat (optional)
- [ ] PostHog API key konfigurerad
- [ ] Tracking events implementerade:
  - User sign up
  - Project created
  - Time entry created
  - Approval completed
  - CSV exported

### Logging
- [ ] Vercel logs verifierade
- [ ] Console errors granskas
- [ ] API response times övervakas

---

## 👥 Pilot User Onboarding

### Documentation
- [x] Hjälp-sida implementerad i appen (`/dashboard/help`)
- [ ] Pilot User Guide (PDF) skapad
- [ ] Video tutorials inspelerade (optional)
- [ ] FAQ dokumenterad

### Pilot Setup
- [ ] Pilot organization skapad i production
- [ ] Admin user skapad
- [ ] Foreman user skapad
- [ ] Worker user skapad
- [ ] Test project med faser skapat
- [ ] Sample data för demonstration

### Training
- [ ] Admin tränad på:
  - User management
  - Project creation
  - Approval workflow
  - CSV exports
- [ ] Foreman tränad på:
  - Daily diary
  - Crew clock-in
  - Time approval
  - ÄTA management
- [ ] Workers tränade på:
  - Time tracking
  - Material registration
  - Expense reporting
  - Offline mode

---

## 🐛 Known Issues & Workarounds

### Issue #1: PWA Install Banner (iOS)
**Problem:** iOS Safari inte visar install-prompt automatiskt  
**Workaround:** Instruera användare att klicka "Share" → "Add to Home Screen"  
**Status:** ⚠️ Known limitation

### Issue #2: Offline Conflict Resolution
**Problem:** Latest-write-wins inte implementerad  
**Workaround:** Instruera användare att synka innan de loggar ut  
**Status:** ⏳ Planned for Phase 2

### Issue #3: Large Photo Uploads
**Problem:** Stora bilder kan ta lång tid att ladda upp  
**Workaround:** Komprimera bilder before upload (client-side)  
**Status:** ⏳ Planned for Phase 2

---

## ✅ Launch Criteria

Alla punkter nedan **MÅSTE** vara uppfyllda för production launch:

- [ ] ✅ Critical smoke tests passerar
- [ ] ✅ RLS policies verifierade
- [ ] ✅ Offline sync fungerar
- [ ] ✅ CSV export fungerar (löne + faktura)
- [ ] ✅ PWA installerar på iOS och Android
- [ ] ✅ Admin kan bjuda in användare
- [ ] ✅ Foreman kan godkänna tidrapporter
- [ ] ✅ Worker kan registrera tid och material offline
- [ ] ✅ Error boundaries visar vänliga meddelanden
- [ ] ✅ Hjälp-sida tillgänglig för alla users

---

## 📞 Support & Rollback

### Support Kontakt
- **Email:** [din-support-email]
- **Slack:** [pilot-support-channel]
- **Phone:** [support-nummer]

### Rollback Plan
Om kritiska buggar upptäcks i production:

1. **Identifiera problemet:** Granska Vercel logs + Sentry errors
2. **Bedöm severity:**
   - 🔴 **Critical (rollback):** Data loss, auth broken, RLS bypass
   - 🟡 **High (hotfix):** Feature broken, significant UX issue
   - 🟢 **Medium (patch):** Minor bug, cosmetic issue
3. **Rollback (if critical):**
   ```bash
   vercel rollback [previous-deployment-url]
   ```
4. **Kommunicera:** Informera pilot-users via Slack/Email
5. **Fix & Re-deploy:** Fixa issue i dev → test → deploy

---

## 🎉 Post-Launch

### Week 1: Pilot Observation
- [ ] Daily check-ins med pilot users
- [ ] Logga alla bugrapporter
- [ ] Övervaka Sentry/PostHog för fel
- [ ] Samla feedback på UX

### Week 2-4: Iteration
- [ ] Prioritera bugfixes baserat på severity
- [ ] Implementera snabba förbättringar
- [ ] Planera Phase 2 features
- [ ] Expand pilot till fler users

### Success Metrics (Phase 1 Exit)
- [ ] 5+ aktiva users
- [ ] 100+ tidrapporter skapade
- [ ] 50+ godkända tidrapporter
- [ ] 10+ CSV exporter
- [ ] 0 kritiska buggar
- [ ] >80% user satisfaction (survey)

---

## 📝 Notes

- Alla checkboxar ska vara checkade innan production deployment
- Vid osäkerhet, fråga innan launch
- "När i tvivel, kommunicera"
- Beta-flagga synlig i appen för att signalera pilot-status

**Lycka till med launchen! 🚀**

