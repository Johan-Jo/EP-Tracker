# EP-Tracker Performance Test Plan

## Executive Summary

Detta dokument beskriver en omfattande prestandatestplan för EP-Tracker-applikationen. Efter en initial kodanalys har vi identifierat flera kritiska prestandaproblem som måste åtgärdas.

## Identifierade Prestandaproblem

### 🚨 KRITISKA PROBLEM

#### 1. React Query - Ingen Caching (HÖGSTA PRIORITET)
**Fil:** `lib/providers/query-provider.tsx`
```typescript
staleTime: 0,
gcTime: 0,
```
**Problem:** All data hämtas på nytt vid varje rendering. Detta är katastrofalt för prestanda.
**Impact:** Onödiga API-anrop, långsam UI, hög serverbelastning

#### 2. Session Management - Ingen Caching
**Fil:** `lib/auth/get-session.ts`
```typescript
// NO CACHING - Fresh data on every call for development
```
**Problem:** Session hämtas från databasen vid varje sidladdning (layout + page = 2x queries)
**Impact:** Dubbla databaskörningar på varje sida, långsam initial load

#### 3. Full Page Reloads
**Fil:** `app/dashboard/projects/projects-client.tsx`
```typescript
window.location.href = newUrl;
```
**Problem:** Använder full page reload istället för Next.js router navigation
**Impact:** Förlorar alla fördelar med SPA, mycket långsam navigation

#### 4. Dashboard - 12 Parallella Queries
**Fil:** `app/dashboard/page.tsx`
**Problem:** 12 separata Supabase-queries körs parallellt på varje dashboard-load
**Impact:** Hög latens, överbelastad databas

### ⚠️ HÖGA PROBLEM

#### 5. För Många Client Components (152 st)
**Problem:** 152 komponenter använder 'use client', vilket förhindrar Server-Side Rendering
**Impact:** Större JavaScript-bundles, långsammare initial load

#### 6. Ingen Proper Code Splitting
**Problem:** Ingen dynamisk import av stora komponenter
**Impact:** Stora bundle sizes, långsam initial load

#### 7. Ineffektiva Database Queries
**Problem:** Många queries använder inte optimal indexering eller joins
**Impact:** Långsamma databaskörningar

### 📊 MÅTTLIGA PROBLEM

#### 8. Ingen Image Optimization
**Problem:** Bilder laddas utan proper optimization i vissa komponenter
**Impact:** Längre laddningstider för sidor med bilder

#### 9. Ingen Request Deduplication
**Problem:** Samma data kan hämtas flera gånger samtidigt
**Impact:** Onödiga API-anrop

## Performance Metrics - Nuläge

### Måltider (Target Metrics)
- **FCP (First Contentful Paint):** < 1.5s
- **LCP (Largest Contentful Paint):** < 2.5s
- **TTI (Time to Interactive):** < 3.5s
- **CLS (Cumulative Layout Shift):** < 0.1
- **FID (First Input Delay):** < 100ms

### Nuvarande Estimerade Värden
Baserat på kodanalys uppskattas följande:
- **FCP:** ~4-6s (DÅLIGT)
- **LCP:** ~6-9s (MYCKET DÅLIGT)
- **TTI:** ~8-12s (KRITISKT)
- **API Response Time:** ~200-500ms per query
- **Database Query Time:** ~50-200ms per query

## Performance Testing Strategy

### 1. Benchmark Testing

#### A. Initial Baseline Measurement
**Verktyg:** Lighthouse, WebPageTest, Chrome DevTools

**Test Pages:**
1. `/` - Landing page
2. `/dashboard` - Dashboard (inloggad)
3. `/dashboard/projects` - Projects list
4. `/dashboard/time` - Time tracking
5. `/dashboard/materials` - Materials

**Metrics att mäta:**
- Core Web Vitals (FCP, LCP, TTI, CLS, FID)
- JavaScript bundle size
- Number of requests
- Total page size
- Time to First Byte (TTFB)
- API response times

#### B. Database Performance Testing
**Verktyg:** Supabase Dashboard, pg_stat_statements

**Queries att testa:**
```sql
-- Dashboard page queries
-- Projects list queries
-- Time entries queries
-- Materials queries
```

**Metrics:**
- Query execution time
- Number of rows scanned
- Index usage
- N+1 query detection

#### C. Client-Side Performance Testing
**Verktyg:** React DevTools Profiler

**Components att profilera:**
- Dashboard page
- Projects list
- Time tracking components
- Material forms

**Metrics:**
- Component render time
- Number of re-renders
- Props drilling depth
- State updates frequency

### 2. Load Testing

#### A. API Load Testing
**Verktyg:** k6, Artillery

**Scenarios:**
1. **Normal Load:** 10 concurrent users
2. **Peak Load:** 50 concurrent users
3. **Stress Test:** 100+ concurrent users

**Endpoints att testa:**
```
GET /api/time/entries
POST /api/time/entries
GET /api/projects
GET /dashboard
```

**Success Criteria:**
- 95% requests < 500ms
- 99% requests < 1000ms
- 0% error rate under normal load
- < 1% error rate under peak load

#### B. Database Load Testing
**Test Scenarios:**
1. 1000 time entries queries per minute
2. 500 project queries per minute
3. 200 concurrent dashboard loads

**Success Criteria:**
- Average query time < 100ms
- 95th percentile < 200ms
- 99th percentile < 500ms
- No connection pool exhaustion

### 3. Real User Monitoring (RUM)

**Implementation:**
- Integrera Vercel Analytics eller liknande
- Spåra Core Web Vitals från riktiga användare
- Segment data per:
  - Device type (mobile/desktop)
  - Network speed (4G/5G/WiFi)
  - Geographic location

**Key Metrics:**
- Real user FCP, LCP, CLS
- Navigation timing
- Resource timing
- Error rates

### 4. Synthetic Monitoring

**Setup:**
- Uptime monitoring (Pingdom, UptimeRobot)
- Synthetic transactions (Selenium, Playwright)
- Schedule: Every 5 minutes

**Critical User Journeys:**
1. Sign in → Dashboard load
2. Dashboard → Create time entry
3. Dashboard → View projects
4. Projects → Create new project

**Alerts:**
- Response time > 3s
- Error rate > 1%
- Downtime > 30s

## Test Execution Plan

### Phase 1: Baseline Measurement (Vecka 1)
**Dagar 1-2:**
- [ ] Kör Lighthouse på alla test pages
- [ ] Dokumentera nuvarande metrics
- [ ] Ta screenshots av DevTools Performance
- [ ] Analysera Network waterfall

**Dagar 3-5:**
- [ ] Profiliera React components
- [ ] Analysera database queries
- [ ] Mät API response times
- [ ] Identifiera bottlenecks

### Phase 2: Optimization Implementation (Vecka 2-4)
Se PERFORMANCE-IMPROVEMENT-EPIC.md för detaljer

### Phase 3: Re-testing & Validation (Vecka 5)
**Efter varje fix:**
- [ ] Kör Lighthouse igen
- [ ] Jämför före/efter metrics
- [ ] Verifiera förbättring
- [ ] Dokumentera resultat

### Phase 4: Load Testing (Vecka 6)
**Setup:**
- [ ] Konfigurera k6 test scripts
- [ ] Sätt upp test environment
- [ ] Definiera baseline metrics

**Execution:**
- [ ] Normal load test
- [ ] Peak load test
- [ ] Stress test
- [ ] Soak test (24h)

### Phase 5: Production Monitoring (Kontinuerlig)
**Setup:**
- [ ] Implementera RUM
- [ ] Konfigurera alerts
- [ ] Sätt upp dashboards

## Performance Budget

### JavaScript Budget
- **Main bundle:** < 200 KB (gzipped)
- **Route bundles:** < 100 KB each (gzipped)
- **Total JS:** < 500 KB (gzipped)

### Asset Budget
- **Images:** < 1 MB per page
- **Fonts:** < 100 KB total
- **CSS:** < 50 KB (gzipped)

### Network Budget
- **Total requests:** < 50 per page
- **API calls:** < 10 per page load
- **Database queries:** < 5 per API call

### Performance Budget per Page

#### Landing Page (/)
- **FCP:** < 1.2s
- **LCP:** < 2.0s
- **Bundle size:** < 150 KB
- **Requests:** < 20

#### Dashboard (/dashboard)
- **FCP:** < 1.5s
- **LCP:** < 2.5s
- **Bundle size:** < 250 KB
- **Requests:** < 30
- **API calls:** < 5

#### Projects List (/dashboard/projects)
- **FCP:** < 1.3s
- **LCP:** < 2.2s
- **Bundle size:** < 200 KB
- **API calls:** < 3

## Test Environment

### Local Testing
```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Analyze bundle
npm run build -- --analyze
```

### Staging Environment
- URL: https://staging.eptracker.app
- Database: Staging Supabase project
- Users: Test accounts

### Production Monitoring
- URL: https://eptracker.app
- Analytics: Vercel Analytics
- Errors: Sentry (optional)

## Tools & Resources

### Performance Testing Tools
1. **Lighthouse** - Core Web Vitals, Best Practices
2. **WebPageTest** - Detailed performance analysis
3. **Chrome DevTools** - Performance profiler, Network
4. **React DevTools Profiler** - Component performance
5. **k6** - Load testing
6. **Supabase Dashboard** - Database query analysis

### Monitoring Tools
1. **Vercel Analytics** - Real User Monitoring
2. **Sentry** - Error tracking (optional)
3. **UptimeRobot** - Uptime monitoring

### Development Tools
1. **Next.js Bundle Analyzer** - Bundle size analysis
2. **Source Map Explorer** - Bundle composition
3. **size-limit** - Bundle size CI checks

## Success Criteria

### Must Have (P0)
- [ ] Dashboard FCP < 1.5s
- [ ] Dashboard LCP < 2.5s
- [ ] All pages TTI < 3.5s
- [ ] API response < 500ms (p95)
- [ ] Zero critical performance issues in Lighthouse

### Should Have (P1)
- [ ] Main bundle < 200 KB
- [ ] Database queries < 100ms (p95)
- [ ] No unnecessary re-renders
- [ ] Proper code splitting implemented

### Nice to Have (P2)
- [ ] Perfect Lighthouse score (100)
- [ ] All images optimized
- [ ] Service Worker caching
- [ ] Prefetching critical routes

## Reporting

### Weekly Performance Report
**Innehåll:**
1. Core Web Vitals trends
2. Bundle size changes
3. API response time trends
4. Database query performance
5. Error rates
6. User feedback

**Distribution:**
- Team standup
- Slack channel
- GitHub issues

## Next Steps

1. ✅ Skapa denna testplan
2. 🔄 Skapa PERFORMANCE-IMPROVEMENT-EPIC.md
3. ⏳ Genomför baseline measurements
4. ⏳ Prioritera och implementera fixes
5. ⏳ Re-test och validera
6. ⏳ Deploy och monitora

## Appendix A: Test Scripts

### Lighthouse CI Configuration
```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/dashboard/projects"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["warn", {"minScore": 0.9}]
      }
    }
  }
}
```

### k6 Load Test Script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Warm up
    { duration: '5m', target: 50 }, // Peak load
    { duration: '2m', target: 0 },  // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

export default function () {
  let response = http.get('https://eptracker.app/dashboard');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

## Appendix B: Database Query Optimization Checklist

- [ ] Add indexes on frequently queried columns
- [ ] Use proper joins instead of separate queries
- [ ] Implement query result caching
- [ ] Use `select` to fetch only needed columns
- [ ] Add database connection pooling
- [ ] Implement query pagination
- [ ] Use materialized views for complex aggregations
- [ ] Add query monitoring and slow query logging

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-25 | AI Assistant | Initial performance test plan created based on codebase analysis |

---

**Status:** 🔴 KRITISKT - Omedelbara åtgärder krävs
**Nästa Review:** Efter implementation av högprioriterade fixes

