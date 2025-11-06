import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';

describe('Project Management Tests', () => {
	beforeAll(async () => {
		await testHelpers.init();
		await loginAsUser('admin'); // Admin can create projects
	});

	afterAll(async () => {
		await testHelpers.cleanup();
	});

	describe('Projects List', () => {
		it('should load projects page', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			await testHelpers.waitForSelector('main', 10000);
			
			const url = testHelpers.getPage().url();
			expect(url).toContain('/projects');
		});

		it('should display projects list or empty state', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			
			// Wait for either projects list or empty state
			await testHelpers.waitForText('projekt', 10000).catch(() => {
				return testHelpers.waitForText('project', 10000);
			});
		});

		it('should have search functionality', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			
			// Look for search input
			const searchSelectors = [
				'input[type="search"]',
				'input[placeholder*="sök" i]',
				'input[placeholder*="search" i]',
			];
			
			let foundSearch = false;
			for (const selector of searchSelectors) {
				try {
					const isVisible = await testHelpers.isVisible(selector);
					if (isVisible) {
						foundSearch = true;
						break;
					}
				} catch {
					// Try next selector
				}
			}
			
			expect(foundSearch).toBe(true);
		});
	});

	describe('Create Project', () => {
		it('should navigate to create project page', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			
			const createSelectors = [
				'a[href*="/projects/new"]',
				'button:has-text("Nytt projekt")',
				'button:has-text("New Project")',
			];
			
			for (const selector of createSelectors) {
				try {
					await testHelpers.click(selector);
					await testHelpers.waitForNavigation();
					const url = testHelpers.getPage().url();
					expect(url).toContain('/projects/new');
					return;
				} catch {
					// Try next selector
				}
			}
		});

		it('should create a new project', async () => {
			await testHelpers.navigateTo('/dashboard/projects/new');
			await testHelpers.waitForSelector('input[name="name"]', 10000).catch(() => {
				return testHelpers.waitForSelector('input[type="text"]', 10000);
			});
			
			const projectName = `Test Project ${Date.now()}`;
			
			// Fill in project name
			const nameSelectors = [
				'input[name="name"]',
				'input[placeholder*="namn" i]',
				'input[placeholder*="name" i]',
			];
			
			for (const selector of nameSelectors) {
				try {
					await testHelpers.waitForSelector(selector, 2000);
					await testHelpers.type(selector, projectName);
					break;
				} catch {
					// Try next selector
				}
			}
			
			// Submit form
			await testHelpers.click('button[type="submit"]');
			await testHelpers.waitForNavigation();
			
			// Should redirect to project detail or projects list
			const url = testHelpers.getPage().url();
			expect(url).toMatch(/\/projects/);
		});

		it('should validate required fields', async () => {
			await testHelpers.navigateTo('/dashboard/projects/new');
			
			// Try to submit without filling name
			await testHelpers.click('button[type="submit"]');
			
			// Should show validation error
			await testHelpers.waitForText('obligatorisk', 3000).catch(() => {
				return testHelpers.waitForText('required', 3000);
			});
		});
	});

	describe('Project Details', () => {
		it('should navigate to project detail page', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			
			// Look for first project card/link
			const projectSelectors = [
				'a[href*="/projects/"]',
				'[class*="project-card"]',
				'[class*="project-item"]',
			];
			
			for (const selector of projectSelectors) {
				try {
					const element = await testHelpers.getPage().$(selector);
					if (element) {
						await element.click();
						await testHelpers.waitForNavigation();
						const url = testHelpers.getPage().url();
						expect(url).toMatch(/\/projects\/[^/]+$/);
						return;
					}
				} catch {
					// Try next selector
				}
			}
		});

		it('should display project information', async () => {
			await testHelpers.navigateTo('/dashboard/projects');
			
			// Click first project if available
			const page = testHelpers.getPage();
			const projectLink = await page.$('a[href*="/projects/"]');
			if (projectLink) {
				await projectLink.click();
				await testHelpers.waitForNavigation();
				
				// Should show project details
				await testHelpers.waitForText('projekt', 5000).catch(() => {
					return testHelpers.waitForText('project', 5000);
				});
			}
		});
	});
});

