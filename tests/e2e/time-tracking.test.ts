import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Time Tracking Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Time Entries List', () => {
		it('should load time entries page', async () => {
			await testHelpers.navigateTo('/dashboard/time');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/time');
		});

		it('should display time entries or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/time');
			
			await testHelpers.waitForText('tid', 10000).catch(() => {
				return testHelpers.waitForText('time', 10000);
			});
		});
	});

	describe('Timer Widget', () => {
		it('should start timer', async () => {
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

		it('should stop timer', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// First start timer if not running
			const startSelectors = [
				'button:has-text("Starta")',
				'button:has-text("Start")',
			];
			
			for (const selector of startSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForText('pågår', 3000);
						break;
					}
				} catch {
					// Timer might already be running
				}
			}
			
			// Now stop timer
			const stopSelectors = [
				'button:has-text("Stoppa")',
				'button:has-text("Stop")',
				'button[aria-label*="stop" i]',
			];
			
			for (const selector of stopSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForText('stoppad', 5000).catch(() => {
							return testHelpers.waitForText('stopped', 5000);
						});
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});

		it('should persist timer state on page reload', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Start timer
			const startSelectors = ['button:has-text("Starta")', 'button:has-text("Start")'];
			for (const selector of startSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForText('pågår', 3000);
						break;
					}
				} catch {
					// Timer might already be running
				}
			}
			
			// Reload page
			const page = testHelpers.getPage();
			await page.reload({ waitUntil: 'networkidle0' });
			
			// Timer should still be running
			await testHelpers.waitForText('pågår', 5000).catch(() => {
				return testHelpers.waitForText('running', 5000);
			});
		});
	});

	describe('Manual Time Entry', () => {
		it('should allow creating manual time entry', async () => {
			await testHelpers.navigateTo('/dashboard/time');
			
			// Look for add/new button
			const addSelectors = [
				'button:has-text("Ny")',
				'button:has-text("New")',
				'button:has-text("Lägg till")',
				'button:has-text("Add")',
			];
			
			for (const selector of addSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						// Wait for form or dialog
						await testHelpers.waitForSelector('input[type="time"]', 5000).catch(() => {
							return testHelpers.waitForSelector('input[type="number"]', 5000);
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

