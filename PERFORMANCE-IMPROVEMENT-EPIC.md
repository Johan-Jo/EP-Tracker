# EPIC 26: Performance Optimization för EP-Tracker

## ⚠️ VIKTIGT DEPLOYMENT-KRAV

**🚨 TESTA LOKALT FÖRST - DEPLOY EJ TILL PRODUCTION UTAN GODKÄNNANDE**

Alla ändringar i denna epic MÅSTE:
1. ✅ Testas lokalt i development mode
2. ✅ Verifieras med performance tests
3. ✅ Granskas och godkännas av team
4. ✅ Testas i staging environment (om tillgänglig)
5. ✅ Dokumenteras med före/efter metrics
6. ⛔ **ENDAST** deployas till production efter godkänd testning

**Deployment Freeze:** Production deployment kräver explicit godkännande efter fullständig testning.

---

## Epic Overview

**Epic Number:** #26  
**Status:** 🔴 KRITISKT - IN PROGRESS (LOCAL DEVELOPMENT ONLY)  
**Prioritet:** P0 - HÖGSTA  
**Estimerad tid:** 3-4 veckor  
**Ansvarig:** Development Team  
**Datum skapad:** 2025-10-25  
**Datum startad:** 2025-10-25  
**Environment:** 🔧 LOCAL DEVELOPMENT (not in production)

## Problem Statement

EP-Tracker har allvarliga prestandaproblem som påverkar användarupplevelsen negativt:

- **Dashboard tar 8-12 sekunder att ladda**
- **Varje navigering kräver full page reload**
- **Ingen data caching - allt hämtas om och om igen**
- **12 parallella databaskörningar på varje dashboard-load**
- **152 client components förhindrar Server-Side Rendering**
- **Stora JavaScript bundles (>500 KB)**

**Business Impact:**
- Dålig användarupplevelse
- Hög bounce rate risk
- Ökade infrastrukturkostnader
- Negativ påverkan på SEO
- Risk för användartapp

## Success Metrics

### Före (Estimerat)
- Dashboard FCP: ~4-6s
- Dashboard LCP: ~6-9s
- TTI: ~8-12s
- Bundle size: ~500 KB+
- API calls per page: 12+

### Efter (Mål)
- Dashboard FCP: < 1.5s ✅
- Dashboard LCP: < 2.5s ✅
- TTI: < 3.5s ✅
- Bundle size: < 250 KB ✅
- API calls per page: < 5 ✅

**Target Improvement:** 60-75% snabbare laddningstid

## Epic Breakdown

---

## 🚨 STORY 26.1: Fix React Query Caching (HÖGSTA PRIORITET)

**Story ID:** 26.1  
**Story Points:** 3  
**Prioritet:** P0 - KRITISKT  
**Estimerad tid:** 4-6 timmar  
**Status:** 🔄 IN PROGRESS

### Problem
`lib/providers/query-provider.tsx` har all caching avaktiverad:
```typescript
staleTime: 0,
gcTime: 0,
```

Detta betyder att VARJE query hämtas på nytt vid varje rendering, vilket är katastrofalt för prestanda.

### Tasks

#### Task 1.1: Implementera Proper Caching Strategy
**Fil:** `lib/providers/query-provider.tsx`

```typescript
export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Enable caching for production
						staleTime: 5 * 60 * 1000, // 5 minutes
						gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
						retry: 2,
						refetchOnWindowFocus: false, // Keep disabled
						refetchOnReconnect: true, // Enable for better offline handling
						refetchOnMount: 'always', // Fresh data on component mount
					},
					mutations: {
						retry: 1,
						// Invalidate related queries after mutation
						onSuccess: () => {
							// Will be configured per mutation
						},
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
```

#### Task 1.2: Implementera Environment-based Caching
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

staleTime: isDevelopment ? 1000 : 5 * 60 * 1000,
gcTime: isDevelopment ? 5000 : 10 * 60 * 1000,
```

#### Task 1.3: Lägg till Query Key Structure
**Ny fil:** `lib/query-keys.ts`

```typescript
export const queryKeys = {
	// User & Auth
	session: ['session'] as const,
	profile: (userId: string) => ['profile', userId] as const,
	
	// Projects
	projects: {
		all: ['projects'] as const,
		list: (filters?: Record<string, any>) => ['projects', 'list', filters] as const,
		detail: (id: string) => ['projects', 'detail', id] as const,
		members: (id: string) => ['projects', 'members', id] as const,
	},
	
	// Time Entries
	timeEntries: {
		all: ['time-entries'] as const,
		list: (filters?: Record<string, any>) => ['time-entries', 'list', filters] as const,
		detail: (id: string) => ['time-entries', 'detail', id] as const,
		active: (userId: string) => ['time-entries', 'active', userId] as const,
	},
	
	// Materials
	materials: {
		all: ['materials'] as const,
		list: (filters?: Record<string, any>) => ['materials', 'list', filters] as const,
		detail: (id: string) => ['materials', 'detail', id] as const,
	},
	
	// Dashboard
	dashboard: {
		stats: (userId: string, orgId: string) => ['dashboard', 'stats', userId, orgId] as const,
		activities: (orgId: string) => ['dashboard', 'activities', orgId] as const,
	},
};
```

#### Task 1.4: Testing
- [ ] Verifiera att data cachas korrekt
- [ ] Testa refetch on mutation
- [ ] Testa stale time behavior
- [ ] Performance test före/efter

**Förväntad förbättring:** 70-80% färre API-anrop

---

## 🚨 STORY 26.2: Implementera Session Caching

**Story ID:** 26.2  
**Story Points:** 5  
**Prioritet:** P0 - KRITISKT  
**Estimerad tid:** 6-8 timmar  
**Status:** ⏳ PENDING

### Problem
`lib/auth/get-session.ts` har explicit INGEN CACHING vilket leder till dubbla databaskörningar på varje sida (layout + page).

### Tasks

#### Task 2.1: Implementera React Cache
**Fil:** `lib/auth/get-session.ts`

```typescript
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Get user session and membership with React Cache
 * This ensures data is fetched once per request, even if called multiple times
 */
export const getSession = cache(async () => {
	const supabase = await createClient();
	
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { user: null, membership: null, profile: null };
	}

	// Fetch profile and membership in parallel
	const [profileResult, membershipResult] = await Promise.all([
		supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single(),
		supabase
			.from('memberships')
			.select('org_id, role, hourly_rate_sek')
			.eq('user_id', user.id)
			.eq('is_active', true)
			.single(),
	]);

	return {
		user,
		profile: profileResult.data,
		membership: membershipResult.data,
	};
});

/**
 * Type for the session return value
 */
export type Session = Awaited<ReturnType<typeof getSession>>;
```

#### Task 2.2: Preload Session i Layout
**Fil:** `app/dashboard/layout.tsx`

```typescript
import { Suspense } from 'react';
import { getSession } from '@/lib/auth/get-session';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Preload session (will be cached for child pages)
	const sessionPromise = getSession();
	
	return (
		<Suspense fallback={<DashboardLoadingSkeleton />}>
			<DashboardLayoutContent sessionPromise={sessionPromise}>
				{children}
			</DashboardLayoutContent>
		</Suspense>
	);
}
```

#### Task 2.3: Testing
- [ ] Verifiera att endast 1 query körs per request
- [ ] Testa med React DevTools
- [ ] Performance test före/efter

**Förväntad förbättring:** 50% färre databaskörningar för session

---

## 🚨 STORY 26.3: Ersätt Full Page Reloads med Router Navigation

**Story ID:** 26.3  
**Story Points:** 8  
**Prioritet:** P0 - KRITISKT  
**Estimerad tid:** 1-2 dagar  
**Status:** ⏳ PENDING

### Problem
Flera komponenter använder `window.location.href` för navigering, vilket orsakar full page reload och förlorar alla fördelar med SPA.

**Filer att fixa:**
- `app/dashboard/projects/projects-client.tsx`
- Plus minst 16 andra filer (se grep resultat)

### Tasks

#### Task 3.1: Fix Projects Client Search
**Fil:** `app/dashboard/projects/projects-client.tsx`

**FÖRE:**
```typescript
const handleSearch = (searchValue: string) => {
  const params = new URLSearchParams(searchParams.toString());
  
  if (searchValue && searchValue.trim()) {
    params.set('search', searchValue.trim());
  } else {
    params.delete('search');
  }
  
  const newUrl = `${pathname}?${params.toString()}`;
  // Force a full page reload to ensure server re-renders with new search params
  window.location.href = newUrl; // ❌ BAD
};
```

**EFTER:**
```typescript
const handleSearch = (searchValue: string) => {
  const params = new URLSearchParams(searchParams.toString());
  
  if (searchValue && searchValue.trim()) {
    params.set('search', searchValue.trim());
  } else {
    params.delete('search');
  }
  
  // Use Next.js router for instant navigation
  router.push(`${pathname}?${params.toString()}`); // ✅ GOOD
};
```

#### Task 3.2: Uppdatera Server Component för Search
**Fil:** `app/dashboard/projects/page.tsx`

Lägg till `revalidatePath` eller använd `router.refresh()` på client-side vid behov.

#### Task 3.3: Find och Fix Alla Instances
```bash
# Find all window.location usages
grep -r "window.location" --include="*.tsx" --include="*.ts"
```

**Filer att granska:**
- `components/help/help-page-new.tsx`
- `components/users/users-page-new.tsx`
- `app/(auth)/invite-callback/page.tsx`
- `components/users/invite-user-dialog.tsx`
- `components/approvals/approvals-page-new.tsx`
- `components/onboarding/tour-launcher.tsx`
- Flera andra...

#### Task 3.4: Implementera Optimistic Updates
För formulär och mutations, implementera optimistic updates:

```typescript
const mutation = useMutation({
  mutationFn: createProject,
  onMutate: async (newProject) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.projects.all });
    
    // Snapshot previous value
    const previousProjects = queryClient.getQueryData(queryKeys.projects.all);
    
    // Optimistically update
    queryClient.setQueryData(queryKeys.projects.all, (old) => [...old, newProject]);
    
    return { previousProjects };
  },
  onError: (err, newProject, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKeys.projects.all, context?.previousProjects);
  },
  onSettled: () => {
    // Refetch after success or error
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },
});
```

#### Task 3.5: Testing
- [ ] Testa alla search/filter funktioner
- [ ] Verifiera att router navigation fungerar
- [ ] Testa browser back/forward buttons
- [ ] Performance test före/efter

**Förväntad förbättring:** 80-90% snabbare navigation

---

## ⚠️ STORY 26.4: Optimera Dashboard Queries

**Story ID:** 26.4  
**Story Points:** 8  
**Prioritet:** P1 - HÖG  
**Estimerad tid:** 2 dagar  
**Status:** ⏳ PENDING

### Problem
Dashboard kör 12 parallella queries på varje load, vilket är ineffektivt.

### Tasks

#### Task 4.1: Kombinera Queries med Proper Joins
**Fil:** `app/dashboard/page.tsx`

**FÖRE:** 12 separata queries

**EFTER:** 3-4 optimerade queries

```typescript
export default async function DashboardPage() {
	const { user, profile, membership } = await getSession();

	if (!user || !membership) {
		redirect('/sign-in');
	}

	const supabase = await createClient();
	const startOfWeek = new Date();
	startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
	startOfWeek.setHours(0, 0, 0, 0);

	// 1. Get stats with aggregation query
	const { data: stats } = await supabase
		.rpc('get_dashboard_stats', {
			p_user_id: user.id,
			p_org_id: membership.org_id,
			p_start_date: startOfWeek.toISOString(),
		});

	// 2. Get active time entry
	const { data: activeTimeEntry } = await supabase
		.from('time_entries')
		.select('*, projects(id, name)')
		.eq('user_id', user.id)
		.is('stop_at', null)
		.order('start_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	// 3. Get recent activities (combined query)
	const { data: recentActivities } = await supabase
		.rpc('get_recent_activities', {
			p_org_id: membership.org_id,
			p_limit: 15,
		});

	// 4. Get projects for dropdown
	const { data: allProjects } = await supabase
		.from('projects')
		.select('id, name')
		.eq('org_id', membership.org_id)
		.eq('status', 'active')
		.order('name', { ascending: true });

	return (
		<DashboardClient 
			userName={profile?.full_name || 'användare'} 
			stats={stats}
			activeTimeEntry={activeTimeEntry}
			allProjects={allProjects || []}
			recentActivities={recentActivities || []}
			userId={user.id}
		/>
	);
}
```

#### Task 4.2: Skapa Database Functions
**Ny fil:** `supabase/migrations/[timestamp]_dashboard_functions.sql`

```sql
-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_user_id uuid,
  p_org_id uuid,
  p_start_date timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'projectsCount', (
      SELECT COUNT(*)
      FROM projects
      WHERE org_id = p_org_id AND status = 'active'
    ),
    'timeEntriesCount', (
      SELECT COUNT(*)
      FROM time_entries
      WHERE user_id = p_user_id
        AND start_at >= p_start_date
    ),
    'materialsCount', (
      SELECT COUNT(*) FROM materials
      WHERE user_id = p_user_id AND created_at >= p_start_date
    ) + (
      SELECT COUNT(*) FROM expenses
      WHERE user_id = p_user_id AND created_at >= p_start_date
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get recent activities
CREATE OR REPLACE FUNCTION get_recent_activities(
  p_org_id uuid,
  p_limit int DEFAULT 15
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Combine all activity types in a single query using UNION
  SELECT json_agg(activity ORDER BY created_at DESC)
  INTO result
  FROM (
    -- Time entries
    SELECT 
      'time' as type,
      te.id,
      te.created_at,
      te.start_at,
      te.stop_at,
      p.id as project_id,
      p.name as project_name,
      pr.full_name as user_name
    FROM time_entries te
    LEFT JOIN projects p ON te.project_id = p.id
    LEFT JOIN profiles pr ON te.user_id = pr.id
    WHERE te.org_id = p_org_id
    
    UNION ALL
    
    -- Materials
    SELECT 
      'material' as type,
      m.id,
      m.created_at,
      NULL as start_at,
      NULL as stop_at,
      p.id as project_id,
      p.name as project_name,
      pr.full_name as user_name
    FROM materials m
    LEFT JOIN projects p ON m.project_id = p.id
    LEFT JOIN profiles pr ON m.user_id = pr.id
    WHERE m.org_id = p_org_id
    
    -- Add more unions for expenses, ata, diary...
    
    ORDER BY created_at DESC
    LIMIT p_limit
  ) activity;
  
  RETURN result;
END;
$$;
```

#### Task 4.3: Add Database Indexes
```sql
-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start 
  ON time_entries(user_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_org_created 
  ON time_entries(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_org_status 
  ON projects(org_id, status);

CREATE INDEX IF NOT EXISTS idx_materials_user_created 
  ON materials(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_created 
  ON expenses(user_id, created_at DESC);
```

#### Task 4.4: Testing
- [ ] Verifiera att queries returnerar samma data
- [ ] Testa query execution time i Supabase dashboard
- [ ] Performance test före/efter

**Förväntad förbättring:** 60-70% snabbare dashboard load

---

## ⚠️ STORY 26.5: Reduce Client Components

**Story ID:** 26.5  
**Story Points:** 13  
**Prioritet:** P1 - HÖG  
**Estimerad tid:** 3-4 dagar  
**Status:** ⏳ PENDING

### Problem
152 komponenter använder 'use client', vilket förhindrar Server-Side Rendering och ökar JavaScript bundle size.

### Strategy
Endast komponenter som använder:
- `useState`, `useEffect`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)
- React Query hooks

...behöver vara client components.

### Tasks

#### Task 5.1: Audit Current Client Components
```bash
# List all client components
grep -r "use client" components/ app/ --include="*.tsx" -l > client-components.txt
```

#### Task 5.2: Convert Static Components to Server Components
**Exempel:** Landing page komponenter

**Fil:** `components/landing/landing-features.tsx`

**FÖRE:**
```typescript
'use client';

export function LandingFeatures() {
  return (
    <section>
      {/* Static content */}
    </section>
  );
}
```

**EFTER:** (Ta bort 'use client')
```typescript
export function LandingFeatures() {
  return (
    <section>
      {/* Static content */}
    </section>
  );
}
```

#### Task 5.3: Split Interactive Parts
**Pattern:** Split components så att endast interaktiva delar är client components

**Exempel:**
```typescript
// server component
export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="project-card">
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      
      {/* Only this button needs to be client */}
      <ProjectActionButton projectId={project.id} />
    </div>
  );
}

// client component (separate file)
'use client';
export function ProjectActionButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  
  return (
    <button onClick={() => router.push(`/projects/${projectId}`)}>
      View Details
    </button>
  );
}
```

#### Task 5.4: Use Server Actions
För formulär, använd Server Actions istället för client-side fetch:

```typescript
// app/actions/projects.ts
'use server';

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  // ... validation and creation
  revalidatePath('/dashboard/projects');
  return { success: true };
}

// Component (can be server component)
export function CreateProjectForm() {
  return (
    <form action={createProject}>
      {/* form fields */}
      <button type="submit">Create</button>
    </form>
  );
}
```

#### Task 5.5: Priority List
1. **Landing page** (6 komponenter) - Highest impact
2. **Static UI components** (24 komponenter)
3. **Layout components** där möjligt
4. **List/Card komponenter** (split approach)

#### Task 5.6: Testing
- [ ] Verifiera att funktionalitet fortfarande fungerar
- [ ] Testa hydration errors
- [ ] Mät bundle size reduction

**Förväntad förbättring:** 30-40% mindre JavaScript bundle

---

## ⚠️ STORY 26.6: Implement Code Splitting

**Story ID:** 26.6  
**Story Points:** 5  
**Prioritet:** P1 - HÖG  
**Estimerad tid:** 1 dag  
**Status:** ⏳ PENDING

### Tasks

#### Task 6.1: Dynamisk Import av Stora Komponenter
```typescript
import dynamic from 'next/dynamic';

// Heavy components that are not immediately needed
const ProjectForm = dynamic(() => import('@/components/projects/project-form'), {
  loading: () => <FormSkeleton />,
  ssr: false, // If it uses browser APIs
});

const ChartWidget = dynamic(() => import('@/components/dashboard/chart-widget'), {
  loading: () => <div>Loading chart...</div>,
});

const PhotoGallery = dynamic(() => import('@/components/shared/gallery-viewer'), {
  loading: () => <div>Loading gallery...</div>,
});
```

#### Task 6.2: Route-based Code Splitting
Next.js gör detta automatiskt, men verifiera:
- [ ] Varje route har sin egen bundle
- [ ] Shared kod är i shared bundle
- [ ] Ingen onödig kod i main bundle

#### Task 6.3: Component Library Code Splitting
**Fil:** `next.config.mjs`

```javascript
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
    'date-fns', // Add
    '@tanstack/react-query', // Add
  ],
},
```

#### Task 6.4: Testing
- [ ] Analysera bundle med `npm run build`
- [ ] Använd bundle analyzer
- [ ] Verifiera att chunks är rimliga

**Förväntad förbättring:** 20-30% mindre initial bundle

---

## 📊 STORY 26.7: Database Query Optimization

**Story ID:** 26.7  
**Story Points:** 8  
**Prioritet:** P2 - MEDEL  
**Estimerad tid:** 2 dagar  
**Status:** ⏳ PENDING

### Tasks

#### Task 7.1: Add Missing Indexes
Se Task 4.3 ovan plus:

```sql
-- Compound indexes for common filter combinations
CREATE INDEX idx_time_entries_project_status 
  ON time_entries(project_id, status);

CREATE INDEX idx_projects_org_status_created 
  ON projects(org_id, status, created_at DESC);

-- Index for approval workflows
CREATE INDEX idx_time_entries_status_created 
  ON time_entries(status, created_at DESC)
  WHERE status IN ('submitted', 'pending_approval');
```

#### Task 7.2: Optimize Select Queries
Använd endast nödvändiga kolumner:

**FÖRE:**
```typescript
.select('*')
```

**EFTER:**
```typescript
.select('id, name, status, created_at')
```

#### Task 7.3: Add Pagination
För alla list queries:

```typescript
const PAGE_SIZE = 20;

const { data, error, count } = await supabase
  .from('time_entries')
  .select('*', { count: 'exact' })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });
```

#### Task 7.4: Implement Query Result Caching
För expensive queries, använd materialized views eller query caching.

**Förväntad förbättring:** 40-50% snabbare queries

---

## 📊 STORY 26.8: Implement Monitoring & Analytics

**Story ID:** 26.8  
**Story Points:** 5  
**Prioritet:** P2 - MEDEL  
**Estimerad tid:** 1 dag  
**Status:** ⏳ PENDING

### Tasks

#### Task 8.1: Setup Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

#### Task 8.2: Add Custom Performance Tracking
**Ny fil:** `lib/analytics/performance.ts`

```typescript
export function trackPerformance(name: string, duration: number) {
  // Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: name,
      value: duration,
      event_category: 'Performance',
    });
  }
}

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    trackPerformance(name, duration);
  });
}
```

#### Task 8.3: Setup Error Tracking
Överväg Sentry för production error tracking.

**Förväntad förbättring:** Bättre insikt i verklig prestanda

---

## Testing & Deployment Strategy

### KRITISKT: Test-First Approach

**Varje story MÅSTE:**
1. **Utvecklas lokalt** - `npm run dev`
2. **Testas lokalt** - Verifiera funktionalitet
3. **Mätas** - Kör performance tests före/efter
4. **Dokumenteras** - Spara metrics och resultat
5. **Granskas** - Code review av team
6. **Godkännas** - Explicit OK från tech lead

### Lokala Test-Kommandon

```bash
# 1. Kör development server
npm run dev

# 2. Testa i browser
# - Öppna http://localhost:3000
# - Testa alla påverkade sidor
# - Verifiera ingen regression

# 3. Kör performance test
node scripts/performance-test.js

# 4. Build production lokalt
npm run build
npm start

# 5. Testa production build lokalt
node scripts/performance-test.js
```

### Production Deployment Checklist

**⛔ Följande MÅSTE vara klart INNAN production deploy:**

- [ ] Alla lokala tester passerade
- [ ] Performance metrics dokumenterade (före/efter)
- [ ] Ingen funktionalitet trasig
- [ ] Code review genomförd och godkänd
- [ ] Staging test genomförd (om tillämpligt)
- [ ] Rollback plan dokumenterad
- [ ] Team sign-off erhållen
- [ ] Production deployment godkänd av tech lead

### Rollback Plan

**Om något går fel i production:**

```bash
# 1. Återställ till previous commit
git revert HEAD

# 2. Deploy previous version
# (följ normal deployment process)

# 3. Verifiera att allt fungerar
```

**Varje story har sina egna rollback-instruktioner nedan.**

---

## Implementation Plan

### Week 1: Critical Fixes (P0) - LOCAL TESTING ONLY
**Monday-Tuesday:**
- [ ] Story 1: Fix React Query caching
- [ ] Story 2: Implement session caching

**Wednesday-Friday:**
- [ ] Story 3: Replace full page reloads
- [ ] Testing och validation

### Week 2: High Priority (P1)
**Monday-Wednesday:**
- [ ] Story 4: Optimize dashboard queries
- [ ] Database function creation
- [ ] Add indexes

**Thursday-Friday:**
- [ ] Story 5: Start reducing client components
- [ ] Focus on landing page first

### Week 3: Continue P1 + Start P2
**Monday-Wednesday:**
- [ ] Story 5: Continue client component reduction
- [ ] Story 6: Implement code splitting

**Thursday-Friday:**
- [ ] Story 7: Database query optimization
- [ ] Comprehensive testing

### Week 4: Polish & Monitor
**Monday-Wednesday:**
- [ ] Story 8: Setup monitoring
- [ ] Final testing
- [ ] Performance benchmarks

**Thursday-Friday:**
- [ ] Documentation
- [ ] Knowledge sharing
- [ ] Deploy to production

## Testing Strategy

### After Each Story
1. Run Lighthouse audit
2. Compare before/after metrics
3. Verify functionality
4. Check for regressions

### Before Production Deploy
1. Full regression test
2. Load testing with k6
3. User acceptance testing
4. Performance budget validation

## Rollback Plan

För varje story:
1. Git branch per story
2. Feature flags för större ändringar
3. Database migrations är reversible
4. Dokumentera rollback steps

## Dependencies

### Internal
- Access to Supabase dashboard
- Staging environment
- Testing data

### External
- None

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:** 
- Comprehensive testing
- Gradual rollout
- Feature flags

### Risk 2: Caching Issues
**Mitigation:**
- Clear cache invalidation strategy
- Thorough testing av edge cases
- Monitoring i production

### Risk 3: Database Migration Problems
**Mitigation:**
- Test migrations på staging först
- Backup före migration
- Reversible migrations

## Success Criteria

### Must Have ✅
- [ ] Dashboard loads under 2.5s (LCP)
- [ ] Navigation under 500ms
- [ ] API responses under 500ms (p95)
- [ ] Zero critical Lighthouse issues

### Should Have ✅
- [ ] Bundle size < 250 KB
- [ ] < 5 API calls per page
- [ ] All queries under 100ms (p95)

### Nice to Have
- [ ] Perfect Lighthouse score
- [ ] Prefetching implemented
- [ ] Advanced caching strategies

## Documentation

### Required Documentation
- [ ] Architecture decision records (ADRs)
- [ ] Query optimization guide
- [ ] Caching strategy document
- [ ] Performance budget definition
- [ ] Monitoring dashboard setup

### Knowledge Sharing
- [ ] Team walkthrough session
- [ ] Code review best practices
- [ ] Performance tips dokument

## Post-Implementation

### Week 1 After Deploy
- Monitor Core Web Vitals
- Check error rates
- Gather user feedback
- Fix critical issues

### Month 1-3
- Continue monitoring
- Iterate on optimizations
- Plan next performance sprint

## Cost/Benefit Analysis

### Time Investment
- Development: ~80-100 hours
- Testing: ~20 hours
- Documentation: ~10 hours
- **Total: ~110-130 hours**

### Expected Benefits
- **60-75% faster load times**
- **50-70% fewer database queries**
- **30-40% smaller bundles**
- **Better user experience**
- **Lower infrastructure costs**
- **Better SEO rankings**

**ROI: MYCKET HÖG** ✅

## Appendix

### Useful Commands

```bash
# Analyze bundle
npm run build
ANALYZE=true npm run build

# Run Lighthouse
lighthouse https://eptracker.app --view

# Database query analysis
# Run in Supabase SQL editor
EXPLAIN ANALYZE SELECT * FROM time_entries WHERE user_id = 'xxx';

# Monitor bundle size
npm install -g size-limit
size-limit
```

### Resources
- [Next.js Performance Docs](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Web.dev Performance](https://web.dev/performance/)

---

**Status:** 🔴 READY TO START  
**Next Steps:** Begin with Story 1 (React Query Caching)  
**Review Date:** Weekly during implementation

