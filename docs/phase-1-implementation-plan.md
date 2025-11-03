# EP Time Tracker - Phase 1 MVP Implementation Plan

## Overview

Build an independent time tracking and site reporting application for Swedish contractors. Phase 1 delivers parity core features: projects, time tracking, materials/expenses, ÄTA, diary/checklists, approvals, and CSV exports with offline-first PWA experience.

## EPIC 1: Project Setup & Infrastructure

**Goal:** Establish independent codebase with Next.js 15, Supabase, and development environment

### Tasks

- Create new Next.js 15 project with TypeScript (strict mode) and App Router
- Configure Tailwind CSS + shadcn/ui component library
- Set up Supabase project: create account, provision Postgres database
- Initialize Supabase Auth with email/OTP
- Configure Supabase Storage buckets (receipts, diary photos)
- Set up environment variables (.env.local with Supabase keys)
- Configure PWA manifest and service worker (workbox)
- Set up Zustand for client state + React Query for server state
- Add ESLint, Prettier, and base folder structure (/app, /components, /lib, /server)
- Initialize Git repository with .gitignore

**Key Files:**

- `next.config.mjs` - PWA config, image domains
- `package.json` - dependencies (Next 15, React 19, Supabase client, Zustand, React Query, Zod, Tailwind, shadcn/ui)
- `.env.local` - Supabase URL, anon key, service role key
- `public/manifest.json` - PWA manifest
- `lib/supabase/client.ts` - Supabase client initialization

---

## EPIC 2: Database Schema & Authentication

**Goal:** Implement complete Supabase database schema with RLS policies and multi-tenant org structure

### Tasks

- Create SQL migration for schema v1 (organizations, profiles, memberships, projects, phases, work_orders)
- Create time_entries table with generated duration_min column
- Create materials, expenses, mileage, travel_time tables
- Create ata, diary_entries, approvals tables
- Create overtime_rulesets, overtime_rules, ob_rules tables
- Create integration_batches, audit_log tables
- Add helper functions: `is_org_member()`, `user_role()`
- Implement RLS policies for all tables (multi-tenant org isolation)
- Configure Supabase Auth with email magic link/OTP
- Create server-side auth utilities: `getSession()`, `requireAuth()`, `requireRole()`
- Build auth API routes: `/api/auth/signup`, `/api/auth/signin`, `/api/auth/signout`
- Seed pilot organization and admin user

**Key Files:**

- `supabase/migrations/001_initial_schema.sql` - Complete schema from PRD §21
- `lib/supabase/auth.ts` - Auth helpers
- `app/api/auth/*` - Auth routes
- `middleware.ts` - Auth middleware for protected routes

---

## EPIC 3: Core UI & Projects Management

**Goal:** Build responsive layouts, navigation, and project/phase CRUD

### Tasks

- Create main app layout with mobile-first navigation (bottom nav for mobile)
- Build authentication pages (sign-in, sign-up, verify-email)
- Create protected route wrapper with role checks
- Build projects list page with search/filter
- Build project detail page (overview, phases, work orders)
- Create project create/edit forms with Zod validation
- Add phases CRUD (inline on project page)
- Add work orders CRUD
- Build project settings: geo-fence (map picker for lat/lon/radius)
- Implement organization settings page (name, defaults)
- Add user management page (invite, roles, hourly rates)

**Key Files:**

- `app/(dashboard)/layout.tsx` - Main dashboard layout
- `app/(dashboard)/projects/page.tsx` - Projects list
- `app/(dashboard)/projects/[id]/page.tsx` - Project detail
- `components/projects/project-form.tsx` - Project CRUD form
- `lib/schemas/project.ts` - Zod schemas

---

## EPIC 4: Time Tracking & Crew Management

**Goal:** Implement timer UI, manual time entry, crew clock-ins, and reminders

### Tasks

- Build sticky timer component (start/stop/switch) visible on all pages
- Create timer state management (Zustand store with persistence)
- Implement quick switch: recent tasks/projects dropdown
- Build manual time entry form (date, start, stop, task, project, phase)
- Add time entries list view (by day, by project) with edit/delete
- Implement crew clock-in flow: select multiple users, start timer for all
- Add "split crew time" functionality (equal or by percentage)
- Build "duplicate yesterday" flow for quick entry
- Create batch edit: select multiple entries, change project/phase/task
- Add daily reminders system (server-side cron or client push notifications)
- Implement "forgot to stop" detection (scheduled job checks running timers)
- Build offline queue for time entries (IndexedDB via Dexie)
- Add optimistic UI updates with rollback on sync failure
- Create time entry approval status badges (draft/submitted/approved)

**Key Files:**

- `components/time/timer-widget.tsx` - Sticky timer
- `components/time/time-entry-form.tsx` - Manual entry form
- `components/time/crew-clock-in.tsx` - Crew clock UI
- `lib/stores/timer-store.ts` - Zustand timer state
- `lib/db/offline-queue.ts` - Dexie IndexedDB setup
- `app/api/time/*` - Time entry CRUD APIs

---

## EPIC 5: Materials, Expenses & Mileage

**Goal:** Build camera-first material/expense logging with offline support

### Tasks

- Create materials entry form (description, qty, unit picker, unit price, photo)
- Build camera capture component (mobile-optimized)
- Implement photo upload to Supabase Storage with signed URLs
- Add offline photo queue (store locally, sync on reconnect)
- Create expenses entry form (category picker, amount, VAT toggle, photo)
- Build mileage entry form (date, km, rate, from/to notes)
- Add travel time entry form (date, minutes, notes)
- Create materials/expenses list views (by project, by user)
- Add quick entry shortcuts (scan receipt → auto-fill)
- Implement batch delete/edit for materials/expenses

**Key Files:**

- `components/materials/material-form.tsx` - Material entry
- `components/materials/camera-capture.tsx` - Camera UI
- `components/expenses/expense-form.tsx` - Expense entry
- `components/mileage/mileage-form.tsx` - Mileage entry
- `lib/supabase/storage.ts` - Storage upload helpers
- `app/api/materials/*`, `app/api/expenses/*` - CRUD APIs

---

## EPIC 6: ÄTA, Diary & Checklists

**Goal:** Implement change orders, daily diary, and checklist templates

### Tasks

- Build ÄTA entry form (title, description, qty, unit, unit price, photos, status)
- Add ÄTA approval flow (in-app sign-off with name + timestamp)
- Create ÄTA list view (by project, status filters)
- Build daily diary form (AFC-style fields: väder, temp, bemanning, obstacles, safety, deliveries, photos)
- Implement diary signature capture (name + timestamp)
- Create checklist template library (Riskanalys, Egenkontroll målning/golv, Skydd/AFS)
- Build checklist instance renderer (checkbox/text/photo items)
- Add checklist completion tracking and signatures
- Implement diary/checklist photo galleries (max 10 per entry)
- Create diary calendar view (by project)

**Key Files:**

- `components/ata/ata-form.tsx` - ÄTA entry form
- `components/ata/ata-approval.tsx` - Approval UI
- `components/diary/diary-form.tsx` - Diary entry form
- `components/checklists/checklist-renderer.tsx` - Dynamic checklist UI
- `lib/templates/checklist-templates.ts` - Seeded templates
- `app/api/ata/*`, `app/api/diary/*` - CRUD APIs

---

## EPIC 7: Approvals & CSV Exports

**Goal:** Build weekly approval workflows and generate salary/invoice CSVs

### Tasks

- Create approvals dashboard (by week, by project views)
- Build time entries review table (filterable, sortable)
- Implement approval actions: approve all, approve per user, request changes
- Add comment/feedback system for requested changes
- Create period lock functionality (prevents edits after approval)
- Build salary CSV export (format from PRD §6.7: date, user, project, phase, duration, rates, codes)
- Build invoice CSV export (format from PRD §6.7: time, materials, ÄTA with attachments refs)
- Generate attachments bundle (.zip with photos/receipts)
- Add export preview before download
- Implement export batch tracking (batch_id, status, created_at)
- Create exports history page (download past exports)
- Add audit log viewer (filter by entity, user, date range)

**Key Files:**

- `app/(dashboard)/approvals/page.tsx` - Approvals dashboard
- `components/approvals/review-table.tsx` - Review UI
- `lib/exports/salary-csv.ts` - Salary CSV generator
- `lib/exports/invoice-csv.ts` - Invoice CSV generator
- `lib/exports/zip-attachments.ts` - Attachment bundler
- `app/api/approvals/*`, `app/api/exports/*` - APIs

---

## EPIC 8: Offline-First & PWA Features

**Goal:** Ensure reliable offline operation and PWA installation

### Tasks

- Configure Workbox service worker for offline caching
- Implement background sync queue for failed requests (exponential backoff)
- Add IndexedDB persistence for all core data (Dexie)
- Build sync status indicator (online/offline, pending changes count)
- Implement conflict resolution: latest-write wins + audit trail
- Add "Sync now" manual trigger button
- Create offline banner with helpful messaging
- Configure PWA install prompts (iOS/Android)
- Add PWA screenshots and icons (generate via script)
- Test offline scenarios: create time entry → go offline → sync on reconnect
- Implement data preloading on login (projects, recent time entries)
- Add service worker update notifications

**Key Files:**

- `next.config.mjs` - PWA plugin config
- `public/sw.js` - Service worker (generated by Workbox)
- `lib/sync/background-sync.ts` - Background sync logic
- `lib/db/offline-store.ts` - Dexie stores
- `components/core/sync-status.tsx` - Sync indicator
- `components/core/offline-banner.tsx` - Offline UI

---

## EPIC 9: Polish & Pilot Prep

**Goal:** Swedish localization, testing, and pilot deployment

### Tasks

- Add i18next configuration with Swedish (primary) and English (fallback)
- Translate all UI strings to Swedish
- Implement 24-hour clock and metric units throughout
- Add form validation error messages (Swedish)
- Create onboarding flow for new organizations
- Build help/documentation pages (in-app)
- Add loading states and skeleton screens for all async operations
- Implement error boundaries with friendly error messages
- Add Sentry for error tracking
- Configure PostHog for product analytics
- Set up Vercel deployment with preview/staging/production environments
- Create pilot user guide (PDF)
- Perform E2E testing with Playwright (happy paths: create project → clock time → approve → export)
- Load test: 50 users, 1000 time entries, 100 projects

**Key Files:**

- `lib/i18n/config.ts` - i18next setup
- `locales/sv/*.json` - Swedish translations
- `locales/en/*.json` - English translations
- `app/(onboarding)/*` - Onboarding flows
- `tests/e2e/*.spec.ts` - Playwright tests
- `docs/pilot-guide.pdf` - User documentation

---

## Success Criteria (Phase 1 Exit)

- [ ] Pilot foreman can create project, clock time for full week, and submit for approval
- [ ] Admin can review, approve, and export salary CSV + invoice CSV without re-typing
- [ ] Offline mode works: create time entry offline → reconnect → syncs successfully
- [ ] All forms validate properly with Swedish error messages
- [ ] PWA installs on iOS/Android and shows on home screen
- [ ] Time-to-value < 15 minutes (signup → first approved timesheet)
- [ ] Zero data loss in crash scenarios (offline queue persists)

---

## Out of Scope (Phase 1)

- Geo-fences and location-based reminders (Phase 2)
- Fortnox/Visma integrations (Phase 2)
- Overtime/OB rules engine (Phase 2)
- Manual budgets and burn tracking (Phase 3)
- EstimatePro integration (Phase 4)
- BankID, voice capture, MEPS/AMA

---

## Tech Stack Summary

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API routes + Supabase (Postgres, Auth, Storage)
- **State:** Zustand (client) + React Query (server state)
- **Offline:** IndexedDB (Dexie) + Workbox service worker
- **Forms:** React Hook Form + Zod validation
- **Mobile:** PWA-first (installable, offline-capable)
- **Deployment:** Vercel (preview/staging/prod)
- **Observability:** Sentry (errors) + PostHog (analytics)

---

## Estimated Timeline

- EPIC 1-2: 1 week (setup + database)
- EPIC 3: 1 week (UI + projects)
- EPIC 4: 1.5 weeks (time tracking)
- EPIC 5: 1 week (materials/expenses)
- EPIC 6: 1 week (ÄTA/diary/checklists)
- EPIC 7: 1 week (approvals/exports)
- EPIC 8: 1 week (offline/PWA)
- EPIC 9: 0.5 weeks (polish)

**Total: ~8 weeks** for Phase 1 MVP ready for pilot

---

## Current Status

### Completed (EPIC 1 - In Progress)

✅ **Infrastructure Setup:**
- Created Next.js 15 project with TypeScript and App Router
- Installed all core dependencies (Supabase, Zustand, React Query, Dexie, PWA, i18n)
- Set up directory structure (/lib, /components, /locales, /supabase, etc.)
- Configured PWA manifest and Next.js config
- Created Supabase client utilities (browser and server)
- Implemented auth helpers and middleware
- Set up Zustand timer store
- Created IndexedDB schema with Dexie
- Added QueryProvider for React Query
- Configured i18next with Swedish/English translations
- Created base README

### Next Steps

🔄 **EPIC 1 - Remaining Tasks:**
- Set up actual Supabase project and get credentials
- Create .env.local with real values
- Initialize git repository
- Add ESLint and Prettier configuration

📋 **EPIC 2 - Database Schema:**
- Create complete SQL migration (001_initial_schema.sql)
- Set up RLS policies
- Create auth API routes
- Seed pilot data

---

## Notes

- Project location: `C:\Users\johan\Cursor Portfolio\ep-tracker`
- Independent application (not part of estimate-pro)
- Focus on Phase 1 MVP only
- Phases 2-4 to be planned after Phase 1 completion


