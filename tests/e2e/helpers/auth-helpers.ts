import { Page } from 'puppeteer';
import { testHelpers } from './test-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export interface TestUser {
	email: string;
	password: string;
	role?: 'worker' | 'foreman' | 'admin' | 'finance' | 'super_admin';
}

export const TEST_USERS: Record<string, TestUser> = {
	worker: {
		email: process.env.TEST_WORKER_EMAIL || 'worker@test.com',
		password: process.env.TEST_WORKER_PASSWORD || 'test123456',
		role: 'worker',
	},
	foreman: {
		email: process.env.TEST_FOREMAN_EMAIL || 'foreman@test.com',
		password: process.env.TEST_FOREMAN_PASSWORD || 'test123456',
		role: 'foreman',
	},
	admin: {
		email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
		password: process.env.TEST_ADMIN_PASSWORD || 'test123456',
		role: 'admin',
	},
	finance: {
		email: process.env.TEST_FINANCE_EMAIL || 'finance@test.com',
		password: process.env.TEST_FINANCE_PASSWORD || 'test123456',
		role: 'finance',
	},
	super_admin: {
		email: process.env.TEST_SUPER_ADMIN_EMAIL || 'superadmin@test.com',
		password: process.env.TEST_SUPER_ADMIN_PASSWORD || 'test123456',
		role: 'super_admin',
	},
};

export async function loginAsUser(userType: keyof typeof TEST_USERS): Promise<void> {
	const user = TEST_USERS[userType];
	if (!user) {
		throw new Error(`Test user ${userType} not found`);
	}
	await testHelpers.login(user.email, user.password);
}

export async function signUpNewUser(email: string, password: string, fullName: string): Promise<void> {
	await testHelpers.navigateTo('/sign-up');
	await testHelpers.waitForSelector('input[type="email"]');
	await testHelpers.type('input[type="email"]', email);
	await testHelpers.type('input[type="password"]', password);
	
	// Look for full name field
	const nameSelectors = ['input[name="full_name"]', 'input[name="name"]', 'input[placeholder*="namn" i]'];
	for (const selector of nameSelectors) {
		try {
			await testHelpers.waitForSelector(selector, 2000);
			await testHelpers.type(selector, fullName);
			break;
		} catch {
			// Try next selector
		}
	}
	
	await testHelpers.click('button[type="submit"]');
	await testHelpers.waitForNavigation();
}

export async function logout(): Promise<void> {
	await testHelpers.logout();
}

