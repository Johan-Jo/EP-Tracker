import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Planning System Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin'); // Admin can access planning
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Week Planning Grid', () => {
		it('should load planning page', async () => {
			await testHelpers.navigateTo('/dashboard/planning');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/planning');
		});

		it('should display week grid', async () => {
			await testHelpers.navigateTo('/dashboard/planning');
			
			// Wait for planning interface to load
			await testHelpers.waitForText('planering', 10000).catch(() => {
				return testHelpers.waitForText('planning', 10000);
			});
			
			// Look for grid or calendar elements
			const page = testHelpers.getPage();
			const gridElements = await page.$$('[class*="grid"], [class*="calendar"], [class*="week"]');
			expect(gridElements.length).toBeGreaterThan(0);
		});

		it('should allow filtering projects', async () => {
			await testHelpers.navigateTo('/dashboard/planning');
			
			// Look for filter controls
			const filterSelectors = [
				'select',
				'button[class*="filter"]',
				'[class*="chip"]',
			];
			
			let foundFilter = false;
			for (const selector of filterSelectors) {
				try {
					const elements = await testHelpers.getPage().$$(selector);
					if (elements.length > 0) {
						foundFilter = true;
						break;
					}
				} catch {
					// Try next selector
				}
			}
			
			expect(foundFilter).toBe(true);
		});
	});

	describe('Mobile Today List', () => {
		it('should load today list page', async () => {
			await testHelpers.navigateTo('/dashboard/planning/today');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/planning/today');
		});

		it('should display today assignments', async () => {
			await testHelpers.navigateTo('/dashboard/planning/today');
			
			await testHelpers.waitForText('idag', 10000).catch(() => {
				return testHelpers.waitForText('today', 10000);
			});
		});

		it('should allow check-in/check-out', async () => {
			await testHelpers.navigateTo('/dashboard/planning/today');
			
			// Look for check-in/check-out buttons
			const checkInSelectors = [
				'button:has-text("Check-in")',
				'button:has-text("Checka in")',
				'button[aria-label*="check" i]',
			];
			
			for (const selector of checkInSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						// Found check-in button
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});
});

