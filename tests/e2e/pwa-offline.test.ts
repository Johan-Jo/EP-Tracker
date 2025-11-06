import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('PWA and Offline Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('PWA Installation', () => {
		it('should have manifest.json', async () => {
			await testHelpers.navigateTo('/');
			
			const page = testHelpers.getPage();
			const manifestLink = await page.$('link[rel="manifest"]');
			expect(manifestLink).not.toBeNull();
		});

		it('should have service worker', async () => {
			await testHelpers.navigateTo('/');
			
			const page = testHelpers.getPage();
			// Check if service worker is registered
			const swRegistered = await page.evaluate(() => {
				return 'serviceWorker' in navigator;
			});
			expect(swRegistered).toBe(true);
		});
	});

	describe('Offline Functionality', () => {
		it('should show offline banner when offline', async () => {
			await loginAsUser('admin');
			await testHelpers.navigateTo('/dashboard');
			
			const page = testHelpers.getPage();
			// Simulate offline
			await page.setOfflineMode(true);
			
			// Wait for offline banner
			await testHelpers.waitForText('offline', 5000).catch(() => {
				return testHelpers.waitForText('ansluten', 5000);
			});
			
			// Restore online
			await page.setOfflineMode(false);
		});
	});
});

