# EP Tracker - Test User Setup Guide

## Problem

The tests are failing with 401 (Unauthorized) errors because the test users don't exist in your database.

## Solution: Create Test Users

You need to create test users in your Supabase database before running the tests. Here are your options:

### Option 1: Create Users via Supabase Dashboard

1. Go to your Supabase Dashboard → Authentication → Users
2. Create the following test users:

**Worker User:**
- Email: `worker@test.com` (or set `TEST_WORKER_EMAIL` env var)
- Password: `test123456` (or set `TEST_WORKER_PASSWORD` env var)
- Role: `worker`

**Admin User:**
- Email: `admin@test.com` (or set `TEST_ADMIN_EMAIL` env var)
- Password: `test123456` (or set `TEST_ADMIN_PASSWORD` env var)
- Role: `admin`

**Foreman User:**
- Email: `foreman@test.com` (or set `TEST_FOREMAN_EMAIL` env var)
- Password: `test123456` (or set `TEST_FOREMAN_PASSWORD` env var)
- Role: `foreman`

**Finance User:**
- Email: `finance@test.com` (or set `TEST_FINANCE_EMAIL` env var)
- Password: `test123456` (or set `TEST_FINANCE_PASSWORD` env var)
- Role: `finance`

**Super Admin User:**
- Email: `superadmin@test.com` (or set `TEST_SUPER_ADMIN_EMAIL` env var)
- Password: `test123456` (or set `TEST_SUPER_ADMIN_PASSWORD` env var)
- Role: `super_admin`

### Option 2: Use Environment Variables

Set these environment variables before running tests:

```bash
# PowerShell
$env:TEST_WORKER_EMAIL="your-worker@email.com"
$env:TEST_WORKER_PASSWORD="your-password"
$env:TEST_ADMIN_EMAIL="your-admin@email.com"
$env:TEST_ADMIN_PASSWORD="your-password"
# ... etc
```

### Option 3: Create SQL Script

Create a SQL migration script to seed test users (recommended for CI/CD).

## After Creating Users

1. Make sure users have completed setup (have organizations/memberships)
2. Run tests again: `npm run test:e2e`

## Current Test User Configuration

The tests use these default values (from `tests/e2e/helpers/auth-helpers.ts`):

- Worker: `worker@test.com` / `test123456`
- Admin: `admin@test.com` / `test123456`
- Foreman: `foreman@test.com` / `test123456`
- Finance: `finance@test.com` / `test123456`
- Super Admin: `superadmin@test.com` / `test123456`

You can override these with environment variables.

