#!/usr/bin/env node

/**
 * Test User Setup Script for EP Tracker E2E Tests
 * 
 * This script helps you create test users for running E2E tests.
 * 
 * Usage:
 *   node scripts/setup-test-users.js
 * 
 * Or use environment variables to specify existing users:
 *   TEST_WORKER_EMAIL=your-worker@email.com npm run test:e2e
 */

const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function question(prompt) {
	return new Promise((resolve) => {
		rl.question(prompt, resolve);
	});
}

async function main() {
	console.log('\n📋 EP Tracker - Test User Setup\n');
	console.log('This script helps you configure test users for E2E tests.\n');
	console.log('You have two options:');
	console.log('1. Create new test users in Supabase');
	console.log('2. Use existing users (recommended)\n');

	const choice = await question('Choose option (1 or 2): ');

	if (choice === '1') {
		console.log('\n⚠️  To create users in Supabase:');
		console.log('1. Go to Supabase Dashboard → Authentication → Users');
		console.log('2. Click "Add User" → "Create new user"');
		console.log('3. Create these users:\n');
		console.log('   Worker:');
		console.log('     Email: worker@test.com');
		console.log('     Password: test123456\n');
		console.log('   Admin:');
		console.log('     Email: admin@test.com');
		console.log('     Password: test123456\n');
		console.log('   Foreman:');
		console.log('     Email: foreman@test.com');
		console.log('     Password: test123456\n');
		console.log('   Finance:');
		console.log('     Email: finance@test.com');
		console.log('     Password: test123456\n');
		console.log('   Super Admin:');
		console.log('     Email: superadmin@test.com');
		console.log('     Password: test123456\n');
		console.log('4. Make sure each user has completed setup (has organization/membership)');
		console.log('5. Run tests: npm run test:e2e\n');
	} else {
		console.log('\n✅ Using existing users\n');
		console.log('Set these environment variables before running tests:\n');
		
		const workerEmail = await question('Worker email (or press Enter for worker@test.com): ') || 'worker@test.com';
		const workerPassword = await question('Worker password (or press Enter for test123456): ') || 'test123456';
		
		const adminEmail = await question('Admin email (or press Enter for admin@test.com): ') || 'admin@test.com';
		const adminPassword = await question('Admin password (or press Enter for test123456): ') || 'test123456';
		
		console.log('\n📝 PowerShell commands to set environment variables:\n');
		console.log(`$env:TEST_WORKER_EMAIL="${workerEmail}"`);
		console.log(`$env:TEST_WORKER_PASSWORD="${workerPassword}"`);
		console.log(`$env:TEST_ADMIN_EMAIL="${adminEmail}"`);
		console.log(`$env:TEST_ADMIN_PASSWORD="${adminPassword}"`);
		console.log(`$env:TEST_FOREMAN_EMAIL="${await question('Foreman email (or press Enter to skip): ') || 'foreman@test.com'}"`);
		console.log(`$env:TEST_FINANCE_EMAIL="${await question('Finance email (or press Enter to skip): ') || 'finance@test.com'}"`);
		console.log(`$env:TEST_SUPER_ADMIN_EMAIL="${await question('Super Admin email (or press Enter to skip): ') || 'superadmin@test.com'}"`);
		console.log('\nThen run: npm run test:e2e\n');
	}

	rl.close();
}

main().catch(console.error);

