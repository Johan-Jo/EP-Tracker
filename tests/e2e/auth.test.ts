import { testHelpers } from './helpers/test-helpers';
import { loginAsUser, logout, TEST_USERS } from './helpers/auth-helpers';

describe('Authentication Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Sign In', () => {
		it('should sign in with valid credentials', async () => {
			await testHelpers.navigateTo('/sign-in');
			await testHelpers.waitForSelector('input[type="email"]');
			
			const user = TEST_USERS.admin;
			await testHelpers.type('input[type="email"]', user.email);
			await testHelpers.type('input[type="password"]', user.password);
			await testHelpers.click('button[type="submit"]');
			
			await testHelpers.waitForNavigation();
			
			// Should redirect to dashboard or complete-setup
			const url = testHelpers.getPage().url();
			expect(url).toMatch(/\/(dashboard|complete-setup)/);
		});

		it('should show error with invalid credentials', async () => {
			await testHelpers.navigateTo('/sign-in');
			await testHelpers.waitForSelector('input[type="email"]');
			
			await testHelpers.type('input[type="email"]', 'invalid@test.com');
			await testHelpers.type('input[type="password"]', 'wrongpassword');
			await testHelpers.click('button[type="submit"]');
			
			// Wait for error message
			await testHelpers.waitForText('fel', 5000).catch(() => {
				// Error might be in English
				return testHelpers.waitForText('error', 5000);
			});
		});
	});

	describe('Sign Up', () => {
		it('should navigate to sign up page', async () => {
			await testHelpers.navigateTo('/sign-up');
			await testHelpers.waitForSelector('input[type="email"]');
			
			const hasEmailField = await testHelpers.isVisible('input[type="email"]');
			expect(hasEmailField).toBe(true);
		});

		it('should validate required fields', async () => {
			await testHelpers.navigateTo('/sign-up');
			await testHelpers.waitForSelector('button[type="submit"]');
			
			// Try to submit without filling fields
			await testHelpers.click('button[type="submit"]');
			
			// Should show validation errors
			await testHelpers.waitForText('obligatorisk', 3000).catch(() => {
				return testHelpers.waitForText('required', 3000);
			});
		});
	});

	describe('Logout', () => {
		it('should logout successfully', async () => {
			await loginAsUser('admin');
			
			// Verify we're logged in
			const url = testHelpers.getPage().url();
			expect(url).toMatch(/\/(dashboard|complete-setup)/);
			
			await logout();
			
			// Should redirect to sign-in
			const newUrl = testHelpers.getPage().url();
			expect(newUrl).toMatch(/\/sign-in/);
		});
	});

	describe('Session Management', () => {
		it('should maintain session after page reload', async () => {
			await loginAsUser('admin');
			
			const page = testHelpers.getPage();
			await page.reload({ waitUntil: 'networkidle0' });
			
			// Should still be logged in
			const url = page.url();
			expect(url).toMatch(/\/(dashboard|complete-setup)/);
		});
	});
});
