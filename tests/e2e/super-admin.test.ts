import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Super Admin Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin'); // Admin has super admin access
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Super Admin Dashboard', () => {
		it('should load super admin dashboard', async () => {
			await testHelpers.navigateTo('/super-admin');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/super-admin');
		});
	});

	describe('Organizations Management', () => {
		it('should load organizations list', async () => {
			await testHelpers.navigateTo('/super-admin/organizations');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/organizations');
		});

		it('should display organizations', async () => {
			await testHelpers.navigateTo('/super-admin/organizations');
			
			await testHelpers.waitForText('organisation', 10000).catch(() => {
				return testHelpers.waitForText('organization', 10000);
			});
		});
	});

	describe('Users Management', () => {
		it('should load users list', async () => {
			await testHelpers.navigateTo('/super-admin/users');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/users');
		});

		it('should display users', async () => {
			await testHelpers.navigateTo('/super-admin/users');
			
			await testHelpers.waitForText('användare', 10000).catch(() => {
				return testHelpers.waitForText('user', 10000);
			});
		});
	});

	describe('Billing Management', () => {
		it('should load billing page', async () => {
			await testHelpers.navigateTo('/super-admin/billing');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/billing');
		});
	});

	describe('Analytics', () => {
		it('should load analytics page', async () => {
			await testHelpers.navigateTo('/super-admin/analytics');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/analytics');
		});
	});

	describe('System Logs', () => {
		it('should load logs page', async () => {
			await testHelpers.navigateTo('/super-admin/logs');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/logs');
		});
	});
});

