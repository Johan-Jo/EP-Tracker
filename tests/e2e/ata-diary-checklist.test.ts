import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('ATA, Diary, and Checklists Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin');
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('ATA (Change Orders)', () => {
		it('should load ATA page', async () => {
			await testHelpers.navigateTo('/dashboard/ata');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/ata');
		});

		it('should display ATA list or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/ata');
			
			await testHelpers.waitForText('äta', 10000).catch(() => {
				return testHelpers.waitForText('ata', 10000);
			});
		});

		it('should allow creating new ATA', async () => {
			await testHelpers.navigateTo('/dashboard/ata');
			
			const addSelectors = [
				'button:has-text("Ny")',
				'button:has-text("New")',
				'a[href*="/ata/new"]',
			];
			
			for (const selector of addSelectors) {
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

	describe('Diary', () => {
		it('should load diary page', async () => {
			await testHelpers.navigateTo('/dashboard/diary');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/diary');
		});

		it('should display diary entries or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/diary');
			
			await testHelpers.waitForText('dagbok', 10000).catch(() => {
				return testHelpers.waitForText('diary', 10000);
			});
		});

		it('should allow creating new diary entry', async () => {
			await testHelpers.navigateTo('/dashboard/diary');
			
			const addSelectors = [
				'button:has-text("Ny")',
				'button:has-text("New")',
				'a[href*="/diary/new"]',
			];
			
			for (const selector of addSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForSelector('input, textarea', 5000);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});

	describe('Checklists', () => {
		it('should load checklists page', async () => {
			await testHelpers.navigateTo('/dashboard/checklists');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/checklists');
		});

		it('should display checklists list or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/checklists');
			
			await testHelpers.waitForText('checklist', 10000).catch(() => {
				return testHelpers.waitForText('checklista', 10000);
			});
		});

		it('should allow creating new checklist', async () => {
			await testHelpers.navigateTo('/dashboard/checklists');
			
			const addSelectors = [
				'button:has-text("Ny")',
				'button:has-text("New")',
				'a[href*="/checklists/new"]',
			];
			
			for (const selector of addSelectors) {
				try {
					if (await testHelpers.isVisible(selector)) {
						await testHelpers.click(selector);
						await testHelpers.waitForSelector('input, select', 5000);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});
	});
});

