# EP Time Tracker - System Overview

**Last Updated:** 2025-10-23  
**Version:** Phase 2.1 Complete  
**Status:** ✅ Production Ready

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Modules & Features](#modules--features)
4. [User Roles](#user-roles)
5. [Routes & Navigation](#routes--navigation)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Technical Stack](#technical-stack)
9. [Documentation Index](#documentation-index)

---

## Introduction

**EP Time Tracker** is a comprehensive, offline-first PWA for time tracking, project management, and field operations in the Swedish construction industry. The system supports multi-tenancy, role-based access control, and advanced features like week planning, approvals, and billing integration.

### Key Capabilities
- ✅ **Offline-first:** Works without internet, syncs automatically
- ✅ **Multi-tenant:** Organizations with isolated data
- ✅ **Role-based:** Admin, Foreman, Worker, Finance, Super Admin
- ✅ **Mobile-optimized:** PWA installable on phones/tablets
- ✅ **Swedish-first:** Primary language Swedish, English fallback
- ✅ **Planning System:** Week grid + mobile today list for field workers

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (PWA)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Next.js 15  │  │   React 19   │  │  TypeScript  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Zustand   │  │ React Query  │  │  IndexedDB   │ │
│  │ (Client State│  │(Server State)│  │   (Dexie)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │     Auth     │  │   Storage    │ │
│  │     (RLS)    │  │  (Magic Link)│  │   (Photos)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                INTEGRATIONS & SERVICES                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    Stripe    │  │  Resend.com  │  │    Vercel    │ │
│  │   (Billing)  │  │   (Email)    │  │   (Deploy)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → Client component
2. **Client State** → Zustand store (UI state, filters, etc.)
3. **Server Call** → React Query mutation/query
4. **API Route** → Next.js API handler (`/app/api/...`)
5. **Database** → Supabase Postgres with RLS
6. **Response** → React Query cache → UI update
7. **Offline** → IndexedDB queue → Sync when online

---

## Modules & Features

### Core Application (Phase 1)

#### 1. **Authentication & User Management**
- Email + password authentication
- Magic link (passwordless) support
- Multi-tenancy (organization-based)
- Role-based access control (4 roles)
- User profiles with photos

**Routes:**
- `/sign-in`, `/sign-up`, `/reset-password`
- `/onboarding` (new user setup)

---

#### 2. **Project Management**
- Projects with clients, colors, numbers
- Phases (project subdivisions)
- Work Orders (specific jobs)
- Site addresses and notes

**Routes:**
- `/dashboard/projects`
- `/dashboard/projects/[id]` (detail view)

**Components:**
- `ProjectCard`, `ProjectForm`, `PhaseList`, `WorkOrderList`

---

#### 3. **Time Tracking**
- Floating timer widget (start/stop/switch)
- Manual time entry form
- Crew clock-in/clock-out (foreman feature)
- Travel time tracking
- Time entry list with filters (date, project, user)
- Edit time entries

**Routes:**
- `/dashboard/time`
- `/dashboard/time/crew` (foreman only)

**Components:**
- `TimerWidget`, `TimeEntryForm`, `TimeEntryList`, `CrewClockIn`

**API:**
- `GET /api/time/entries` (list, filter)
- `POST /api/time/entries` (create)
- `PATCH /api/time/entries/[id]` (update)
- `DELETE /api/time/entries/[id]` (delete)

---

#### 4. **Materials Management**
- Material registration (quantity, unit, note)
- Photo gallery (unlimited photos per entry)
- Full-screen photo viewer
- Edit/delete materials
- Status tracking (draft → submitted → approved)

**Routes:**
- `/dashboard/materials`

**Components:**
- `MaterialForm`, `MaterialList`, `PhotoGallery`, `PhotoViewer`

**API:**
- `GET /api/materials` (list)
- `POST /api/materials` (create)
- `PATCH /api/materials/[id]` (update)
- `DELETE /api/materials/[id]` (delete)

**Storage:**
- Supabase Storage bucket: `material-photos`
- Path: `{org_id}/{material_id}/{photo_id}.jpg`

---

#### 5. **Expenses & Mileage**
- Expense tracking (amount, category, receipt photo)
- Mileage logging (km, route, car)
- Status tracking
- Approval workflow

**Routes:**
- `/dashboard/expenses`
- `/dashboard/mileage`

**Components:**
- `ExpenseForm`, `ExpenseList`, `MileageForm`, `MileageList`

**API:**
- `GET /api/expenses` (list)
- `POST /api/expenses` (create)
- `GET /api/mileage` (list)
- `POST /api/mileage` (create)

---

#### 6. **ÄTA (Change Orders)**
- ÄTA registration (title, description, estimate)
- Photo gallery
- Digital signature (client sign-off)
- Approval workflow
- Status tracking

**Routes:**
- `/dashboard/ata`

**Components:**
- `ATAForm`, `ATAList`, `SignaturePad`

**API:**
- `GET /api/ata` (list)
- `POST /api/ata` (create)
- `PATCH /api/ata/[id]` (update)

---

#### 7. **Daily Diary**
- Daily notes/log entries
- Weather tracking
- Crew count
- Photos
- Auto-save

**Routes:**
- `/dashboard/diary`

**Components:**
- `DiaryForm`, `DiaryList`

**API:**
- `GET /api/diary` (list)
- `POST /api/diary` (create)

---

#### 8. **Checklists**
- Checklist templates (safety, quality, etc.)
- Checklist instances (per work order)
- Item completion tracking
- Notes per item
- Status overview

**Routes:**
- `/dashboard/checklists`

**Components:**
- `ChecklistTemplateList`, `ChecklistForm`, `ChecklistProgress`

**API:**
- `GET /api/checklists` (list)
- `POST /api/checklists` (create from template)
- `PATCH /api/checklists/[id]` (update items)

---

#### 9. **Approvals & Exports**
- Weekly approval workflow
- Period lock (prevent edits after approval)
- CSV exports (salary, invoice, attachments)
- Approval history

**Routes:**
- `/dashboard/approvals`

**Components:**
- `ApprovalWeekList`, `ApprovalDetailView`, `CSVExportButton`

**API:**
- `GET /api/approvals` (list)
- `POST /api/approvals` (create/approve)
- `GET /api/exports/salary` (CSV)
- `GET /api/exports/invoice` (CSV)

---

### Super Admin Panel (Phase 2)

#### 10. **Organization Management**
- Organization list
- Organization detail view
- Settings (name, subscription plan)
- User count & billing info

**Routes:**
- `/super-admin/organizations`
- `/super-admin/organizations/[id]`

**Components:**
- `OrganizationList`, `OrganizationDetailView`, `OrganizationSettings`

**API:**
- `GET /api/super-admin/organizations` (list)
- `GET /api/super-admin/organizations/[id]` (detail)
- `PATCH /api/super-admin/organizations/[id]` (update)

---

#### 11. **User Management (Super Admin)**
- Global user list (all organizations)
- User invitation (email)
- Role assignment
- User deactivation
- Impersonation (support tool)

**Routes:**
- `/super-admin/users`
- `/super-admin/users/[id]`

**Components:**
- `UserList`, `UserDetailView`, `InviteUserDialog`, `ImpersonateButton`

**API:**
- `GET /api/super-admin/users` (list, search)
- `POST /api/super-admin/users/invite` (invite)
- `PATCH /api/super-admin/users/[id]` (update role)
- `POST /api/super-admin/impersonate` (start impersonation)

---

#### 12. **Billing & Stripe Integration**
- Stripe Customer Portal integration
- Subscription management (plans: free, pro, enterprise)
- Payment method management
- Invoice history
- Usage-based billing (seats)

**Routes:**
- `/super-admin/billing`
- `/super-admin/billing/[org_id]`

**Components:**
- `BillingOverview`, `SubscriptionCard`, `CustomerPortalButton`

**API:**
- `GET /api/super-admin/billing` (list)
- `POST /api/stripe/create-portal-session` (customer portal)
- Webhooks: `/api/stripe/webhook` (subscription events)

---

#### 13. **System Configuration**
- Feature flags (enable/disable features per org)
- Maintenance mode toggle
- Audit log viewer
- System status monitoring

**Routes:**
- `/super-admin/settings`
- `/super-admin/audit-logs`

**Components:**
- `FeatureFlagManager`, `MaintenanceModeToggle`, `AuditLogViewer`

**API:**
- `GET /api/super-admin/settings` (get config)
- `PATCH /api/super-admin/settings` (update config)
- `GET /api/super-admin/audit-logs` (list)

---

#### 14. **Analytics & Monitoring**
- Usage analytics (DAU/WAU/MAU)
- Feature adoption tracking
- Content growth analytics
- Churn risk identification
- Performance metrics

**Routes:**
- `/super-admin/analytics`

**Components:**
- `AnalyticsDashboard`, `UserGrowthChart`, `FeatureUsageChart`

**API:**
- `GET /api/super-admin/analytics/usage` (DAU/WAU/MAU)
- `GET /api/super-admin/analytics/features` (feature adoption)

---

#### 15. **Email System**
- Transactional emails (Resend.com)
- Email templates (invite, reset password, etc.)
- Email log viewer
- Email sending rate limits

**Routes:**
- `/super-admin/emails` (log viewer)

**API:**
- `POST /api/super-admin/emails/send` (manual send)
- `GET /api/super-admin/emails/logs` (list)

---

### Planning System (Phase 2.1 - EPIC 22-24)

#### 16. **Week Planning Grid (Desktop)**
- Week view (Monday-Sunday)
- Resource list (users)
- Project filter chips (by color)
- Drag-and-drop assignment scheduling
- Multi-user assignment support
- Capacity indicators (needed vs. assigned)
- Conflict detection (overlaps, absences)
- Edit/delete assignments in-place
- Optimistic updates (instant UI feedback)

**Routes:**
- `/dashboard/planning` (main grid)

**Components:**
- `WeekScheduleView` (main grid)
- `AssignmentCard` (draggable assignment)
- `ProjectChips` (filter)
- `CapacityIndicator` (daily capacity bar)
- `PersonRow` (user row header)
- `DroppableCell` (drop target for DnD)
- `AddAssignmentDialog` (create/edit dialog)

**API:**
- `GET /api/planning?week=YYYY-MM-DD` (week data)
- `POST /api/assignments` (create)
- `PATCH /api/assignments/[id]` (update)
- `DELETE /api/assignments/[id]` (delete)

**Database:**
- `assignments` table (project, user, date, times, status)
- `absences` table (user, date range, reason)

**Features:**
- ✅ Drag assignment from one date to another
- ✅ Entire card is draggable (not just handle)
- ✅ Instant UI updates (optimistic mutations)
- ✅ Rollback on API errors
- ✅ Visual conflict warnings
- ✅ Multi-assign to same project/day

---

#### 17. **Mobile Today List (Field Workers)**
- Daily job list (today's assignments)
- Check-in/check-out functionality
- Navigation to job sites (Google Maps)
- Status tracking (planned → in progress → done)
- Job details (project, client, address, time, notes)
- Optimistic updates
- Refresh functionality

**Routes:**
- `/dashboard/planning/today` (mobile-optimized)

**Components:**
- `MobileTodayScreen` (main screen)
- `MobileJobCard` (job card with check-in/out buttons)

**API:**
- `GET /api/mobile/today` (today's assignments for user)
- `POST /api/mobile/checkins` (check-in/out event)

**Features:**
- ✅ Simple, focused mobile UI
- ✅ Touch-friendly buttons
- ✅ Instant check-in/out feedback
- ✅ Navigation integration (opens Google Maps)
- ✅ Status badges with colors
- ✅ Notes display

---

## User Roles

| Role | Key Access | Features |
|------|-----------|----------|
| **Worker** | Own time, materials, expenses | View/create own entries, check-in/out |
| **UE (Underentreprenör)** | Own time, materials, expenses (external) | Report subcontractor effort with worker-level permissions |
| **Foreman** | Team time, approvals, planning | Crew clock-in, approve entries, schedule assignments |
| **Admin** | All organization data | Manage projects, users, settings |
| **Finance** | Reports, exports, approvals | View all entries, export CSV, approve invoices |
| **Super Admin** | Global system access | Manage all orgs, users, billing, system settings |

### Role Matrix

| Feature | Worker | UE | Foreman | Admin | Finance | Super Admin |
|---------|--------|----|---------|-------|---------|-------------|
| Time Tracking | Own | Own | Team | All | View All | View All |
| Materials | Own | Own | Team | All | View All | View All |
| ÄTA | Own | Own | Team | All | View All | View All |
| Approvals | - | - | Approve | Approve | Approve | View All |
| Planning Grid | - | - | Read/Write | Read/Write | View | View All |
| Mobile Today | Own | Own | Own | Own | - | - |
| Projects | View | View | Manage | Manage | View All | View All |
| Users | - | - | - | Manage | - | Manage All |
| Billing | - | - | - | View | View | Manage All |
| System Config | - | - | - | - | - | Manage |

---

## Routes & Navigation

### Public Routes
- `/` (landing page)
- `/sign-in`
- `/sign-up`
- `/reset-password`

### Protected Routes (Dashboard)
- `/dashboard` (overview)
- `/dashboard/projects`
- `/dashboard/time`
- `/dashboard/time/crew` (foreman+)
- `/dashboard/materials`
- `/dashboard/expenses`
- `/dashboard/mileage`
- `/dashboard/ata`
- `/dashboard/diary`
- `/dashboard/checklists`
- `/dashboard/approvals` (foreman+)
- `/dashboard/planning` (foreman+, desktop)
- `/dashboard/planning/today` (field workers, mobile)
- `/dashboard/settings` (profile, preferences)
- `/dashboard/help` (documentation)

### Super Admin Routes
- `/super-admin` (dashboard)
- `/super-admin/organizations`
- `/super-admin/organizations/[id]`
- `/super-admin/users`
- `/super-admin/users/[id]`
- `/super-admin/billing`
- `/super-admin/settings`
- `/super-admin/audit-logs`
- `/super-admin/analytics`
- `/super-admin/emails`

---

## Database Schema

### Core Tables (Phase 1)

#### `organizations`
- Multi-tenancy root
- Subscription info
- Settings

#### `profiles`
- User profiles
- Role assignment
- Photo URL

#### `memberships`
- User ↔ Organization link
- Role per organization

#### `projects`
- Project details
- Client info
- Color (for planning)
- Daily capacity need (for planning)

#### `phases`
- Project subdivisions

#### `work_orders`
- Specific jobs

#### `time_entries`
- Time tracking records
- User, project, dates
- Billing metadata (`billing_type`, `fixed_block_id`, `ata_id`) för att koppla timmar till fasta poster eller ÄTA-delprojekt

#### `materials`
- Material registrations
- Photo references

#### `expenses`
- Expense records
- Receipt photo

#### `mileage`
- Mileage logs

#### `travel_time`
- Travel time records

#### `ata`
- Change orders
- Signatures
- Kan fungera som delprojekt för arbetstid (via `time_entries.ata_id`)

#### `diary_entries`
- Daily notes

#### `checklist_templates`
- Reusable checklists

#### `checklists`
- Checklist instances

#### `approvals`
- Weekly approvals

#### `integration_batches`
- Sync batches

#### `audit_log`
- System audit trail

---

### Planning Tables (Phase 2.1)

#### `assignments`
- Project assignments
- User/team assignment
- Date range (start_ts, end_ts)
- Status (planned, in_progress, done)
- Notes

**Columns:**
- `id` (UUID, PK)
- `project_id` (FK → projects)
- `user_id` (FK → profiles, nullable)
- `team_id` (FK → teams, nullable, future)
- `start_ts` (TIMESTAMPTZ)
- `end_ts` (TIMESTAMPTZ)
- `all_day` (BOOLEAN)
- `status` (TEXT)
- `note` (TEXT)
- `created_by` (FK → profiles)
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_assignments_project` (project_id)
- `idx_assignments_user` (user_id)
- `idx_assignments_dates` (start_ts, end_ts)

#### `absences`
- User absences (vacation, sick leave)
- Date range
- Reason

**Columns:**
- `id` (UUID, PK)
- `user_id` (FK → profiles)
- `start_date` (DATE)
- `end_date` (DATE)
- `reason` (TEXT)
- `approved` (BOOLEAN)
- `approved_by` (FK → profiles, nullable)
- `created_at` (TIMESTAMPTZ)

#### `shift_templates`
- Recurring shift templates (future use)

#### `mobile_notes`
- Pinned notes for mobile jobs (future use)

---

## API Endpoints

### Authentication
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-out`
- `POST /api/auth/reset-password`

### Time Tracking
- `GET /api/time/entries` (list, filter)
- `POST /api/time/entries` (create)
- `PATCH /api/time/entries/[id]` (update)
- `DELETE /api/time/entries/[id]` (delete)
- Payload kräver projekt och debitering (`billing_type`) och accepterar valfri `fixed_block_id` eller `ata_id` beroende på vald Fast/Löpande-logik

### Materials
- `GET /api/materials` (list)
- `POST /api/materials` (create)
- `PATCH /api/materials/[id]` (update)
- `DELETE /api/materials/[id]` (delete)

### Expenses & Mileage
- `GET /api/expenses` (list)
- `POST /api/expenses` (create)
- `GET /api/mileage` (list)
- `POST /api/mileage` (create)

### ÄTA
- `GET /api/ata` (list)
- `POST /api/ata` (create)
- `PATCH /api/ata/[id]` (update)

### Diary
- `GET /api/diary` (list)
- `POST /api/diary` (create)

### Checklists
- `GET /api/checklists` (list)
- `POST /api/checklists` (create from template)
- `PATCH /api/checklists/[id]` (update items)

### Approvals & Exports
- `GET /api/approvals` (list)
- `POST /api/approvals` (create/approve)
- `GET /api/exports/salary` (CSV)
- `GET /api/exports/invoice` (CSV)

### Planning (Desktop)
- `GET /api/planning?week=YYYY-MM-DD` (week data: resources, projects, assignments, absences)
- `POST /api/assignments` (create assignment)
- `PATCH /api/assignments/[id]` (update assignment)
- `DELETE /api/assignments/[id]` (delete assignment)
- `POST /api/absences` (create absence)

### Planning (Mobile)
- `GET /api/mobile/today` (today's assignments for user)
- `POST /api/mobile/checkins` (check-in/out event)

### Super Admin
- `GET /api/super-admin/organizations` (list)
- `GET /api/super-admin/organizations/[id]` (detail)
- `PATCH /api/super-admin/organizations/[id]` (update)
- `GET /api/super-admin/users` (list, search)
- `POST /api/super-admin/users/invite` (invite)
- `PATCH /api/super-admin/users/[id]` (update role)
- `POST /api/super-admin/impersonate` (start impersonation)
- `GET /api/super-admin/billing` (list)
- `GET /api/super-admin/settings` (get config)
- `PATCH /api/super-admin/settings` (update config)
- `GET /api/super-admin/audit-logs` (list)
- `GET /api/super-admin/analytics/usage` (DAU/WAU/MAU)
- `GET /api/super-admin/analytics/features` (feature adoption)

### Stripe Webhooks
- `POST /api/stripe/webhook` (subscription events)
- `POST /api/stripe/create-portal-session` (customer portal)

---

## Technical Stack

### Frontend
- **Next.js 15** (App Router, React Server Components)
- **React 19** (Concurrent features, Suspense)
- **TypeScript** (Strict mode)
- **Tailwind CSS** (Utility-first styling)
- **shadcn/ui** (Component library)
- **Zustand** (Client state management)
- **React Query** (Server state management, caching)
- **React Hook Form** (Form handling)
- **Zod** (Schema validation)
- **i18next** (Internationalization, Swedish primary)
- **date-fns** (Date utilities with locale support)
- **@dnd-kit** (Drag-and-drop for planning)

### Backend
- **Supabase** (BaaS)
  - PostgreSQL 15 (Database)
  - Row Level Security (RLS)
  - Auth (Email, Magic Link)
  - Storage (Photos)
- **Resend.com** (Transactional emails)
- **Stripe** (Billing, Subscriptions)

### Offline & PWA
- **Workbox** (Service worker, caching strategies)
- **Dexie.js** (IndexedDB wrapper)
- **next-pwa** (PWA configuration)
- **Background Sync** (Offline queue)

### Development & Deployment
- **Vercel** (Hosting, CDN, Edge Functions)
- **ESLint** (Linting)
- **Prettier** (Formatting)
- **Playwright** (E2E testing, future)

---

## Documentation Index

### Completion Reports
- `docs/epics/EPIC-001-VERIFICATION.md` (Infrastructure)
- `docs/epics/EPIC-002-COMPLETE.md` (Database & Auth)
- `docs/epics/EPIC-003-COMPLETE.md` (Core UI & Projects)
- `docs/epics/EPIC-004-COMPLETE.md` (Time Tracking)
- `docs/epics/EPIC-005-COMPLETE.md` (Materials, Expenses, Mileage)
- `docs/epics/EPIC-006-COMPLETE.md` (ÄTA, Diary, Checklists)
- `docs/epics/EPIC-007-COMPLETE.md` (Approvals & Exports)
- `docs/epics/EPIC-008-COMPLETE.md` (Offline & PWA)
- `docs/epics/EPIC-009-COMPLETE.md` (Polish & Pilot Prep)
- `docs/epics/EPIC-010-COMPLETE.md` (Organization Management)
- `docs/epics/EPIC-011-COMPLETE.md` (Advanced Org Features)
- `docs/epics/EPIC-012-COMPLETE.md` (Org Analytics)
- `docs/epics/EPIC-013-COMPLETE.md` (User Management)
- `docs/epics/EPIC-014-COMPLETE.md` (Advanced User Features)
- `docs/epics/EPIC-015-COMPLETE.md` (Billing & Stripe)
- `docs/epics/EPIC-016-COMPLETE.md` (System Configuration)
- `docs/epics/EPIC-017-COMPLETE.md` (Analytics & Monitoring)
- `docs/epics/EPIC-018-FOUNDATION-COMPLETE.md` (Support Tools)
- `docs/epics/EPIC-021-EMAIL-SYSTEM-COMPLETE.md` (Email System)
- `docs/epics/EPIC-022-COMPLETE.md` (Planning Foundation)
- `docs/epics/EPIC-023-COMPLETE.md` (Planning UI)
- `docs/epics/EPIC-024-COMPLETE.md` (Mobile Today)

### Status & Planning
- `docs/PROJECT-STATUS.md` (Overall status)
- `docs/PROJECT-COMPLETE.md` (Completion summary)
- `docs/PRODUCTION-READY-STATUS.md` (Production readiness)
- `docs/PLANNING-SYSTEM-STATUS.md` (Planning EPICs status)
- `docs/PLANNING-SYSTEM-OVERVIEW.md` (Planning system overview)

### Guides & Checklists
- `docs/DEPLOYMENT-CHECKLIST.md` (Deployment steps)
- `docs/OFFLINE-TESTING-GUIDE.md` (Offline feature testing)
- `docs/PERFORMANCE-OPTIMIZATION.md` (Performance tips)
- `docs/USER-ROLES-AND-PERMISSIONS.md` (RBAC guide)
- `docs/SIGNUP-FLOW.md` (User onboarding)
- `docs/STRIPE-SETUP.md` (Stripe integration)

### Technical Documentation
- `docs/architecture.md` (System architecture, future)
- `docs/technical.md` (Technical patterns, future)
- `docs/manual_testing.md` (Test plans)

### PRDs & Planning
- `docs/SUPER-ADMIN-PRD.md` (Phase 2 requirements)
- `docs/phase-1-implementation-plan.md` (Phase 1 plan)
- `docs/phase-2-super-admin-epics.md` (Phase 2 plan)
- `docs/epics/EPIC-022-PLANNING-FOUNDATION.md` (Planning foundation plan)
- `docs/epics/EPIC-023-PLANNING-UI.md` (Planning UI plan)
- `docs/epics/EPIC-024-MOBILE-TODAY.md` (Mobile today plan)

### Code Reviews & Fixes
- `docs/CODE-REVIEW-2025-10-21.md` (Code review findings)
- `docs/CRITICAL-FIXES-2025-10-21.md` (Critical security fixes)
- `docs/HIGH-PRIORITY-FIXES-2025-10-21.md` (High priority fixes)

---

## Quick Links

### For Developers
- Start here: `README.md`
- Architecture: `docs/PROJECT-STATUS.md`
- API endpoints: See [API Endpoints](#api-endpoints) above
- Database schema: `supabase/migrations/`
- Component patterns: `components/`

### For Product/PM
- Feature list: `README.md` (Features section)
- Status: `docs/PRODUCTION-READY-STATUS.md`
- Planning system: `docs/PLANNING-SYSTEM-STATUS.md`
- User roles: See [User Roles](#user-roles) above

### For QA/Testing
- Manual testing: `docs/manual_testing.md`
- Offline testing: `docs/OFFLINE-TESTING-GUIDE.md`
- E2E tests: `tests/e2e/` (future)

### For DevOps/Deployment
- Deployment: `docs/DEPLOYMENT-CHECKLIST.md`
- Environment: `.env.local` (see `README.md`)
- Monitoring: `docs/PRODUCTION-READY-STATUS.md` (Monitoring section)

---

**Last Updated:** 2025-10-23  
**Next Review:** After Phase 2.2 (Geo-fences, Push Notifications)


