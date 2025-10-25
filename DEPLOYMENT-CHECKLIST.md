# EPIC 26: Deployment Checklist

## ⚠️ KRITISKT: TESTA LOKALT FÖRST

**🚨 Denna epic får INTE deployas till production utan fullständig testning och godkännande.**

## Status

| Story | Local Dev | Local Tests | Performance | Code Review | Staging | Prod Ready | Deployed |
|-------|-----------|-------------|-------------|-------------|---------|------------|----------|
| 26.1 React Query | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.2 Session Cache | ✅ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.3 Router Nav | 🔄 | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.4 Dashboard | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.5 Client Comp | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.6 Code Split | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.7 DB Queries | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |
| 26.8 Monitoring | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ❌ | ❌ |

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Not Ready

---

## Pre-Deployment Testing Protocol

### Phase 1: Local Development Testing

**För varje story:**

#### 1. Development Server Test
```bash
npm run dev
```

**Test:**
- [ ] App startar utan errors
- [ ] Alla sidor laddar korrekt
- [ ] Ingen console errors
- [ ] Funktionalitet fungerar som förväntat

#### 2. Manual Feature Testing
**Test checklisten för varje story:**

**Story 26.1 - React Query Caching:**
- [ ] Dashboard laddar data
- [ ] Data cachas (verifiera i DevTools)
- [ ] Data refetchas efter 5 minuter
- [ ] Mutations invaliderar cache
- [ ] Offline reconnect fungerar

**Story 26.2 - Session Caching:**
- [ ] Login fungerar
- [ ] Session persists över sidnavigering
- [ ] Ingen dubbel session fetch (check Network tab)
- [ ] Logout fungerar

**Story 26.3 - Router Navigation:**
- [ ] Search fungerar utan page reload
- [ ] Filter fungerar utan page reload
- [ ] Browser back/forward fungerar
- [ ] URL uppdateras korrekt
- [ ] State persists vid navigation

#### 3. Performance Test
```bash
node scripts/performance-test.js
```

**Spara resultat:**
```bash
# Resultat sparas automatiskt i performance-results/
# Jämför före och efter metrics
```

**Metrics att verifiera:**
- [ ] FCP förbättrad (target: < 1.5s)
- [ ] LCP förbättrad (target: < 2.5s)
- [ ] Färre API calls (target: < 5 per page)
- [ ] Mindre bundle size (om tillämpligt)

#### 4. Production Build Test
```bash
npm run build
npm start

# Testa production build
TEST_URL=http://localhost:3000 node scripts/performance-test.js
```

**Verifiera:**
- [ ] Build lyckas utan errors
- [ ] Production optimizations applicerade
- [ ] Performance lika bra eller bättre än dev

---

### Phase 2: Code Review

**Innan merge:**

- [ ] Code följer projektets standards
- [ ] Kommentarer är tydliga och beskrivande
- [ ] Inga TODO/FIXME utan issues
- [ ] TypeScript errors fixade
- [ ] ESLint errors fixade
- [ ] Inga console.log() kvar (utom nödvändig logging)

**Review checklist:**
- [ ] Kod granskas av minst 1 teammedlem
- [ ] Performance förbättringar verifierade
- [ ] Ingen funktionalitet trasig
- [ ] Edge cases hanterade
- [ ] Error handling implementerad

---

### Phase 3: Integration Testing

**Testa att allt fungerar tillsammans:**

#### Critical User Journeys
1. **New User Flow**
   - [ ] Sign up
   - [ ] Email verification
   - [ ] Complete setup
   - [ ] First dashboard load

2. **Daily Usage Flow**
   - [ ] Login
   - [ ] View dashboard
   - [ ] Check in/out time
   - [ ] View projects
   - [ ] Log material
   - [ ] Log out

3. **Admin Flow**
   - [ ] Login as admin
   - [ ] View all users
   - [ ] Create project
   - [ ] Approve time entries
   - [ ] View reports

#### Cross-Page Navigation
- [ ] Dashboard → Projects → Project Detail
- [ ] Dashboard → Time → Time Entry
- [ ] Dashboard → Materials → Material Entry
- [ ] All back navigation works
- [ ] Search/filter persists correctly

#### Offline Testing
- [ ] Disable network
- [ ] App shows offline banner
- [ ] Cached data accessible
- [ ] Enable network
- [ ] Data syncs correctly

---

### Phase 4: Staging Deployment (if available)

**Deploy to staging environment:**

```bash
# Deploy to staging
git push staging epic-26-performance

# Verify deployment
# Test with staging URL
```

**Staging tests:**
- [ ] All production features work
- [ ] Performance metrics meet targets
- [ ] No new errors in logs
- [ ] Database queries optimized
- [ ] External integrations work (Stripe, etc.)

**Staging Test Users:**
- [ ] Test with real-like data
- [ ] Test with multiple concurrent users
- [ ] Test with slow network conditions
- [ ] Test on mobile devices

---

### Phase 5: Production Deployment Approval

**Requirements for production approval:**

#### Technical Requirements
- [x] All local tests passed
- [x] Performance tests passed
- [x] Code review approved
- [x] Staging tests passed (if applicable)
- [x] No critical bugs found
- [x] Rollback plan documented

#### Documentation Requirements
- [x] Performance metrics documented (före/efter)
- [x] Breaking changes noted (if any)
- [x] Deployment instructions updated
- [x] Monitoring alerts configured
- [x] Team notified of deployment

#### Approval Sign-off
- [ ] Tech Lead: ___________________ Date: _______
- [ ] Project Lead: ________________ Date: _______
- [ ] QA (if applicable): ___________ Date: _______

---

## Production Deployment Steps

**⚠️ ENDAST efter godkännande ovan**

### Step 1: Pre-Deployment

```bash
# 1. Ensure you're on latest main
git checkout main
git pull origin main

# 2. Merge epic branch
git merge epic-26-performance

# 3. Final tests
npm run build
npm test # if tests exist

# 4. Create deployment tag
git tag -a v1.x.x-perf-optimization -m "EPIC 26: Performance Optimization"
```

### Step 2: Deployment

**Vercel Deployment:**
```bash
# Push to main triggers automatic deployment
git push origin main
git push origin --tags

# Monitor deployment at vercel.com/dashboard
```

**Manual Deployment (if needed):**
```bash
vercel --prod
```

### Step 3: Post-Deployment Verification

**Immediately after deployment:**

#### 1. Smoke Tests (within 5 minutes)
- [ ] Site is accessible
- [ ] Login works
- [ ] Dashboard loads
- [ ] No 5xx errors in logs

#### 2. Performance Verification (within 15 minutes)
```bash
# Run production performance test
TEST_URL=https://eptracker.app node scripts/performance-test.js
```

- [ ] FCP < 1.5s
- [ ] LCP < 2.5s
- [ ] No performance regression
- [ ] API calls reduced as expected

#### 3. Monitoring (within 1 hour)
- [ ] Check Vercel Analytics
- [ ] Check error rates (should not spike)
- [ ] Check API response times
- [ ] Check user feedback/support tickets

#### 4. User Testing (within 24 hours)
- [ ] Have 2-3 users test critical flows
- [ ] Monitor for reported issues
- [ ] Check support channels

---

## Rollback Procedure

**If critical issues found in production:**

### Quick Rollback
```bash
# 1. Rollback in Vercel dashboard
# Go to Deployments → Previous deployment → Promote to Production

# OR via CLI:
vercel rollback
```

### Manual Rollback
```bash
# 1. Revert commits
git revert HEAD  # or specific commit

# 2. Push revert
git push origin main

# 3. Verify rollback successful
```

### After Rollback
- [ ] Verify site works correctly
- [ ] Document what went wrong
- [ ] Create fix plan
- [ ] Re-test before next deployment attempt

---

## Story-Specific Notes

### Story 26.1 - React Query Caching
**Rollback risk:** LOW
- Reverting config file is simple
- No database changes
- No breaking changes

### Story 26.2 - Session Caching
**Rollback risk:** LOW
- Only changes caching behavior
- No API changes
- Auth still works without cache

### Story 26.3 - Router Navigation
**Rollback risk:** MEDIUM
- Changes navigation behavior
- Test thoroughly in staging
- Users may notice different behavior

### Stories 26.4-26.8
**Rollback risk:** To be assessed per story

---

## Contact & Support

**Issues during deployment?**
- Tech Lead: [Contact info]
- DevOps: [Contact info]
- Emergency: [Contact info]

---

## Version History

| Date | Version | Changes | Deployed By | Status |
|------|---------|---------|-------------|--------|
| 2025-10-25 | - | Initial development | - | 🔧 LOCAL DEV |
| - | - | - | - | ⏳ PENDING |

---

**Last Updated:** 2025-10-25  
**Status:** 🔧 LOCAL DEVELOPMENT ONLY  
**Production Ready:** ❌ NO

**REMEMBER: Test first, deploy later. Safety first! 🛡️**

