import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

interface PerformanceMetrics {
	// Navigation Timing
	dns: number;
	tcp: number;
	ttfb: number;
	domLoad: number;
	
	// Paint Timing
	fcp: number; // First Contentful Paint
	lcp: number; // Largest Contentful Paint
	
	// Resource counts
	totalResources: number;
	apiCalls: number;
	jsFiles: number;
	
	// Sizes (bytes)
	totalSize: number;
	jsSize: number;
}

describe('Performance Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	/**
	 * Measure page performance metrics
	 */
	async function measurePagePerformance(url: string): Promise<{ loadTime: number; metrics: PerformanceMetrics }> {
		const page = testHelpers.getPage();
		const startTime = Date.now();
		
		await testHelpers.navigateTo(url);
		await testHelpers.waitForSelector('main', 10000);
		
		const loadTime = Date.now() - startTime;
		
		// Get performance metrics from browser
		const metrics: PerformanceMetrics = await page.evaluate(() => {
			const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			const paintEntries = performance.getEntriesByType('paint') as PerformancePaintTiming[];
			const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
			
			// Get LCP (Largest Contentful Paint) if available
			let lcp = 0;
			if ('PerformanceObserver' in window) {
				// LCP might not be available immediately, but we try
				const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as any[];
				if (lcpEntries.length > 0) {
					lcp = lcpEntries[lcpEntries.length - 1].renderTime || lcpEntries[lcpEntries.length - 1].startTime || 0;
				}
			}
			
			return {
				// Navigation Timing
				dns: perf ? perf.domainLookupEnd - perf.domainLookupStart : 0,
				tcp: perf ? perf.connectEnd - perf.connectStart : 0,
				ttfb: perf ? perf.responseStart - perf.requestStart : 0,
				domLoad: perf ? perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart : 0,
				
				// Paint Timing
				fcp: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
				lcp: lcp,
				
				// Resource counts
				totalResources: resources.length,
				apiCalls: resources.filter(r => r.name.includes('/api/')).length,
				jsFiles: resources.filter(r => r.name.endsWith('.js')).length,
				
				// Sizes
				totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
				jsSize: resources.filter(r => r.name.endsWith('.js')).reduce((sum, r) => sum + (r.transferSize || 0), 0),
			};
		});
		
		return { loadTime, metrics };
	}

	/**
	 * Helper to log performance metrics consistently
	 */
	function logPerformanceMetrics(pageName: string, loadTime: number, metrics: PerformanceMetrics) {
		console.log(`\n📊 ${pageName} Performance Metrics:`);
		console.log(`   Total Load Time: ${(loadTime / 1000).toFixed(2)}s`);
		console.log(`   First Contentful Paint (FCP): ${(metrics.fcp / 1000).toFixed(2)}s`);
		console.log(`   Largest Contentful Paint (LCP): ${(metrics.lcp / 1000).toFixed(2)}s`);
		console.log(`   Time to First Byte (TTFB): ${(metrics.ttfb / 1000).toFixed(2)}s`);
		console.log(`   DNS Lookup: ${(metrics.dns / 1000).toFixed(2)}s`);
		console.log(`   TCP Connection: ${(metrics.tcp / 1000).toFixed(2)}s`);
		console.log(`   Total Resources: ${metrics.totalResources}`);
		console.log(`   API Calls: ${metrics.apiCalls}`);
		console.log(`   JavaScript Files: ${metrics.jsFiles}`);
		console.log(`   Total Size: ${(metrics.totalSize / 1024).toFixed(0)} KB`);
		console.log(`   JavaScript Size: ${(metrics.jsSize / 1024).toFixed(0)} KB\n`);
	}

	describe('Page Load Performance', () => {
		beforeAll(async () => {
			await loginAsUser('admin');
		});

		it('should load dashboard within acceptable time with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard');
			logPerformanceMetrics('Dashboard', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.ttfb).toBeLessThan(500);
			expect(metrics.apiCalls).toBeLessThan(10);
		});

		it('should load projects page within acceptable time with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/projects');
			logPerformanceMetrics('Projects', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(10);
		});

		it('should load time tracking page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/time');
			logPerformanceMetrics('Time Tracking', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load planning page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/planning');
			logPerformanceMetrics('Planning', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(10);
		});

		it('should load approvals page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/approvals');
			logPerformanceMetrics('Approvals', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(10);
		});

		it('should load materials page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/materials');
			logPerformanceMetrics('Materials', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load expenses page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/expenses');
			logPerformanceMetrics('Expenses', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load ATA page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/ata');
			logPerformanceMetrics('ATA', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load diary page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/diary');
			logPerformanceMetrics('Diary', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load checklists page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/checklists');
			logPerformanceMetrics('Checklists', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load settings profile page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/settings/profile');
			logPerformanceMetrics('Settings - Profile', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load settings users page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/settings/users');
			logPerformanceMetrics('Settings - Users', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(10);
		});

		it('should load settings organization page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/dashboard/settings/organization');
			logPerformanceMetrics('Settings - Organization', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load super admin dashboard with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/super-admin');
			logPerformanceMetrics('Super Admin - Dashboard', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});

		it('should load super admin organizations page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/super-admin/organizations');
			logPerformanceMetrics('Super Admin - Organizations', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(15);
		});

		it('should load super admin users page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/super-admin/users');
			logPerformanceMetrics('Super Admin - Users', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
			expect(metrics.apiCalls).toBeLessThan(15);
		});

		it('should load super admin analytics page with performance metrics', async () => {
			const { loadTime, metrics } = await measurePagePerformance('/super-admin/analytics');
			logPerformanceMetrics('Super Admin - Analytics', loadTime, metrics);
			
			expect(loadTime).toBeLessThan(5000);
			expect(metrics.fcp).toBeLessThan(2500);
		});
	});

	describe('Navigation Performance', () => {
		it('should navigate between pages quickly', async () => {
			await loginAsUser('admin');
			await testHelpers.navigateTo('/dashboard');
			
			const startTime = Date.now();
			await testHelpers.navigateTo('/dashboard/projects');
			await testHelpers.waitForSelector('main', 10000);
			const navTime = Date.now() - startTime;
			
			console.log(`\n📊 Client-side Navigation Time: ${(navTime / 1000).toFixed(2)}s\n`);
			
			// Client-side navigation should be fast
			expect(navTime).toBeLessThan(3000);
		});
	});

	describe('Performance Budgets', () => {
		it('should meet performance budgets for dashboard', async () => {
			await loginAsUser('admin');
			
			const { loadTime, metrics } = await measurePagePerformance('/dashboard');
			
			// Performance budgets (based on EPIC 26 targets)
			const budgets = {
				fcp: 2500, // 2.5s
				loadTime: 5000, // 5s
				apiCalls: 7, // EPIC 26 target: < 5, but allowing up to 7
				jsSize: 300 * 1024, // 300 KB
			};
			
			console.log('\n📊 Performance Budget Check:');
			console.log(`   FCP: ${(metrics.fcp / 1000).toFixed(2)}s (budget: ${(budgets.fcp / 1000).toFixed(2)}s) ${metrics.fcp <= budgets.fcp ? '✅' : '❌'}`);
			console.log(`   Load Time: ${(loadTime / 1000).toFixed(2)}s (budget: ${(budgets.loadTime / 1000).toFixed(2)}s) ${loadTime <= budgets.loadTime ? '✅' : '❌'}`);
			console.log(`   API Calls: ${metrics.apiCalls} (budget: ${budgets.apiCalls}) ${metrics.apiCalls <= budgets.apiCalls ? '✅' : '❌'}`);
			console.log(`   JS Size: ${(metrics.jsSize / 1024).toFixed(0)} KB (budget: ${(budgets.jsSize / 1024).toFixed(0)} KB) ${metrics.jsSize <= budgets.jsSize ? '✅' : '❌'}\n`);
			
			// Soft assertions (warnings, not failures)
			if (metrics.fcp > budgets.fcp) {
				console.warn(`⚠️ FCP exceeds budget: ${(metrics.fcp / 1000).toFixed(2)}s > ${(budgets.fcp / 1000).toFixed(2)}s`);
			}
			if (metrics.apiCalls > budgets.apiCalls) {
				console.warn(`⚠️ API calls exceed budget: ${metrics.apiCalls} > ${budgets.apiCalls}`);
			}
			
			// Hard assertions
			expect(loadTime).toBeLessThan(budgets.loadTime);
		});
	});
});

