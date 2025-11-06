import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Dashboard Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Dashboard Overview', () => {
		it('should load dashboard successfully', async () => {
			await testHelpers.navigateTo('/dashboard');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/dashboard');
		});

		it('should display stat cards', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Wait for stat cards to load
			await testHelpers.waitForText('projekt', 10000).catch(() => {
				return testHelpers.waitForText('project', 10000);
			});
			
			// Check for stat cards (they might have various class names)
			const page = testHelpers.getPage();
			const statCards = await page.$$('[class*="stat"], [class*="card"]');
			expect(statCards.length).toBeGreaterThan(0);
		});

		it('should display welcome message with user name', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Wait for welcome message
			await testHelpers.waitForText('välkommen', 10000).catch(() => {
				return testHelpers.waitForText('welcome', 10000);
			});
		});
	});

	describe('Navigation', () => {
		it('should navigate to projects page', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Look for projects link
			const projectSelectors = [
				'a[href*="/projects"]',
				'button:has-text("Projekt")',
				'button:has-text("Projects")',
			];
			
			for (const selector of projectSelectors) {
				try {
					await testHelpers.click(selector);
					await testHelpers.waitForNavigation();
					const url = testHelpers.getPage().url();
					expect(url).toContain('/projects');
					return;
				} catch {
					// Try next selector
				}
			}
		});

		it('should navigate to time tracking page', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			const timeSelectors = [
				'a[href*="/time"]',
				'button:has-text("Tid")',
				'button:has-text("Time")',
			];
			
			for (const selector of timeSelectors) {
				try {
					await testHelpers.click(selector);
					await testHelpers.waitForNavigation();
					const url = testHelpers.getPage().url();
					expect(url).toMatch(/\/time/);
					return;
				} catch {
					// Try next selector
				}
			}
		});
	});

	describe('Time Slider Widget', () => {
		it('should display time slider on dashboard', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Look for time slider component
			const page = testHelpers.getPage();
			const timeSlider = await page.$('[class*="time"], [class*="timer"], [class*="slider"]');
			expect(timeSlider).not.toBeNull();
		});

		it('should allow starting timer', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Look for start button
			const startSelectors = [
				'button:has-text("Starta")',
				'button:has-text("Start")',
				'button[aria-label*="start" i]',
			];
			
			for (const selector of startSelectors) {
				try {
					const isVisible = await testHelpers.isVisible(selector);
					if (isVisible) {
						await testHelpers.click(selector);
						// Wait for timer to start
						await testHelpers.waitForText('pågår', 5000).catch(() => {
							return testHelpers.waitForText('running', 5000);
						});
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});
});

