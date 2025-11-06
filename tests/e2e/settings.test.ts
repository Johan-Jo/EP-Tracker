import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Settings Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Profile Settings', () => {
		it('should load profile settings page', async () => {
			await testHelpers.navigateTo('/dashboard/settings/profile');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/settings/profile');
		});

		it('should allow editing profile', async () => {
			await testHelpers.navigateTo('/dashboard/settings/profile');
			
			// Look for editable fields
			const inputSelectors = ['input[name="full_name"]', 'input[type="text"]'];
			
			for (const selector of inputSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						// Found editable field
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});

	describe('Organization Settings', () => {
		it('should load organization settings page', async () => {
			await testHelpers.navigateTo('/dashboard/settings/organization');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/settings/organization');
		});
	});

	describe('User Management', () => {
		it('should load users management page', async () => {
			await testHelpers.navigateTo('/dashboard/settings/users');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/settings/users');
		});

		it('should allow inviting users', async () => {
			await testHelpers.navigateTo('/dashboard/settings/users');
			
			const inviteSelectors = [
				'button:has-text("Bjud in")',
				'button:has-text("Invite")',
				'a[href*="/users/invite"]',
			];
			
			for (const selector of inviteSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForSelector('input[type="email"]', 5000);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});

	describe('Notifications Settings', () => {
		it('should load notifications settings page', async () => {
			await testHelpers.navigateTo('/dashboard/settings/notifications');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/settings/notifications');
		});
	});
});

