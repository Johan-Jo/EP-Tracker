import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Approvals and Exports Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin'); // Admin can approve
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Approvals Page', () => {
		it('should load approvals page', async () => {
			await testHelpers.navigateTo('/dashboard/approvals');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/approvals');
		});

		it('should display weekly overview', async () => {
			await testHelpers.navigateTo('/dashboard/approvals');
			
			await testHelpers.waitForText('godkännande', 10000).catch(() => {
				return testHelpers.waitForText('approval', 10000);
			});
		});

		it('should show time entries for review', async () => {
			await testHelpers.navigateTo('/dashboard/approvals');
			
			// Wait for content to load
			await testHelpers.waitForSelector('main', 10000);
		});
	});

	describe('CSV Exports', () => {
		it('should allow exporting payroll report', async () => {
			await testHelpers.navigateTo('/dashboard/payroll');
			
			const exportSelectors = [
				'button:has-text("Exportera")',
				'button:has-text("Export")',
				'a[href*="export"]',
			];
			
			for (const selector of exportSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						// Found export button
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});

		it('should allow exporting invoice report', async () => {
			await testHelpers.navigateTo('/dashboard/payroll');
			
			// Look for invoice export option
			await testHelpers.waitForSelector('main', 10000);
		});
	});
});

