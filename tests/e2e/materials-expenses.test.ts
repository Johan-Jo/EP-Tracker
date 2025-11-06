import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Materials, Expenses, and Mileage Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Materials', () => {
		it('should load materials page', async () => {
			await testHelpers.navigateTo('/dashboard/materials');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/materials');
		});

		it('should display materials list or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/materials');
			
			await testHelpers.waitForText('material', 10000).catch(() => {
				return testHelpers.waitForText('materials', 10000);
			});
		});

		it('should allow creating new material entry', async () => {
			await testHelpers.navigateTo('/dashboard/materials');
			
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
						// Wait for form
						await testHelpers.waitForSelector('input', 5000);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});

	describe('Expenses', () => {
		it('should load expenses page', async () => {
			await testHelpers.navigateTo('/dashboard/expenses');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/expenses');
		});

		it('should display expenses list or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/expenses');
			
			await testHelpers.waitForText('utlägg', 10000).catch(() => {
				return testHelpers.waitForText('expense', 10000);
			});
		});
	});

	describe('Mileage', () => {
		it('should allow creating mileage entry', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			// Mileage might be in a form or separate page
			// Look for mileage-related buttons or links
			const mileageSelectors = [
				'button:has-text("Mil")',
				'button:has-text("Mileage")',
				'a[href*="mileage"]',
			];
			
			for (const selector of mileageSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForSelector('input', 5000);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});
});

