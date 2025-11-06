// Jest setup file for E2E tests
// This runs before all tests

const http = require('http');
const path = require('path');
const fs = require('fs');

// Load .env.local file if it exists
const envLocalPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
	const envFile = fs.readFileSync(envLocalPath, 'utf8');
	envFile.split('\n').forEach((line: string) => {
		const trimmedLine = line.trim();
		if (trimmedLine && !trimmedLine.startsWith('#')) {
			const [key, ...valueParts] = trimmedLine.split('=');
			if (key && valueParts.length > 0) {
				const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
				process.env[key.trim()] = value.trim();
			}
		}
	});
	console.log('✅ Loaded environment variables from .env.local');
}

async function checkServer(url: string, timeout = 5000): Promise<boolean> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			resolve(false);
		}, timeout);

		const req = http.get(url, () => {
			clearTimeout(timer);
			resolve(true);
		});

		req.on('error', () => {
			clearTimeout(timer);
			resolve(false);
		});
	});
}

beforeAll(async () => {
	// Set test environment variables if not already set
	const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
	process.env.TEST_BASE_URL = baseUrl;
	process.env.HEADLESS = process.env.HEADLESS || 'true';

	// Log which test users are configured (without showing passwords)
	console.log('\n📋 Test User Configuration:');
	console.log(`   Worker: ${process.env.TEST_WORKER_EMAIL || 'worker@test.com (default)'}`);
	console.log(`   Admin: ${process.env.TEST_ADMIN_EMAIL || 'admin@test.com (default)'}`);
	console.log(`   Foreman: ${process.env.TEST_FOREMAN_EMAIL || 'foreman@test.com (default)'}`);
	console.log(`   Finance: ${process.env.TEST_FINANCE_EMAIL || 'finance@test.com (default)'}`);
	console.log('');

	// Check if server is running
	const isRunning = await checkServer(baseUrl);
	if (!isRunning) {
		console.error('\n❌ ERROR: Development server is not running!');
		console.error(`   Expected server at: ${baseUrl}`);
		console.error('\n   Please start your dev server first:');
		console.error('   npm run dev\n');
		console.error('   Then run the tests again.\n');
		process.exit(1);
	}
	console.log(`✅ Server is running at ${baseUrl}`);
});

afterAll(async () => {
	// Cleanup if needed
});
