#!/usr/bin/env node

/**
 * Performance Testing Script for EP-Tracker
 * 
 * This script runs basic performance tests using Chrome DevTools Protocol
 * and outputs results in a readable format.
 * 
 * Usage:
 *   node scripts/performance-test.js
 * 
 * Requirements:
 *   npm install puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_PAGES = [
  { name: 'Landing Page', url: '/' },
  { name: 'Dashboard', url: '/dashboard', requiresAuth: true },
  { name: 'Projects', url: '/dashboard/projects', requiresAuth: true },
  { name: 'Time Tracking', url: '/dashboard/time', requiresAuth: true },
];

// Test credentials (use environment variables in CI)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';

// Performance metrics to collect
const METRICS = [
  'FirstContentfulPaint',
  'LargestContentfulPaint',
  'TimeToInteractive',
  'TotalBlockingTime',
  'CumulativeLayoutShift',
];

/**
 * Login to the application
 */
async function login(page) {
  console.log('🔐 Logging in...');
  
  try {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle0' });
    
    // Fill in credentials
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    
    // Click sign in button
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

/**
 * Measure page performance
 */
async function measurePagePerformance(page, pageInfo) {
  console.log(`\n📊 Testing: ${pageInfo.name}`);
  console.log(`   URL: ${BASE_URL}${pageInfo.url}`);
  
  // Enable performance tracking
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = [];
    
    // Monitor performance entries
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.performanceMetrics.push({
          name: entry.name,
          entryType: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
        });
      }
    }).observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
  });
  
  // Navigate and measure
  const startTime = Date.now();
  
  await page.goto(`${BASE_URL}${pageInfo.url}`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
  
  const loadTime = Date.now() - startTime;
  
  // Get performance metrics
  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    
    return {
      // Navigation Timing
      dns: perf.domainLookupEnd - perf.domainLookupStart,
      tcp: perf.connectEnd - perf.connectStart,
      ttfb: perf.responseStart - perf.requestStart,
      domLoad: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      windowLoad: perf.loadEventEnd - perf.loadEventStart,
      
      // Paint Timing
      fcp: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
      
      // Resource counts
      totalResources: performance.getEntriesByType('resource').length,
      
      // Layout shifts (approximation)
      cls: window.performanceMetrics.filter(m => m.entryType === 'layout-shift').length,
    };
  });
  
  // Get network requests
  const requests = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(r => ({
      name: r.name,
      type: r.initiatorType,
      size: r.transferSize,
      duration: r.duration,
    }));
  });
  
  // Count API calls
  const apiCalls = requests.filter(r => r.name.includes('/api/')).length;
  
  // Calculate total page size
  const totalSize = requests.reduce((sum, r) => sum + (r.size || 0), 0);
  
  // Get JavaScript bundle size
  const jsSize = requests
    .filter(r => r.name.endsWith('.js'))
    .reduce((sum, r) => sum + (r.size || 0), 0);
  
  return {
    name: pageInfo.name,
    url: pageInfo.url,
    loadTime,
    metrics: {
      ...metrics,
      apiCalls,
      totalSize: Math.round(totalSize / 1024), // KB
      jsSize: Math.round(jsSize / 1024), // KB
    },
    requests: requests.length,
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format milliseconds to seconds
 */
function formatTime(ms) {
  return (ms / 1000).toFixed(2) + 's';
}

/**
 * Determine if metric passes threshold
 */
function getMetricStatus(value, thresholds) {
  if (value <= thresholds.good) return { status: '✅', color: 'green' };
  if (value <= thresholds.medium) return { status: '⚠️', color: 'yellow' };
  return { status: '❌', color: 'red' };
}

/**
 * Print results
 */
function printResults(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE TEST RESULTS');
  console.log('='.repeat(80));
  
  // Thresholds (in ms unless noted)
  const thresholds = {
    fcp: { good: 1500, medium: 2500 },
    loadTime: { good: 3000, medium: 5000 },
    ttfb: { good: 200, medium: 500 },
    apiCalls: { good: 5, medium: 10 },
    jsSize: { good: 200, medium: 300 }, // KB
  };
  
  for (const result of results) {
    console.log(`\n📄 ${result.name}`);
    console.log('─'.repeat(80));
    
    // Core metrics
    const fcpStatus = getMetricStatus(result.metrics.fcp, thresholds.fcp);
    const loadStatus = getMetricStatus(result.loadTime, thresholds.loadTime);
    const ttfbStatus = getMetricStatus(result.metrics.ttfb, thresholds.ttfb);
    const apiStatus = getMetricStatus(result.metrics.apiCalls, thresholds.apiCalls);
    const jsStatus = getMetricStatus(result.metrics.jsSize, thresholds.jsSize);
    
    console.log(`   FCP (First Contentful Paint):  ${fcpStatus.status} ${formatTime(result.metrics.fcp)}`);
    console.log(`   Total Load Time:               ${loadStatus.status} ${formatTime(result.loadTime)}`);
    console.log(`   TTFB (Time to First Byte):     ${ttfbStatus.status} ${formatTime(result.metrics.ttfb)}`);
    console.log(`   DNS Lookup:                    ${formatTime(result.metrics.dns)}`);
    console.log(`   TCP Connection:                ${formatTime(result.metrics.tcp)}`);
    console.log('');
    console.log(`   Total Requests:                ${result.requests}`);
    console.log(`   API Calls:                     ${apiStatus.status} ${result.metrics.apiCalls}`);
    console.log(`   Total Page Size:               ${result.metrics.totalSize} KB`);
    console.log(`   JavaScript Size:               ${jsStatus.status} ${result.metrics.jsSize} KB`);
    console.log(`   Layout Shifts (approx):        ${result.metrics.cls}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  // Analyze results and provide recommendations
  const avgFcp = results.reduce((sum, r) => sum + r.metrics.fcp, 0) / results.length;
  const avgApiCalls = results.reduce((sum, r) => sum + r.metrics.apiCalls, 0) / results.length;
  const avgJsSize = results.reduce((sum, r) => sum + r.metrics.jsSize, 0) / results.length;
  
  if (avgFcp > thresholds.fcp.medium) {
    console.log('❌ FCP is too slow (avg: ' + formatTime(avgFcp) + ')');
    console.log('   → Enable React Query caching');
    console.log('   → Implement code splitting');
    console.log('   → Reduce client components');
  }
  
  if (avgApiCalls > thresholds.apiCalls.good) {
    console.log('⚠️ Too many API calls (avg: ' + avgApiCalls.toFixed(1) + ')');
    console.log('   → Enable query caching');
    console.log('   → Combine dashboard queries');
    console.log('   → Cache session data');
  }
  
  if (avgJsSize > thresholds.jsSize.good) {
    console.log('⚠️ JavaScript bundle is large (avg: ' + avgJsSize.toFixed(0) + ' KB)');
    console.log('   → Implement code splitting');
    console.log('   → Convert to server components');
    console.log('   → Enable tree shaking');
  }
  
  console.log('\n📖 For detailed optimization guide, see:');
  console.log('   - PERFORMANCE-IMPROVEMENT-EPIC.md');
  console.log('   - PERFORMANCE-TEST-PLAN.md');
  console.log('   - PERFORMANCE-AUDIT-SUMMARY.md');
  console.log('');
}

/**
 * Save results to file
 */
function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-results-${timestamp}.json`;
  const filepath = path.join(process.cwd(), 'performance-results', filename);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${filename}`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting performance tests...');
  console.log(`   Target URL: ${BASE_URL}\n`);
  
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    const results = [];
    
    // Login if needed
    let isLoggedIn = false;
    if (TEST_PAGES.some(p => p.requiresAuth)) {
      isLoggedIn = await login(page);
    }
    
    // Test each page
    for (const pageInfo of TEST_PAGES) {
      if (pageInfo.requiresAuth && !isLoggedIn) {
        console.log(`⏭️  Skipping ${pageInfo.name} (not logged in)`);
        continue;
      }
      
      try {
        const result = await measurePagePerformance(page, pageInfo);
        results.push(result);
      } catch (error) {
        console.error(`❌ Error testing ${pageInfo.name}:`, error.message);
      }
    }
    
    // Print and save results
    printResults(results);
    saveResults(results);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, measurePagePerformance };

