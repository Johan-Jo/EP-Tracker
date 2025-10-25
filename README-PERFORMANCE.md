# Performance Testing & Optimization Guide

## ⚠️ VIKTIGT: LOCAL TESTING ONLY

**🚨 Ändringar i EPIC 26 är för närvarande i LOKAL UTVECKLING och får INTE deployas till production utan fullständig testning och godkännande.**

Se `DEPLOYMENT-CHECKLIST.md` för deployment-process.

---

## 📋 Overview

Detta projekt har genomgått en omfattande prestandaanalys som identifierat **kritiska problem** som måste åtgärdas.

## 🚨 Nuvarande Status

**STATUS:** 🔴 KRITISKT - Omedelbara åtgärder krävs

**Huvudproblem:**
1. **React Query caching är disabled** → 70% onödiga API-anrop
2. **Session caching är disabled** → Dubbla databaskörningar på varje sida
3. **Full page reloads** istället för router navigation → 80% långsammare
4. **12 parallella queries** på dashboard → Ineffektiv datahantering
5. **152 client components** → Stora bundles, långsam load

**Estimerad Nuvarande Prestanda:**
- Dashboard: 8-12 sekunder ⛔
- Navigation: 2-4 sekunder ⛔
- Bundle size: >500 KB ⛔

**Mål efter optimering:**
- Dashboard: <2.5 sekunder ✅
- Navigation: <500ms ✅
- Bundle size: <250 KB ✅

**Förväntad förbättring: 65-75% snabbare** 🚀

## 📚 Dokumentation

### Huvuddokument

1. **[PERFORMANCE-AUDIT-SUMMARY.md](./PERFORMANCE-AUDIT-SUMMARY.md)**
   - Executive summary av alla problem
   - Prioriterad lista med fixes
   - Cost-benefit analys
   - Rekommenderad action plan
   - **START HÄR!** 👈

2. **[PERFORMANCE-IMPROVEMENT-EPIC.md](./PERFORMANCE-IMPROVEMENT-EPIC.md)**
   - Detaljerad implementation guide
   - 8 stories med konkreta tasks
   - Kod-exempel för varje fix
   - 3-4 veckors plan
   - Testing strategy

3. **[PERFORMANCE-TEST-PLAN.md](./PERFORMANCE-TEST-PLAN.md)**
   - Komplett testplan
   - Benchmark strategies
   - Load testing guide
   - Monitoring setup
   - Success criteria

## 🎯 Quick Start - Fixa de Värsta Problemen

### Week 1: Kritiska Fixes (P0)

Dessa 3 fixes ger **65% förbättring** på **3-4 dagar**:

#### 1. Fix React Query Caching (4-6 timmar)

**Fil:** `lib/providers/query-provider.tsx`

**Ändra från:**
```typescript
staleTime: 0,
gcTime: 0,
```

**Till:**
```typescript
staleTime: 5 * 60 * 1000, // 5 minutes
gcTime: 10 * 60 * 1000, // 10 minutes
refetchOnReconnect: true,
```

**Impact:** 70-80% färre API-anrop ✅

#### 2. Fix Session Caching (6-8 timmar)

**Fil:** `lib/auth/get-session.ts`

**Lägg till:**
```typescript
import { cache } from 'react';

export const getSession = cache(async () => {
  // ... existing code
});
```

**Impact:** 50% färre session queries ✅

#### 3. Fix Full Page Reloads (1-2 dagar)

**Fil:** `app/dashboard/projects/projects-client.tsx` (+ 16 andra)

**Ändra från:**
```typescript
window.location.href = newUrl;
```

**Till:**
```typescript
router.push(newUrl);
```

**Impact:** 80-90% snabbare navigation ✅

## 🧪 Kör Performance Tests

### Prerequisites

```bash
npm install puppeteer
```

### Basic Test

```bash
# Start dev server
npm run dev

# I en annan terminal, kör test
node scripts/performance-test.js
```

### Med Produktion Build

```bash
# Build production version
npm run build
npm start

# Kör test mot production
TEST_URL=http://localhost:3000 node scripts/performance-test.js
```

### Med Autentisering

```bash
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node scripts/performance-test.js
```

### Resultat

Testen genererar:
- Console output med färgkodade metrics
- JSON-fil i `performance-results/`
- Rekommendationer baserat på resultat

## 📊 Performance Metrics

### Core Web Vitals

| Metric | Target | Current (Est.) | Status |
|--------|--------|----------------|--------|
| FCP | < 1.5s | 4-6s | ⛔ |
| LCP | < 2.5s | 6-9s | ⛔ |
| TTI | < 3.5s | 8-12s | ⛔ |
| CLS | < 0.1 | Unknown | ⚠️ |

### Bundle Metrics

| Metric | Target | Current (Est.) | Status |
|--------|--------|----------------|--------|
| Main Bundle | < 200 KB | ~300 KB | ⛔ |
| Total JS | < 500 KB | >500 KB | ⛔ |
| Requests | < 50 | ~60-80 | ⚠️ |

### API Metrics

| Page | Target | Current | Status |
|------|--------|---------|--------|
| Dashboard | < 5 | 12 | ⛔ |
| Projects | < 3 | 4-6 | ⚠️ |
| Time | < 3 | 3-5 | ⚠️ |

## 🔧 Tools

### Development

```bash
# Analyze bundle size
npm run build

# With bundle analyzer (if configured)
ANALYZE=true npm run build
```

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to "Performance" tab
3. Record page load
4. Analyze:
   - Loading time
   - Scripting time
   - Rendering time
   - Network requests

### Lighthouse

```bash
# Install globally
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view

# For authenticated pages
lighthouse http://localhost:3000/dashboard --view --extra-headers="{\"Cookie\":\"your-session-cookie\"}"
```

### Network Analysis

1. Open Chrome DevTools
2. Go to "Network" tab
3. Reload page
4. Check:
   - Number of requests
   - Total size
   - Load time
   - API calls

## 📈 Implementation Timeline

### Week 1: Critical Fixes (P0)
- [ ] Day 1-2: React Query + Session caching
- [ ] Day 3-5: Remove full page reloads
- **Expected: 65% improvement**

### Week 2-3: High Priority (P1)
- [ ] Week 2: Optimize dashboard queries
- [ ] Week 3: Reduce client components
- [ ] Week 3: Implement code splitting
- **Expected: Additional 40% improvement**

### Week 4: Polish & Deploy
- [ ] Database optimization
- [ ] Setup monitoring
- [ ] Documentation
- [ ] Production deployment

## 🎯 Success Criteria

### Must Have (Before Production)
- [ ] Dashboard FCP < 1.5s
- [ ] Dashboard LCP < 2.5s
- [ ] All pages TTI < 3.5s
- [ ] API response < 500ms (p95)
- [ ] Zero critical performance issues

### Should Have
- [ ] Main bundle < 200 KB
- [ ] Database queries < 100ms (p95)
- [ ] < 5 API calls per page
- [ ] Proper code splitting

### Nice to Have
- [ ] Perfect Lighthouse score (100)
- [ ] Service Worker caching
- [ ] Prefetching critical routes

## 🚀 Quick Wins

### Immediate Actions (No Code Change)

1. **Enable Production Mode**
   - Set `NODE_ENV=production`
   - Use production build

2. **CDN for Static Assets**
   - Vercel does this automatically
   - Verify in Network tab

3. **Database Indexes**
   - Run index creation scripts
   - See `PERFORMANCE-IMPROVEMENT-EPIC.md`

## 📖 Learning Resources

### Next.js Performance
- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Next.js Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### React Query Performance
- [React Query Performance Guide](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Caching Strategies](https://tanstack.com/query/latest/docs/react/guides/caching)

### Web Performance
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

## 🆘 Support

### Common Issues

#### "Tests fail with authentication error"
- Set correct `TEST_EMAIL` and `TEST_PASSWORD`
- Or test only public pages

#### "Lighthouse score is low"
- Check each category separately
- Focus on Performance first
- Use recommendations in report

#### "Bundle size is too large"
- Run `ANALYZE=true npm run build`
- Identify large dependencies
- Implement code splitting

### Get Help

1. Review documentation in order:
   - PERFORMANCE-AUDIT-SUMMARY.md
   - PERFORMANCE-IMPROVEMENT-EPIC.md
   - PERFORMANCE-TEST-PLAN.md

2. Check specific problem area:
   - Caching issues → Story 1 & 2
   - Navigation issues → Story 3
   - Load time → Story 4
   - Bundle size → Story 5 & 6

## 🎉 Benefits After Optimization

### User Experience
- ✅ 65-75% faster page loads
- ✅ Instant navigation
- ✅ Better mobile experience
- ✅ Improved offline capability

### Business Impact
- ✅ Lower bounce rate
- ✅ Better SEO rankings
- ✅ Reduced infrastructure costs
- ✅ Higher user satisfaction

### Developer Experience
- ✅ Better code patterns
- ✅ Easier maintenance
- ✅ Faster development
- ✅ Modern best practices

## 🔄 Next Steps

1. **Read** `PERFORMANCE-AUDIT-SUMMARY.md`
2. **Review** `PERFORMANCE-IMPROVEMENT-EPIC.md`
3. **Run** baseline performance test
4. **Start** with Week 1 fixes
5. **Test** after each change
6. **Monitor** in production

---

**Last Updated:** 2025-10-25  
**Status:** 🔴 CRITICAL - Action Required  
**Priority:** P0 - Start Immediately

**Questions?** See the detailed documentation files.

