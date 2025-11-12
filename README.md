# EP Time Tracker - Phase 1 MVP

Time tracking and site reporting application for Swedish contractors.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage)
- **State:** Zustand (client) + React Query (server state)
- **Offline:** IndexedDB (Dexie) + Workbox service worker
- **Forms:** React Hook Form + Zod validation
- **Mobile:** PWA-first (installable, offline-capable)
- **Styling:** Tailwind CSS + shadcn/ui
- **i18n:** i18next (Swedish primary, English fallback)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Supabase account

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run Supabase migrations (see supabase/migrations/)

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ep-tracker/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── time/              # Time tracking components
│   ├── projects/          # Project management
│   ├── materials/         # Materials entry
│   ├── expenses/          # Expense tracking
│   ├── ata/               # ÄTA (change orders)
│   ├── diary/             # Daily diary
│   ├── checklists/        # Checklists
│   ├── approvals/         # Approval workflows
│   ├── planning/          # Planning system (week grid, mobile today)
│   └── core/              # Shared UI components
├── lib/                   # Library code
│   ├── supabase/          # Supabase client & auth
│   ├── stores/            # Zustand stores
│   ├── db/                # IndexedDB (Dexie)
│   ├── schemas/           # Zod schemas
│   ├── i18n/              # Internationalization
│   ├── sync/              # Background sync
│   ├── exports/           # CSV export generators
│   └── templates/         # Checklist templates
├── locales/               # Translation files
│   ├── sv/                # Swedish
│   └── en/                # English
├── supabase/              
│   └── migrations/        # Database migrations
├── tests/                 
│   └── e2e/               # Playwright E2E tests
└── public/                # Static assets

```

## Features (Phase 1 + Planning System)

### Core Time Tracking & Project Management
- ✅ Projects & Work Orders management
- ✅ Time tracking (start/stop/switch/crew clock-ins) med debitering per projekt, fas, arbetsorder eller ÄTA-delprojekt
- ✅ Materials, expenses, mileage tracking
- ✅ ÄTA (change orders) with approval
- ✅ Daily diary & checklists
- ✅ Weekly approvals workflow
- ✅ CSV exports (salary & invoice)
- ✅ Offline-first operation
- ✅ PWA installation

### Planning System (Phase 2.1 - EPIC 22-24)
- ✅ **Week Planning Grid** (desktop, `/dashboard/planning`)
  - Drag-and-drop assignment scheduling
  - Multi-user assignment support
  - Project filtering by color chips
  - Capacity indicators (needed vs. assigned)
  - Conflict detection (overlaps, absences)
  - Edit/delete assignments in-place
- ✅ **Mobile Today List** (field workers, `/dashboard/planning/today`)
  - Daily job list with details
  - Check-in/check-out functionality
  - Navigation to job sites
  - Status tracking (planned → in progress → done)
  - Optimistic updates for instant UX

### Super Admin Panel
- ✅ User management (invite, roles, permissions)
- ✅ Organization settings
- ✅ Billing & subscription management (Stripe)
- ✅ System monitoring & audit logs

## Roadmap / Future Enhancements

### Phase 2.2
- Geo-fences and location reminders
- Enhanced offline queue for mobile check-ins
- Push notifications for assignments
- Photo capture from mobile today

### Phase 3
- Fortnox/Visma integrations
- Overtime/OB rules engine
- Manual budgets and burn tracking

### Phase 4
- EstimatePro integration
- Advanced analytics & reporting

## License

Private - All rights reserved
