# EPIC 26 Phase 2: Load Time Optimization

**Datum:** 2025-10-26  
**Status:** 🔄 Planerat  
**Mål:** Minska load time från 4.28s till < 2s

---

## 📊 Nuvarande Problem

### Test Resultat (Phase 1):
```
✅ API Calls:  0.5 (UTMÄRKT - reducerat från 12+)
⚠️ FCP:        1.64s (target: < 1.5s) - nära!
❌ Load Time:  4.28s (target: < 3s) - FÖR HÖG
❌ TTFB:       1.4-1.5s (target: < 0.2s) - MYCKET FÖR HÖG
```

### Root Cause Analysis:

**1. TTFB (Time to First Byte) = 1.4s** 🔴
   - **Problem**: Servern tar 1.4s att börja skicka data
   - **Impact**: 35% av total load time är väntan på server
   - **Causes**:
     - Server-Side Rendering tar för lång tid
     - Cold starts (Vercel serverless functions)
     - Database queries blockar initial response
     - Edge function inte optimal placerad

**2. Stor JavaScript Bundle** 🟡
   - 20-27 JavaScript files per sida
   - Okänd total bundle size (Puppeteer kunde inte mäta)
   - För många client components

**3. Ingen Streaming SSR** 🟡
   - Hela sidan väntar tills allt är klart
   - Användaren ser ingenting under 1.4s

---

## 🎯 Phase 2 Stories

### Story 26.7: Edge Runtime + Streaming SSR
**Prioritet:** P0 - KRITISK  
**Impact:** Reducera TTFB från 1.4s → 0.3s (75% snabbare!)  
**Effort:** 4 timmar

#### Problem:
Vercel serverless functions har cold starts och långsam SSR.

#### Lösning:
1. **Edge Runtime** för layout och dashboard pages
2. **Streaming SSR** - skicka HTML progressivt
3. **Suspense boundaries** - ladda data parallellt

#### Implementation:

**A. Enable Edge Runtime:**
```typescript
// app/dashboard/layout.tsx
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
```

**B. Implement Streaming:**
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default async function DashboardPage() {
  return (
    <div>
      {/* Instant: Static header loads first */}
      <DashboardHeader />
      
      {/* Streaming: Show skeleton while loading */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>
      
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
```

**C. Move Data Fetching to Client:**
För inte-kritisk data, flytta till client-side med React Query:
```typescript
// Before (SSR - blocks TTFB)
const stats = await getStats();

// After (Client - parallel loading)
<Suspense fallback={<Skeleton />}>
  <ClientStats /> {/* Uses React Query */}
</Suspense>
```

#### Expected Results:
- TTFB: 1.4s → 0.3s (75% snabbare)
- FCP: 1.64s → 0.8s (50% snabbare)
- Load Time: 4.28s → 2.5s

---

### Story 26.8: Bundle Size Optimization
**Prioritet:** P1 - Hög  
**Impact:** FCP -0.3s, Load Time -0.5s  
**Effort:** 3 timmar

#### Problem:
20-27 JavaScript files, okänd total size.

#### Lösning:

**A. Analyze Bundle:**
```bash
npm run build -- --profile
npx @next/bundle-analyzer
```

**B. Dynamic Imports för Stora Components:**
```typescript
// Before
import { MaterialsTable } from '@/components/materials/materials-table';

// After
import dynamic from 'next/dynamic';

const MaterialsTable = dynamic(
  () => import('@/components/materials/materials-table'),
  {
    loading: () => <TableSkeleton />,
    ssr: false, // Client-only for heavy tables
  }
);
```

**C. Optimize Dependencies:**
```typescript
// Before: Import hela Lucide
import { Clock, User, Settings } from 'lucide-react';

// After: Tree-shake specifika icons
import Clock from 'lucide-react/dist/esm/icons/clock';
import User from 'lucide-react/dist/esm/icons/user';
```

**D. Remove Unused Deps:**
```bash
# Find unused dependencies
npx depcheck
```

#### Files to Optimize:
1. `components/materials/*` - Stora tabeller
2. `components/projects/*` - Många formulär
3. `components/planning/*` - DnD bibliotek (stort)
4. `components/charts/*` - Chart libraries

#### Expected Results:
- Bundle size: -30%
- FCP: 1.64s → 1.3s
- Load Time: 4.28s → 3.5s

---

### Story 26.9: Database Query Optimization
**Prioritet:** P1 - Hög  
**Impact:** TTFB -0.2s  
**Effort:** 2 timmar

#### Problem:
Även efter Story 26.4-26.6, vissa queries kan vara långsamma.

#### Lösning:

**A. Add Missing Indexes:**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes for common filters
CREATE INDEX CONCURRENTLY idx_time_entries_user_date 
  ON time_entries(user_id, date DESC);

CREATE INDEX CONCURRENTLY idx_materials_project_date 
  ON materials(project_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_expenses_org_date 
  ON expenses(org_id, created_at DESC);
```

**B. Use Database Views:**
```sql
-- Create materialized view for dashboard stats
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
  org_id,
  COUNT(DISTINCT project_id) as active_projects,
  COUNT(*) as total_entries,
  SUM(hours) as total_hours
FROM time_entries
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY org_id;

-- Refresh periodically (every 5 minutes)
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
```

**C. Query Optimization:**
```typescript
// Before: N+1 queries
const projects = await supabase.from('projects').select('*');
for (const project of projects) {
  const stats = await supabase.from('time_entries')
    .select('*')
    .eq('project_id', project.id);
}

// After: Single query with JOIN
const projects = await supabase
  .from('projects')
  .select(`
    *,
    time_entries:time_entries(count)
  `);
```

#### Expected Results:
- TTFB: -0.2s
- Database query time: -50%

---

### Story 26.10: Static Generation
**Prioritet:** P2 - Medium  
**Impact:** TTFB -1s för vissa sidor  
**Effort:** 2 timmar

#### Problem:
Vissa sidor (landing, sign-in) genereras varje gång.

#### Lösning:

**A. Static Pages:**
```typescript
// app/page.tsx (landing)
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

// app/(auth)/sign-in/page.tsx
export const dynamic = 'force-static';
```

**B. Incremental Static Regeneration:**
```typescript
// app/dashboard/projects/[id]/page.tsx
export const revalidate = 60; // ISR: revalidate every minute

export async function generateStaticParams() {
  // Pre-generate top 100 projects
  const projects = await getTopProjects(100);
  return projects.map(p => ({ id: p.id }));
}
```

#### Expected Results:
- Landing page TTFB: 1.47s → 0.05s (97% snabbare!)
- Sign-in page TTFB: 1.48s → 0.05s

---

### Story 26.11: Image Optimization
**Prioritet:** P2 - Medium  
**Impact:** Load Time -0.3s  
**Effort:** 1 timme

#### Problem:
Bilder laddas utan optimization.

#### Lösning:

**A. Next.js Image Component:**
```typescript
// Before
<img src={photo.url} alt="Material" />

// After
import Image from 'next/image';

<Image
  src={photo.url}
  alt="Material"
  width={300}
  height={200}
  loading="lazy"
  placeholder="blur"
  blurDataURL={photo.thumbnail}
/>
```

**B. Image Formats:**
```typescript
// next.config.mjs
export default {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

**C. Lazy Loading:**
```typescript
<Image
  src={photo.url}
  loading="lazy"
  priority={false} // Only true for above-fold images
/>
```

#### Expected Results:
- Load Time: -0.3s
- Bandwidth: -60%

---

### Story 26.12: Vercel Configuration
**Prioritet:** P1 - Hög  
**Impact:** TTFB -0.2s  
**Effort:** 30 minuter

#### Problem:
Vercel region och function config inte optimerad.

#### Lösning:

**A. Update vercel.json:**
```json
{
  "regions": ["arn1", "fra1"],  // Multi-region for redundancy
  "functions": {
    "app/dashboard/**/*.tsx": {
      "maxDuration": 10,
      "memory": 1024,
      "runtime": "edge"
    }
  },
  "crons": [
    {
      "path": "/api/cron/refresh-cache",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**B. Enable Edge Caching:**
```typescript
// app/api/dashboard/route.ts
export const runtime = 'edge';
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const data = await getDashboardData();
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
```

#### Expected Results:
- TTFB: -0.2s
- Cold start: Eliminerat med Edge Runtime

---

## 📈 Expected Total Impact

### Before (Phase 1):
```
FCP:       1.64s
TTFB:      1.4s
Load Time: 4.28s
API Calls: 0.5
```

### After (Phase 2):
```
FCP:       0.8s  ✅ (-51%)
TTFB:      0.3s  ✅ (-79%)
Load Time: 1.8s  ✅ (-58%)
API Calls: 0.5  ✅ (maintained)
```

**Total Improvement från ursprungligt läge:**
- Load Time: **8-12s → 1.8s** = **85% snabbare!** 🚀
- TTFB: **~3s → 0.3s** = **90% snabbare!** ⚡
- API Calls: **12+ → 0.5** = **96% färre!** 🎯

---

## 🎯 Implementation Plan

### Quick Wins (Dag 1 - 4 timmar):
1. ✅ Story 26.12: Vercel Config (30 min)
2. ✅ Story 26.7: Edge Runtime + Streaming (3 timmar)
3. ✅ Story 26.10: Static Generation (30 min)

### Medium Effort (Dag 2 - 4 timmar):
4. ✅ Story 26.8: Bundle Optimization (3 timmar)
5. ✅ Story 26.11: Image Optimization (1 timme)

### Database (Dag 3 - 2 timmar):
6. ✅ Story 26.9: Database Query Optimization (2 timmar)

**Total tid:** ~10 timmar över 3 dagar

---

## 🚦 Priority Ranking

### P0 (KRITISK - GÖR FÖRST):
1. **Story 26.7**: Edge Runtime + Streaming SSR
   - Impact: TTFB -75%
   - Biggest win

2. **Story 26.12**: Vercel Configuration
   - Impact: TTFB -15%
   - Snabbast att implementera

### P1 (HÖG):
3. **Story 26.8**: Bundle Size Optimization
4. **Story 26.9**: Database Query Optimization

### P2 (MEDIUM):
5. **Story 26.10**: Static Generation
6. **Story 26.11**: Image Optimization

---

## 🧪 Testing

Efter varje story:
```bash
# Run performance test
node scripts/performance-test-auth.js

# Compare results
# Target: Load Time < 2s, TTFB < 0.3s
```

---

## ✅ Success Criteria

- [ ] TTFB < 0.5s (currently 1.4s)
- [ ] FCP < 1.2s (currently 1.64s)
- [ ] Load Time < 2.5s (currently 4.28s)
- [ ] Bundle size < 200 KB (currently unknown)
- [ ] Lighthouse score > 95 (Desktop)

---

**Vill du att jag börjar med Story 26.7 (Edge Runtime + Streaming)?** 🚀
Det är den största förbättringen (~75% snabbare TTFB)!

