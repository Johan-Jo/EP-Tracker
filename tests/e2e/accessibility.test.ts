import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Accessibility Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Keyboard Navigation', () => {
		it('should allow keyboard navigation on dashboard', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			const page = testHelpers.getPage();
			// Press Tab to navigate
			await page.keyboard.press('Tab');
			
			// Check if focus moved
			const focusedElement = await page.evaluate(() => {
				return document.activeElement?.tagName;
			});
			expect(focusedElement).toBeTruthy();
		});
	});

	describe('ARIA Labels', () => {
		it('should have ARIA labels on interactive elements', async () => {
			await testHelpers.navigateTo('/dashboard');
			
			const page = testHelpers.getPage();
			// Check for buttons with aria-labels
			const buttonsWithAria = await page.$$('button[aria-label]');
			expect(buttonsWithAria.length).toBeGreaterThan(0);
		});
	});

	describe('Form Labels', () => {
		it('should have labels for form inputs', async () => {
			await testHelpers.navigateTo('/dashboard/projects/new');
			
			const page = testHelpers.getPage();
			// Check for inputs with labels
			const inputs = await page.$$('input');
			for (const input of inputs) {
				const id = await page.evaluate((el) => el.id, input);
				if (id) {
					const label = await page.$(`label[for="${id}"]`);
					expect(label).not.toBeNull();
				}
			}
		});
	});
});

