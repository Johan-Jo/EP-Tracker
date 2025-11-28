/**
 * Test script to verify demo mode routing logic
 * Run with: npx tsx scripts/test-demo-routing.ts
 */

// Simulate middleware routing logic
function testDemoRouting() {
	console.log('Testing demo mode routing logic...\n');

	const testCases = [
		{
			path: '/demo',
			expected: 'Should stay on /demo (no redirect)',
			shouldRedirect: false,
		},
		{
			path: '/demo/projects',
			expected: 'Should redirect to /dashboard/projects',
			shouldRedirect: true,
			expectedRedirect: '/dashboard/projects',
		},
		{
			path: '/demo/time',
			expected: 'Should redirect to /dashboard/time',
			shouldRedirect: true,
			expectedRedirect: '/dashboard/time',
		},
		{
			path: '/demo/work-orders/today',
			expected: 'Should redirect to /dashboard/work-orders/today',
			shouldRedirect: true,
			expectedRedirect: '/dashboard/work-orders/today',
		},
		{
			path: '/dashboard/projects',
			expected: 'Should stay on /dashboard/projects (not a demo route)',
			shouldRedirect: false,
		},
	];

	let passed = 0;
	let failed = 0;

	for (const testCase of testCases) {
		const isDemoRoute = testCase.path.startsWith('/demo');
		let shouldRedirect = false;
		let redirectPath = '';

		if (isDemoRoute && testCase.path !== '/demo') {
			// Extract the path after /demo
			const demoPath = testCase.path.replace('/demo', '').replace(/^\//, '');
			if (demoPath) {
				shouldRedirect = true;
				redirectPath = `/dashboard/${demoPath}`;
			}
		}

		const testPassed =
			shouldRedirect === testCase.shouldRedirect &&
			(!testCase.shouldRedirect || redirectPath === testCase.expectedRedirect);

		if (testPassed) {
			console.log(`✅ PASS: ${testCase.path}`);
			console.log(`   ${testCase.expected}`);
			if (shouldRedirect) {
				console.log(`   Redirects to: ${redirectPath}`);
			}
			passed++;
		} else {
			console.log(`❌ FAIL: ${testCase.path}`);
			console.log(`   Expected: ${testCase.expected}`);
			console.log(`   Got: shouldRedirect=${shouldRedirect}, redirectPath=${redirectPath}`);
			failed++;
		}
		console.log('');
	}

	console.log(`\nResults: ${passed} passed, ${failed} failed`);

	// Test sidebar href transformation
	console.log('\n--- Testing Sidebar href transformation ---\n');

	const sidebarTests = [
		{
			originalHref: '/dashboard',
			isDemoMode: true,
			expected: '/demo',
		},
		{
			originalHref: '/dashboard/projects',
			isDemoMode: true,
			expected: '/demo/projects',
		},
		{
			originalHref: '/dashboard/time',
			isDemoMode: true,
			expected: '/demo/time',
		},
		{
			originalHref: '/dashboard',
			isDemoMode: false,
			expected: '/dashboard',
		},
		{
			originalHref: '/dashboard/projects',
			isDemoMode: false,
			expected: '/dashboard/projects',
		},
	];

	let sidebarPassed = 0;
	let sidebarFailed = 0;

	for (const test of sidebarTests) {
		let transformedHref = test.originalHref;
		if (test.isDemoMode && test.originalHref.startsWith('/dashboard')) {
			transformedHref = test.originalHref.replace('/dashboard', '/demo');
		}

		const testPassed = transformedHref === test.expected;

		if (testPassed) {
			console.log(`✅ PASS: ${test.originalHref} (demo=${test.isDemoMode}) → ${transformedHref}`);
			sidebarPassed++;
		} else {
			console.log(`❌ FAIL: ${test.originalHref} (demo=${test.isDemoMode})`);
			console.log(`   Expected: ${test.expected}, Got: ${transformedHref}`);
			sidebarFailed++;
		}
	}

	console.log(`\nSidebar Results: ${sidebarPassed} passed, ${sidebarFailed} failed`);

	const totalPassed = passed + sidebarPassed;
	const totalFailed = failed + sidebarFailed;

	console.log(`\n=== TOTAL: ${totalPassed} passed, ${totalFailed} failed ===`);

	if (totalFailed === 0) {
		console.log('\n✅ All tests passed!');
		process.exit(0);
	} else {
		console.log('\n❌ Some tests failed');
		process.exit(1);
	}
}

testDemoRouting();

