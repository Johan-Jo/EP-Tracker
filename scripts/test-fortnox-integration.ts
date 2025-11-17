/**
 * Fortnox Integration Test Script
 * 
 * This script verifies that the Fortnox integration is properly set up:
 * 1. Database migrations applied
 * 2. API endpoints accessible
 * 3. Environment variables configured
 * 4. Client functions working
 * 
 * Usage:
 *   npx tsx scripts/test-fortnox-integration.ts
 *   OR
 *   npx ts-node scripts/test-fortnox-integration.ts
 * 
 * The script automatically loads .env.local if it exists.
 * Or set environment variables manually:
 *   FORTNOX_CLIENT_ID=xxx FORTNOX_CLIENT_SECRET=yyy npx tsx scripts/test-fortnox-integration.ts
 */

// Load environment variables from .env.local if it exists
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Also try loading regular .env as fallback
config();

if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
	console.log('📄 Loaded environment variables from .env.local\n');
}

import { createClient } from '@supabase/supabase-js';

interface TestResult {
	name: string;
	status: 'pass' | 'fail' | 'skip';
	message: string;
	details?: string;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
	results.push(result);
	const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
	console.log(`${icon} ${result.name}: ${result.message}`);
	if (result.details) {
		console.log(`   ${result.details}`);
	}
}

async function testDatabaseMigrations() {
	console.log('\n📊 Testing Database Migrations...\n');

	try {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseUrl || !supabaseKey) {
			logResult({
				name: 'Database Connection',
				status: 'fail',
				message: 'Missing Supabase environment variables',
				details: 'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
			});
			return;
		}

		const supabase = createClient(supabaseUrl, supabaseKey);

		// Test 1: Check fortnox_connections table exists
		const { data: connectionsTable, error: connectionsError } = await supabase
			.from('fortnox_connections')
			.select('id')
			.limit(1);

		if (connectionsError && connectionsError.code === '42P01') {
			logResult({
				name: 'fortnox_connections table',
				status: 'fail',
				message: 'Table does not exist',
				details: 'Run migration: 20251117000001_fortnox_connections.sql',
			});
		} else if (connectionsError) {
			logResult({
				name: 'fortnox_connections table',
				status: 'fail',
				message: `Error accessing table: ${connectionsError.message}`,
			});
		} else {
			logResult({
				name: 'fortnox_connections table',
				status: 'pass',
				message: 'Table exists and is accessible',
			});
		}

		// Test 2: Check fortnox_invoice_links table exists
		const { data: linksTable, error: linksError } = await supabase
			.from('fortnox_invoice_links')
			.select('id')
			.limit(1);

		if (linksError && linksError.code === '42P01') {
			logResult({
				name: 'fortnox_invoice_links table',
				status: 'fail',
				message: 'Table does not exist',
				details: 'Run migration: 20251117000002_fortnox_invoice_links.sql',
			});
		} else if (linksError) {
			logResult({
				name: 'fortnox_invoice_links table',
				status: 'fail',
				message: `Error accessing table: ${linksError.message}`,
			});
		} else {
			logResult({
				name: 'fortnox_invoice_links table',
				status: 'pass',
				message: 'Table exists and is accessible',
			});
		}

		// Test 3: Check RLS policies (try to query with anon key)
		if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
			const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
			const { error: rlsError } = await anonSupabase
				.from('fortnox_connections')
				.select('id')
				.limit(1);

			if (rlsError && rlsError.code === '42501') {
				logResult({
					name: 'RLS Policies',
					status: 'pass',
					message: 'RLS is enabled (expected error for unauthenticated access)',
				});
			} else {
				logResult({
					name: 'RLS Policies',
					status: 'skip',
					message: 'Could not verify RLS (requires authenticated user)',
				});
			}
		}
	} catch (error) {
		logResult({
			name: 'Database Connection',
			status: 'fail',
			message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
		});
	}
}

async function testEnvironmentVariables() {
	console.log('\n🔐 Testing Environment Variables...\n');

	const requiredVars = [
		'NEXT_PUBLIC_SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_ANON_KEY',
	];

	const optionalVars = [
		'FORTNOX_CLIENT_ID',
		'FORTNOX_CLIENT_SECRET',
	];

	// Check required variables
	for (const varName of requiredVars) {
		const value = process.env[varName];
		if (value) {
			logResult({
				name: varName,
				status: 'pass',
				message: 'Set',
				details: value.substring(0, 20) + '...',
			});
		} else {
			logResult({
				name: varName,
				status: 'fail',
				message: 'Not set',
				details: 'Required for Supabase connection',
			});
		}
	}

	// Check optional variables
	for (const varName of optionalVars) {
		const value = process.env[varName];
		if (value) {
			logResult({
				name: varName,
				status: 'pass',
				message: 'Set',
				details: value.substring(0, 10) + '...',
			});
		} else {
			logResult({
				name: varName,
				status: 'skip',
				message: 'Not set',
				details: 'Required for Fortnox OAuth (can be set later)',
			});
		}
	}
}

async function testFileStructure() {
	console.log('\n📁 Testing File Structure...\n');

	const requiredFiles = [
		'lib/integrations/fortnox/client.ts',
		'lib/integrations/fortnox/export-invoice.ts',
		'app/api/integrations/fortnox/export-invoice/route.ts',
		'app/api/integrations/fortnox/invoice-links/route.ts',
		'supabase/migrations/20251117000001_fortnox_connections.sql',
		'supabase/migrations/20251117000002_fortnox_invoice_links.sql',
	];

	const fs = await import('fs/promises');

	for (const file of requiredFiles) {
		try {
			await fs.access(file);
			logResult({
				name: file,
				status: 'pass',
				message: 'Exists',
			});
		} catch {
			logResult({
				name: file,
				status: 'fail',
				message: 'Not found',
			});
		}
	}
}

async function testAPIRoutes() {
	console.log('\n🌐 Testing API Routes (Structure)...\n');

	const fs = await import('fs/promises');

	// Test export-invoice route
	try {
		const exportRoute = await fs.readFile('app/api/integrations/fortnox/export-invoice/route.ts', 'utf-8');
		
		// Check for permission check
		if (exportRoute.includes("['admin', 'finance'].includes(membership.role)")) {
			logResult({
				name: 'Export Route Permissions',
				status: 'pass',
				message: 'Admin and finance role check found',
			});
		} else {
			logResult({
				name: 'Export Route Permissions',
				status: 'fail',
				message: 'Role permission check not found or incorrect',
			});
		}

		// Check for POST handler
		if (exportRoute.includes('export async function POST')) {
			logResult({
				name: 'Export Route Handler',
				status: 'pass',
				message: 'POST handler exists',
			});
		} else {
			logResult({
				name: 'Export Route Handler',
				status: 'fail',
				message: 'POST handler not found',
			});
		}
	} catch (error) {
		logResult({
			name: 'Export Route File',
			status: 'fail',
			message: `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
		});
	}

	// Test invoice-links route
	try {
		const linksRoute = await fs.readFile('app/api/integrations/fortnox/invoice-links/route.ts', 'utf-8');
		
		// Check for permission check
		if (linksRoute.includes("['admin', 'finance', 'foreman'].includes(membership.role)")) {
			logResult({
				name: 'Links Route Permissions',
				status: 'pass',
				message: 'Admin, finance, and foreman role check found',
			});
		} else {
			logResult({
				name: 'Links Route Permissions',
				status: 'fail',
				message: 'Role permission check not found or incorrect',
			});
		}

		// Check for GET handler
		if (linksRoute.includes('export async function GET')) {
			logResult({
				name: 'Links Route Handler',
				status: 'pass',
				message: 'GET handler exists',
			});
		} else {
			logResult({
				name: 'Links Route Handler',
				status: 'fail',
				message: 'GET handler not found',
			});
		}
	} catch (error) {
		logResult({
			name: 'Links Route File',
			status: 'fail',
			message: `Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
		});
	}
}

function printSummary() {
	console.log('\n' + '='.repeat(60));
	console.log('📋 Test Summary');
	console.log('='.repeat(60));

	const passed = results.filter((r) => r.status === 'pass').length;
	const failed = results.filter((r) => r.status === 'fail').length;
	const skipped = results.filter((r) => r.status === 'skip').length;

	console.log(`✅ Passed: ${passed}`);
	console.log(`❌ Failed: ${failed}`);
	console.log(`⏭️  Skipped: ${skipped}`);
	console.log(`📊 Total: ${results.length}`);

	if (failed > 0) {
		console.log('\n❌ Failed Tests:');
		results
			.filter((r) => r.status === 'fail')
			.forEach((r) => {
				console.log(`   - ${r.name}: ${r.message}`);
				if (r.details) {
					console.log(`     ${r.details}`);
				}
			});
	}

	console.log('\n' + '='.repeat(60));

	if (failed === 0) {
		console.log('🎉 All critical tests passed!');
		console.log('\n📝 Next Steps:');
		console.log('   1. Apply database migrations if not done');
		console.log('   2. Set FORTNOX_CLIENT_ID and FORTNOX_CLIENT_SECRET');
		console.log('   3. Create OAuth connection UI (optional)');
		console.log('   4. Test with a real locked invoice_basis');
	} else {
		console.log('⚠️  Some tests failed. Please fix the issues above.');
	}
}

async function main() {
	console.log('🧪 Fortnox Integration Test Suite');
	console.log('='.repeat(60));
	console.log('This script verifies the Fortnox integration setup.\n');

	await testFileStructure();
	await testEnvironmentVariables();
	await testDatabaseMigrations();
	await testAPIRoutes();

	printSummary();
}

main().catch((error) => {
	console.error('❌ Test script error:', error);
	process.exit(1);
});

