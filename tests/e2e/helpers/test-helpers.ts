import puppeteer, { Browser, Page } from 'puppeteer';
import config from '../puppeteer.config';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export class TestHelpers {
	private browser: Browser | null = null;
	private page: Page | null = null;

	async init() {
		this.browser = await puppeteer.launch(config);
		this.page = await this.browser.newPage();
		await this.page.setViewport({ width: 1280, height: 720 });
		return this.page;
	}

	async cleanup() {
		if (this.page) await this.page.close();
		if (this.browser) await this.browser.close();
	}

	getPage(): Page {
		if (!this.page) {
			throw new Error('Page not initialized. Call init() first.');
		}
		return this.page;
	}

	async navigateTo(path: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' }) {
		const page = this.getPage();
		const url = `${BASE_URL}${path}`;
		try {
			await page.goto(url, { 
				waitUntil: options?.waitUntil || 'networkidle2',
				timeout: options?.timeout || 60000 
			});
		} catch (error: any) {
			if (error.message?.includes('net::ERR_CONNECTION_REFUSED') || error.message?.includes('Navigation timeout')) {
				throw new Error(
					`Cannot connect to ${BASE_URL}. Make sure your dev server is running:\n` +
					`  npm run dev\n\n` +
					`Original error: ${error.message}`
				);
			}
			throw error;
		}
	}

	async waitForSelector(selector: string, timeout = 30000) {
		const page = this.getPage();
		await page.waitForSelector(selector, { timeout });
	}

	async click(selector: string) {
		const page = this.getPage();
		await page.click(selector);
	}

	async type(selector: string, text: string) {
		const page = this.getPage();
		await page.type(selector, text);
	}

	async getText(selector: string): Promise<string> {
		const page = this.getPage();
		return await page.$eval(selector, (el) => el.textContent || '');
	}

	async isVisible(selector: string): Promise<boolean> {
		const page = this.getPage();
		try {
			await page.waitForSelector(selector, { timeout: 5000 });
			return await page.$eval(selector, (el) => {
				const style = window.getComputedStyle(el);
				return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
			});
		} catch {
			return false;
		}
	}

	async waitForNavigation(options?: { timeout?: number }) {
		const page = this.getPage();
		await page.waitForNavigation({ 
			waitUntil: 'networkidle2',
			timeout: options?.timeout || 30000 
		});
	}

	async screenshot(name: string) {
		const page = this.getPage();
		await page.screenshot({ path: `tests/e2e/screenshots/${name}.png`, fullPage: true });
	}

	async login(email: string, password: string) {
		const page = this.getPage();
		
		try {
			// Navigate to sign-in page (using proven method from performance-test-auth.js)
			await page.goto(`${BASE_URL}/sign-in`, { 
				waitUntil: 'networkidle0',
				timeout: 45000 
			});
			
			// Wait for React to hydrate
			await new Promise(resolve => setTimeout(resolve, 3000));
			
			// Wait for email input
			await this.waitForSelector('input[type="email"]', 15000);
			
			// Fill in credentials (using click + type for better reliability)
			await page.click('input[type="email"]');
			await page.type('input[type="email"]', email, { delay: 30 });
			
			await page.click('input[type="password"]');
			await page.type('input[type="password"]', password, { delay: 30 });
			
			// Find and click submit button
			const submitButton = await page.$('button[type="submit"]');
			if (!submitButton) {
				throw new Error('Could not find submit button');
			}
			
			// Click and wait for navigation (using proven Promise.all pattern)
			await Promise.all([
				submitButton.click(),
				page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {
					// Navigation might not happen if already on target page
					return Promise.resolve();
				}),
			]);
			
			// Wait for any redirects
			await new Promise(resolve => setTimeout(resolve, 3000));
			
			// Verify we're logged in
			const url = page.url();
			
			if (url.includes('/dashboard') || url === `${BASE_URL}/`) {
				// Login successful
				return;
			} else {
				// Try navigating to dashboard directly to verify session
				await page.goto(`${BASE_URL}/dashboard`, { 
					waitUntil: 'networkidle0',
					timeout: 30000 
				});
				
				const finalUrl = page.url();
				if (finalUrl.includes('/dashboard')) {
					// Login successful (verified with dashboard)
					return;
				}
				
				throw new Error('Login failed - still not on dashboard');
			}
		} catch (error: any) {
			throw new Error(`Login failed: ${error.message}`);
		}
	}

	async logout() {
		const page = this.getPage();
		// Try to find logout button by text or data attribute
		const logoutTexts = ['Logga ut', 'Logout'];
		
		for (const text of logoutTexts) {
			try {
				const element = await this.findElementByText(text, 'button');
				if (element) {
					await element.click();
					await this.waitForNavigation();
					return;
				}
			} catch {
				// Try next text
			}
		}
		
		// Try data-testid or href selectors
		const logoutSelectors = ['[data-testid="logout"]', 'a[href*="logout"]'];
		for (const selector of logoutSelectors) {
			try {
				await page.click(selector);
				await this.waitForNavigation();
				return;
			} catch {
				// Try next selector
			}
		}
	}

	async fillForm(fields: Record<string, string>) {
		for (const [selector, value] of Object.entries(fields)) {
			await this.waitForSelector(selector);
			await this.type(selector, value);
		}
	}

	async selectOption(selectSelector: string, optionValue: string) {
		const page = this.getPage();
		await page.select(selectSelector, optionValue);
	}

	async waitForText(text: string, timeout = 10000) {
		const page = this.getPage();
		await page.waitForFunction(
			(text) => document.body.textContent?.includes(text),
			{ timeout },
			text
		);
	}

	async clickByText(text: string, elementType: string = 'button') {
		const page = this.getPage();
		const xpath = `//${elementType}[contains(text(), "${text}")]`;
		const elements = await (page as any).$x(xpath);
		if (elements.length > 0) {
			await elements[0].click();
		} else {
			throw new Error(`Element with text "${text}" not found`);
		}
	}

	async findElementByText(text: string, elementType: string = '*') {
		const page = this.getPage();
		const xpath = `//${elementType}[contains(text(), "${text}")]`;
		const elements = await (page as any).$x(xpath);
		return elements.length > 0 ? elements[0] : null;
	}

	async clickByTextOrSelector(texts: string[], selectors: string[], elementType: string = 'button') {
		const page = this.getPage();
		
		// Try selectors first (more reliable)
		for (const selector of selectors) {
			try {
				if (await this.isVisible(selector)) {
					await this.click(selector);
					return;
				}
			} catch {
				// Try next selector
			}
		}
		
		// Try text-based selection
		for (const text of texts) {
			try {
				const element = await this.findElementByText(text, elementType);
				if (element) {
					await element.click();
					return;
				}
			} catch {
				// Try next text
			}
		}
		
		throw new Error(`Could not find element with texts ${texts.join(', ')} or selectors ${selectors.join(', ')}`);
	}
}

export const testHelpers = new TestHelpers();

