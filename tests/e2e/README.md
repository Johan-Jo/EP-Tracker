# EP Tracker - Puppeteer E2E Tests

This directory contains end-to-end tests using Puppeteer and Jest for the EP Tracker application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up test environment variables (optional):
```bash
# Create .env.test file or set environment variables
TEST_BASE_URL=http://localhost:3000
TEST_WORKER_EMAIL=worker@test.com
TEST_WORKER_PASSWORD=test123456
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=test123456
# ... etc
```

3. Make sure your development server is running:
```bash
npm run dev
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests in watch mode:
```bash
npm run test:e2e:watch
```

### Run tests with visible browser (debug mode):
```bash
npm run test:e2e:debug
```

### Run specific test suites:
```bash
npm run test:e2e:auth
npm run test:e2e:dashboard
npm run test:e2e:projects
npm run test:e2e:time
```

### Run a specific test file:
```bash
npx jest --config tests/e2e/jest.config.ts auth.test.ts
```

## Test Structure

- `helpers/` - Test utilities and helpers
  - `test-helpers.ts` - Core Puppeteer helper functions
  - `auth-helpers.ts` - Authentication helper functions
- `*.test.ts` - Test files for different features
  - `auth.test.ts` - Authentication tests
  - `dashboard.test.ts` - Dashboard tests
  - `projects.test.ts` - Project management tests
  - `time-tracking.test.ts` - Time tracking tests
  - `materials-expenses.test.ts` - Materials, expenses, mileage tests
  - `ata-diary-checklist.test.ts` - ATA, diary, checklist tests
  - `planning.test.ts` - Planning system tests
  - `approvals.test.ts` - Approvals and exports tests
  - `super-admin.test.ts` - Super admin tests
  - `settings.test.ts` - Settings tests
  - `pwa-offline.test.ts` - PWA and offline functionality tests
  - `accessibility.test.ts` - Accessibility tests
  - `performance.test.ts` - Performance tests
- `puppeteer.config.ts` - Puppeteer configuration
- `jest.config.ts` - Jest configuration
- `setup.ts` - Jest setup file

## Test Coverage

The tests cover:
- ✅ Authentication (sign-in, sign-up, logout)
- ✅ Dashboard and navigation
- ✅ Project management
- ✅ Time tracking
- ✅ Materials, expenses, mileage
- ✅ ATA, diary, checklists
- ✅ Planning system
- ✅ Approvals and exports
- ✅ Super admin features
- ✅ Settings
- ✅ PWA and offline functionality
- ✅ Accessibility
- ✅ Performance

## Writing New Tests

1. Create a new test file in `tests/e2e/` following the naming pattern `*.test.ts`
2. Import test helpers:
```typescript
import { testHelpers } from './helpers/test-helpers';
import { loginAsUser } from './helpers/auth-helpers';
```
3. Use Jest's `describe` and `it` functions
4. Use `beforeAll` and `afterAll` for setup/teardown
5. Use test helpers for common operations

Example:
```typescript
describe('My Feature Tests', () => {
  beforeAll(async () => {
    await testHelpers.init();
    await loginAsUser('worker');
  });

  afterAll(async () => {
    await testHelpers.cleanup();
  });

  it('should do something', async () => {
    await testHelpers.navigateTo('/dashboard/my-feature');
    await testHelpers.waitForSelector('main');
    // ... test assertions
  });
});
```

## Troubleshooting

- **Tests fail with connection errors**: Make sure the dev server is running on `http://localhost:3000`
- **Tests timeout**: Increase timeout in `jest.config.ts` or individual test
- **Browser doesn't launch**: Check Puppeteer installation and system dependencies
- **Screenshots**: Screenshots are saved to `tests/e2e/screenshots/` on failures

## Notes

- Tests run in headless mode by default (set `HEADLESS=false` to see browser)
- Tests use a 60-second timeout by default
- Tests wait for `networkidle0` to ensure pages are fully loaded
- Test users should be created in your test database before running tests

