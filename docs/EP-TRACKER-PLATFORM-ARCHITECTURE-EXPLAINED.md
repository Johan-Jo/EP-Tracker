# EP Tracker Platform Architecture - Explained for Everyone

**Document Purpose:** A non-technical explanation of how EP Tracker is built  
**Last Updated:** October 29, 2025  
**Audience:** Business stakeholders, project managers, investors, or anyone curious about the platform  
**Status:** Current production architecture

---

## 📚 Table of Contents

1. [Executive Summary](#executive-summary)
2. [What is EP Tracker?](#what-is-ep-tracker)
3. [How It's Built - The Big Picture](#how-its-built---the-big-picture)
4. [The Three Layers Explained](#the-three-layers-explained)
5. [Key Technologies & Why We Chose Them](#key-technologies--why-we-chose-them)
6. [How Data Flows Through the System](#how-data-flows-through-the-system)
7. [Offline Functionality - How It Works](#offline-functionality---how-it-works)
8. [Security & Privacy](#security--privacy)
9. [The Feature Modules](#the-feature-modules)
10. [Deployment & Hosting](#deployment--hosting)
11. [Scalability & Performance](#scalability--performance)
12. [What Makes It a PWA](#what-makes-it-a-pwa)
13. [Integration Points](#integration-points)
14. [Development Workflow](#development-workflow)
15. [Cost Structure](#cost-structure)
16. [Future-Proofing](#future-proofing)

---

## Executive Summary

**EP Tracker is a Progressive Web App (PWA)** that works like a mobile app but runs in a web browser. Think of it as having the best of both worlds:
- **Like a Website:** Accessible from any device with a browser, no app store required
- **Like a Mobile App:** Can be installed on phones, works offline, feels native

**Built with modern cloud technology**, it's fast, secure, and can scale from 10 to 10,000 users without major architectural changes.

**Key Stats:**
- **~300+ files** of production code
- **15+ major feature modules**
- **6 user roles** with different permissions
- **100% cloud-based** (no on-premise servers needed)
- **Offline-first** (works without internet connection)
- **Multi-tenant** (multiple companies can use it, data completely isolated)

---

## What is EP Tracker?

EP Tracker is a **comprehensive time tracking and project management system** designed specifically for Swedish construction contractors. It helps:

- **Field workers** track their time, materials, and daily activities on job sites
- **Foremen** schedule workers, approve timesheets, and manage crews
- **Admins** oversee projects, generate reports, and export data for payroll
- **Finance teams** review expenses, approve invoices, and track costs
- **Super admins** manage multiple organizations and system-wide settings

**Primary Use Case:** A painter on a construction site can:
1. Clock in to a job from their phone (even without internet)
2. Track materials used with photos
3. Log expenses and mileage
4. Complete safety checklists
5. Have everything sync automatically when back online

---

## How It's Built - The Big Picture

### The Simple Explanation

Imagine EP Tracker as a three-layer cake:

```
┌─────────────────────────────────────┐
│    LAYER 1: What Users See          │  ← The website/app interface
│    (Frontend - React/Next.js)       │
├─────────────────────────────────────┤
│    LAYER 2: The Middleman           │  ← Processes requests, enforces rules
│    (API Routes - Next.js Server)    │
├─────────────────────────────────────┤
│    LAYER 3: The Database            │  ← Where data is stored
│    (Supabase - PostgreSQL)          │
└─────────────────────────────────────┘
```

### The Detailed Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S DEVICE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   iPhone    │  │   Android   │  │   Laptop    │            │
│  │   Safari    │  │   Chrome    │  │   Browser   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           │                                     │
│                   Opens web browser                             │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                   HTTPS (encrypted)
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Cloud Hosting)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          Frontend Application (Next.js)                   │ │
│  │  • User interface (buttons, forms, tables)                │ │
│  │  • Smart caching (stores data locally)                    │ │
│  │  • Works offline (service worker)                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          API Layer (Route Handlers)                       │ │
│  │  • Validates user permissions                             │ │
│  │  • Processes business logic                               │ │
│  │  • Connects to database                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend Services)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Database    │  │     Auth     │  │   Storage    │         │
│  │  PostgreSQL  │  │  (Login/     │  │  (Photos/    │         │
│  │  (All data)  │  │   Users)     │  │   Files)     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Stripe     │  │  Resend.com  │  │   Firebase   │         │
│  │  (Payments)  │  │  (Emails)    │  │(Notifications│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Three Layers Explained

### Layer 1: The Frontend (What Users See)

**Technology:** Next.js 15 + React 19 + TypeScript

**What it does:**
- Displays the user interface (buttons, forms, tables, charts)
- Handles user interactions (clicks, form submissions, drag-and-drop)
- Stores data locally for offline use
- Makes the app feel fast and responsive

**Think of it as:** The facade of a building - what people see and interact with.

**Key Features:**
- **Responsive Design:** Works on phones, tablets, and desktops
- **Component-Based:** Reusable UI pieces (like LEGO blocks)
- **Real-Time Updates:** Changes appear instantly without page refresh
- **Smart Caching:** Remembers frequently accessed data

**Technologies Used:**
- **React:** JavaScript library for building interactive interfaces
- **Next.js:** Framework that adds server-side capabilities to React
- **TypeScript:** Type-safe JavaScript (catches errors before they happen)
- **Tailwind CSS:** Utility-first styling system for consistent design
- **shadcn/ui:** Pre-built accessible component library

---

### Layer 2: The API Layer (The Middleman)

**Technology:** Next.js API Routes (Server-Side)

**What it does:**
- Receives requests from the frontend
- Checks if users have permission to perform actions
- Validates data (ensures everything is correct before saving)
- Talks to the database
- Returns responses to the frontend

**Think of it as:** A restaurant server - takes your order, checks the kitchen (database), and brings back your food.

**Key Responsibilities:**
- **Authentication:** "Who are you?" (Login verification)
- **Authorization:** "Are you allowed to do this?" (Permission checks)
- **Business Logic:** "Is this request valid?" (Rules enforcement)
- **Data Transformation:** Formats data for frontend consumption

**Example Flow:**
1. User clicks "Save Time Entry"
2. Frontend sends request to `/api/time/entries`
3. API checks: Is user logged in? Do they have access to this project?
4. API validates: Are the hours reasonable? Is the date correct?
5. API saves to database
6. API returns success/error to frontend

---

### Layer 3: The Database (Where Everything Lives)

**Technology:** Supabase (PostgreSQL + Auth + Storage)

**What it does:**
- Stores all application data (users, projects, time entries, etc.)
- Manages user authentication (login, passwords, sessions)
- Stores files (photos, receipts, documents)
- Enforces data security rules

**Think of it as:** A highly organized filing cabinet with locks, where everything has its place.

**Components:**

#### 3a. PostgreSQL Database
- **What:** A relational database (data stored in tables with relationships)
- **Contains:** ~50 tables including:
  - `organizations` - Company accounts
  - `profiles` - User information
  - `projects` - Construction projects
  - `time_entries` - Work hours tracking
  - `materials` - Materials usage logs
  - `expenses` - Expense tracking
  - `assignments` - Planning/scheduling data
  - And many more...

#### 3b. Supabase Auth
- **What:** Authentication service
- **Handles:**
  - User registration
  - Password-based login
  - Magic link login (passwordless)
  - Password reset
  - Session management
  - Multi-factor authentication (future)

#### 3c. Supabase Storage
- **What:** File storage system
- **Contains:**
  - Material photos
  - Receipt images
  - Diary photos
  - ÄTA (change order) photos
  - User profile pictures
  - Export CSV files

**Security Feature:** Row Level Security (RLS)
- Every table has rules that determine who can see/edit what
- Example: Workers can only see their own time entries; foremen can see their team's

---

## Key Technologies & Why We Chose Them

### Frontend Stack

#### 1. **Next.js 15** (Framework)
**What it is:** A React framework that adds server-side rendering and API routes.

**Why we chose it:**
- ✅ **SEO-friendly:** Search engines can crawl the site
- ✅ **Fast initial load:** Pages load quickly
- ✅ **Built-in API routes:** No separate backend server needed
- ✅ **File-based routing:** URL structure mirrors file structure
- ✅ **Automatic code splitting:** Only loads code you need
- ✅ **Image optimization:** Automatically optimizes images

**Alternatives considered:** Create React App (too basic), Remix (less mature)

---

#### 2. **React 19** (UI Library)
**What it is:** JavaScript library for building user interfaces.

**Why we chose it:**
- ✅ **Component-based:** Reusable UI pieces
- ✅ **Large ecosystem:** Tons of libraries and tools
- ✅ **Industry standard:** Easy to hire React developers
- ✅ **Virtual DOM:** Efficient updates (only re-renders what changed)
- ✅ **Strong community:** Great support and documentation

**Alternatives considered:** Vue (smaller ecosystem), Angular (steeper learning curve)

---

#### 3. **TypeScript** (Programming Language)
**What it is:** JavaScript with type safety (think spell-check for code).

**Why we chose it:**
- ✅ **Catches errors early:** Before code runs
- ✅ **Better autocomplete:** IDEs can suggest code
- ✅ **Self-documenting:** Types serve as documentation
- ✅ **Refactoring confidence:** Safe to change code
- ✅ **Industry standard:** Modern projects use TypeScript

**Alternatives considered:** Plain JavaScript (more error-prone)

---

#### 4. **Zustand** (State Management)
**What it is:** Lightweight state management library (manages data in the app).

**Why we chose it:**
- ✅ **Simple API:** Easy to learn and use
- ✅ **No boilerplate:** Less code than Redux
- ✅ **TypeScript-first:** Excellent type support
- ✅ **Small bundle size:** ~1KB (Redux is ~10KB)

**Use cases in EP Tracker:**
- Current timer state
- UI filters and preferences
- Offline queue management
- Temporary form data

**Alternatives considered:** Redux (too complex), Context API (performance issues)

---

#### 5. **React Query (TanStack Query)** (Server State)
**What it is:** Manages data fetching, caching, and synchronization.

**Why we chose it:**
- ✅ **Automatic caching:** Reduces API calls
- ✅ **Background refetching:** Keeps data fresh
- ✅ **Optimistic updates:** Instant UI feedback
- ✅ **Error handling:** Built-in retry logic
- ✅ **Devtools:** Great debugging experience

**What it handles:**
- Fetching time entries
- Caching project lists
- Syncing after offline work
- Invalidating stale data

**Alternatives considered:** SWR (less features), Apollo Client (GraphQL only)

---

### Backend Stack

#### 6. **Supabase** (Backend-as-a-Service)
**What it is:** Open-source Firebase alternative with PostgreSQL.

**Why we chose it:**
- ✅ **PostgreSQL:** Mature, reliable database
- ✅ **Row Level Security:** Built-in multi-tenancy
- ✅ **Real-time subscriptions:** Live updates
- ✅ **Auth included:** No separate auth service
- ✅ **File storage:** No need for AWS S3
- ✅ **Generous free tier:** Cost-effective for startups
- ✅ **Self-hostable:** Not locked into vendor

**What it provides:**
- Database hosting (PostgreSQL 15)
- Authentication service
- File storage (photos, documents)
- Real-time database subscriptions
- Automatic API generation
- Database backups

**Cost:** ~$25/month for small production, scales to ~$100-300/month for 100+ users

**Alternatives considered:** 
- Firebase (NoSQL, vendor lock-in)
- AWS Amplify (complex setup)
- Custom backend (higher maintenance)

---

#### 7. **PostgreSQL** (Database)
**What it is:** Open-source relational database (industry standard).

**Why we chose it:**
- ✅ **ACID compliant:** Data integrity guaranteed
- ✅ **Relational:** Natural fit for business data
- ✅ **Mature:** 30+ years of development
- ✅ **JSON support:** Flexible schema when needed
- ✅ **Full-text search:** Built-in search capabilities
- ✅ **Excellent performance:** Handles millions of rows

**Data we store:**
- Structured data (users, projects, time entries)
- Relationships (which user belongs to which project)
- Audit logs (who did what, when)
- Planning/scheduling data

**Alternatives considered:**
- MongoDB (NoSQL, less structure)
- MySQL (less features)
- SQLite (not scalable)

---

### Offline & PWA Stack

#### 8. **Dexie.js** (IndexedDB Wrapper)
**What it is:** Library for storing data in the browser (offline database).

**Why we chose it:**
- ✅ **IndexedDB wrapper:** Simplifies complex API
- ✅ **Promise-based:** Modern async/await syntax
- ✅ **TypeScript support:** Full type safety
- ✅ **Reactive queries:** Auto-updates when data changes
- ✅ **Schema versioning:** Easy migrations

**What we store offline:**
- Recent time entries
- Project list
- Pending changes (offline queue)
- User preferences
- Cached photos (thumbnails)

**Alternatives considered:** 
- LocalStorage (too limited, 5-10MB max)
- Raw IndexedDB (too complex)

---

#### 9. **Workbox** (Service Worker)
**What it is:** Library for building offline-capable web apps.

**Why we chose it:**
- ✅ **Caching strategies:** Flexible offline behavior
- ✅ **Background sync:** Syncs when back online
- ✅ **Precaching:** Critical assets always available
- ✅ **Google-backed:** Well-maintained
- ✅ **PWA best practices:** Built-in

**What it does:**
- Caches app shell (HTML/CSS/JS)
- Caches API responses
- Queues failed requests
- Syncs when connection restored
- Enables offline-first UX

**Alternatives considered:**
- Manual service worker (too complex)
- No offline support (poor UX for field workers)

---

### Styling & UI

#### 10. **Tailwind CSS** (Styling Framework)
**What it is:** Utility-first CSS framework.

**Why we chose it:**
- ✅ **Fast development:** No context switching (HTML/CSS)
- ✅ **Consistent design:** Design tokens built-in
- ✅ **Small bundle:** Only ships CSS you use
- ✅ **Responsive:** Mobile-first utilities
- ✅ **Dark mode:** Built-in support

**Example:**
```html
<!-- Traditional CSS -->
<button class="primary-button">Save</button>
/* CSS file */
.primary-button { background: blue; padding: 8px 16px; }

<!-- Tailwind CSS -->
<button class="bg-blue-500 px-4 py-2">Save</button>
```

**Alternatives considered:**
- CSS Modules (more boilerplate)
- Styled Components (runtime overhead)
- Bootstrap (outdated design patterns)

---

#### 11. **shadcn/ui** (Component Library)
**What it is:** Collection of accessible, customizable components.

**Why we chose it:**
- ✅ **Copy-paste approach:** Own the code, not a dependency
- ✅ **Radix UI primitives:** Accessible by default
- ✅ **Tailwind-styled:** Consistent with our system
- ✅ **TypeScript:** Full type safety
- ✅ **Customizable:** Easy to modify

**Components we use:**
- Dialog, Dropdown, Select, Tabs
- Button, Input, Checkbox, Switch
- Alert, Toast, Tooltip
- Accordion, Card, Separator

**Alternatives considered:**
- Material UI (heavy bundle size)
- Chakra UI (runtime CSS-in-JS)
- Ant Design (opinionated design)

---

### Additional Services

#### 12. **Stripe** (Payments & Subscriptions)
**What it is:** Payment processing platform.

**Why we use it:**
- ✅ **Industry standard:** Trusted by millions
- ✅ **Subscription management:** Built-in recurring billing
- ✅ **Customer portal:** Self-service management
- ✅ **Strong API:** Well-documented
- ✅ **Compliance:** PCI-DSS compliant

**What we process:**
- Monthly/annual subscriptions
- Seat-based billing (per user)
- Invoice generation
- Payment method management

**Cost:** 2.9% + $0.30 per transaction

---

#### 13. **Resend.com** (Transactional Emails)
**What it is:** Developer-first email service.

**Why we use it:**
- ✅ **Modern API:** Simple, intuitive
- ✅ **React Email:** Build emails with React
- ✅ **Reliable delivery:** High deliverability
- ✅ **Affordable:** $20/month for 100K emails
- ✅ **No vendor lock-in:** Easy to switch

**Emails we send:**
- User invitations
- Password resets
- Magic link logins
- Weekly approval reminders
- Export notifications

**Alternatives considered:**
- SendGrid (complex pricing)
- Mailgun (older API)
- AWS SES (complex setup)

---

#### 14. **Vercel** (Hosting & Deployment)
**What it is:** Cloud platform for Next.js apps.

**Why we use it:**
- ✅ **Next.js creators:** Best integration
- ✅ **Zero config:** Deploy with git push
- ✅ **Edge network:** Fast globally (CDN)
- ✅ **Preview deploys:** Every PR gets a URL
- ✅ **Automatic scaling:** Handles traffic spikes
- ✅ **Analytics:** Built-in performance monitoring

**What we get:**
- Automatic HTTPS
- Global CDN (content delivery network)
- Edge functions (serverless API routes)
- Preview environments
- Real-time logs
- Performance insights

**Cost:** ~$20/month (Pro plan), scales to ~$100-200/month with high traffic

**Alternatives considered:**
- Netlify (similar but less Next.js optimization)
- AWS Amplify (complex, expensive)
- Self-hosted (higher maintenance)

---

## How Data Flows Through the System

Let's trace what happens when a worker logs a time entry:

### Step-by-Step Flow

```
1. USER ACTION
   │
   │  Worker clicks "Start Timer" on their phone
   │
   ├──────────────────────────────────────────────┐
   │  FRONTEND (React Component)                  │
   │  • Validates: Is project selected?           │
   │  • Updates UI: Shows timer running           │
   │  • Stores locally: In case of offline        │
   └──────────────────┬───────────────────────────┘
                      │
                      │  Sends API request
                      ▼
   ┌──────────────────────────────────────────────┐
   │  API ROUTE (/api/time/entries)               │
   │  • Authenticates: Is user logged in?         │
   │  • Authorizes: Can user access this project? │
   │  • Validates: Are hours reasonable?          │
   │  • Business logic: Check for overlaps        │
   └──────────────────┬───────────────────────────┘
                      │
                      │  Executes SQL query
                      ▼
   ┌──────────────────────────────────────────────┐
   │  DATABASE (Supabase PostgreSQL)              │
   │  • Checks RLS: Row-level security rules      │
   │  • Inserts row: time_entries table           │
   │  • Returns: Created record with ID           │
   └──────────────────┬───────────────────────────┘
                      │
                      │  Returns response
                      ▼
   ┌──────────────────────────────────────────────┐
   │  FRONTEND (React Query)                      │
   │  • Caches: Stores in React Query cache       │
   │  • Updates: UI shows new entry               │
   │  • Syncs: IndexedDB for offline access       │
   └──────────────────────────────────────────────┘
                      │
                      │  User sees result
                      ▼
                 ✅ Success!
```

### What Happens If Offline?

```
1. USER ACTION (Offline)
   │
   │  Worker clicks "Start Timer" but no internet
   │
   ├──────────────────────────────────────────────┐
   │  FRONTEND (Offline Handler)                  │
   │  • Detects: No network connection            │
   │  • Queues: Saves to IndexedDB queue          │
   │  • Updates: UI shows "Will sync later"       │
   │  • Generates: Temporary ID                   │
   └──────────────────┬───────────────────────────┘
                      │
                      │  Waits for connection...
                      │
   ┌──────────────────▼───────────────────────────┐
   │  BACKGROUND SYNC (When Online)               │
   │  • Detects: Connection restored              │
   │  • Retrieves: Queued items from IndexedDB    │
   │  • Sends: Each item to API                   │
   │  • Updates: Replaces temp IDs with real IDs  │
   │  • Cleans: Removes from queue                │
   └──────────────────────────────────────────────┘
                      │
                      ▼
                 ✅ Synced!
```

---

## Offline Functionality - How It Works

### The Challenge

Construction workers often work in areas with poor/no internet:
- Basements (no signal)
- Rural construction sites
- Tunnels or underground work
- Buildings with thick concrete walls

**Solution:** EP Tracker works offline and syncs automatically when online.

---

### The Three-Part Offline System

#### 1. **Service Worker (The Guardian)**

**What it does:**
- Intercepts network requests
- Serves cached responses when offline
- Caches important files (HTML, CSS, JS, images)
- Queues failed requests

**Think of it as:** A smart proxy between the app and the internet.

**Caching Strategies:**
```
App Shell (HTML/CSS/JS)
├─ Cache First
│  ├─ Check cache
│  └─ Use cached version (fast load)
│
API Requests
├─ Network First, Cache Fallback
│  ├─ Try network first
│  ├─ If offline, use cached data
│  └─ Update cache when successful
│
Images/Photos
└─ Cache First, Network Fallback
   ├─ Use cached images if available
   └─ Fetch from network if not
```

---

#### 2. **IndexedDB (Local Storage)**

**What it does:**
- Stores data in the browser (like a mini database)
- Holds recent data for offline access
- Queues changes made offline
- Syncs with server when online

**What we store:**
```
IndexedDB Tables:
├─ time_entries_cache
│  └─ Last 30 days of time entries
│
├─ projects_cache
│  └─ All projects user has access to
│
├─ offline_queue
│  └─ Pending changes (creates/updates/deletes)
│
├─ user_preferences
│  └─ Settings, filters, UI state
│
└─ photo_thumbnails
   └─ Compressed images for offline viewing
```

**Storage Limits:**
- Chrome/Edge: ~60% of available disk space
- Safari: ~1GB (can request more)
- Firefox: ~50% of free disk space

---

#### 3. **Sync Manager (The Coordinator)**

**What it does:**
- Monitors connection status
- Processes offline queue when online
- Handles conflicts (same data edited online and offline)
- Retries failed requests

**Sync Flow:**
```
1. User makes change offline
   └─> Saves to IndexedDB queue

2. Connection restored (automatic detection)
   ├─> Sync manager wakes up
   └─> Processes queue in order

3. For each queued item:
   ├─> Sends to API
   ├─> Receives real ID
   ├─> Updates local cache
   └─> Removes from queue

4. Conflict resolution (if needed)
   ├─> Server data wins
   ├─> Shows notification
   └─> User can review and re-submit
```

---

### Offline Features Available

| Feature | Offline Capability |
|---------|-------------------|
| ✅ Start/stop timer | Full support |
| ✅ View recent time entries | Full support (30 days cached) |
| ✅ Create time entry | Full support (syncs later) |
| ✅ View projects | Full support |
| ✅ Add materials | Full support (photos sync later) |
| ✅ Add expenses | Full support |
| ✅ Complete checklists | Full support |
| ✅ Daily diary | Full support |
| ⚠️ Upload photos | Queued (syncs when online) |
| ⚠️ Approvals | Read-only (approve requires online) |
| ⚠️ Reports/exports | Requires online |
| ⚠️ User management | Requires online |

---

## Security & Privacy

### Multi-Layered Security

```
┌────────────────────────────────────────────┐
│  Layer 1: HTTPS Encryption                 │
│  • All traffic encrypted in transit        │
│  • TLS 1.3 protocol                        │
│  • Automatic cert renewal (Let's Encrypt)  │
└────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────┐
│  Layer 2: Authentication                   │
│  • Email + password (hashed with bcrypt)   │
│  • Magic links (passwordless)              │
│  • Session tokens (JWT)                    │
│  • Automatic logout after 24h              │
└────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────┐
│  Layer 3: Authorization                    │
│  • Role-based access control (RBAC)        │
│  • Every API request checks permissions    │
│  • Organization-level isolation            │
└────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────┐
│  Layer 4: Row Level Security (RLS)         │
│  • Database enforces rules                 │
│  • Users only see their org's data         │
│  • Workers see own entries, foremen see    │
│    team, admins see all                    │
└────────────────────────────────────────────┘
           │
┌────────────────────────────────────────────┐
│  Layer 5: Input Validation                 │
│  • All user input validated                │
│  • SQL injection prevention                │
│  • XSS attack prevention                   │
│  • Rate limiting (prevents abuse)          │
└────────────────────────────────────────────┘
```

---

### Data Privacy

**Multi-Tenancy Isolation:**
- Each organization's data is completely isolated
- No way for Organization A to see Organization B's data
- Enforced at database level (RLS) and application level

**Personal Data Handling:**
- GDPR compliant (EU privacy regulation)
- Users can export their data
- Users can delete their accounts
- Minimal data collection (only what's needed)
- No tracking/analytics cookies without consent

**Audit Trail:**
- All critical actions logged
- Who did what, when
- Immutable audit log (can't be edited)
- Retained for 7 years (compliance requirement)

---

## The Feature Modules

EP Tracker is organized into 15+ major modules:

### 1. **Authentication & User Management**
**Purpose:** Who can access the system

**Features:**
- Email + password login
- Magic link (passwordless) login
- Password reset
- User invitations
- Profile management
- Role assignment (Worker, UE, Foreman, Admin, Finance, Super Admin)

**Security:**
- Password hashing (bcrypt)
- Session management (JWT tokens)
- Multi-factor authentication (future)

---

### 2. **Project Management**
**Purpose:** Track construction projects

**Features:**
- Create/edit projects
- Assign project colors (for visual planning)
- Define phases (project subdivisions)
- Create work orders (specific jobs)
- Set daily capacity needs
- Project status tracking

**Data Stored:**
- Project name, number, client
- Site address
- Start/end dates
- Budget (optional)
- Team assignments

---

### 3. **Time Tracking**
**Purpose:** Track work hours

**Features:**
- Floating timer widget (always visible)
- Start/stop/switch timers
- Manual time entry
- Crew clock-in/out (foreman feature)
- Travel time tracking
- Edit/delete entries
- Filter by date/project/user
- Weekly summaries
- Debiteringsval (Löpande/Fast) med koppling till fasta block eller ÄTA-delprojekt

**Business Rules:**
- No overlapping entries
- Maximum 24 hours per day
- Can't edit after approval
- Foremen can edit team entries
- Fast-debiterade timmar måste kopplas till en fast post eller ÄTA innan de kan sparas

---

### 4. **Materials Management**
**Purpose:** Track materials used on site

**Features:**
- Log materials (quantity, unit, notes)
- Photo gallery (unlimited photos)
- Full-screen photo viewer
- Edit/delete materials
- Status tracking (draft → submitted → approved)
- Link to projects/work orders

**Photo Handling:**
- Automatic compression
- Thumbnail generation
- Offline upload queue
- Stored in Supabase Storage

---

### 5. **Expenses & Mileage**
**Purpose:** Track expenses and car mileage

**Features:**
- Expense entry (amount, category, notes)
- Receipt photo capture
- Mileage logging (km, route, car)
- Automatic reimbursement calculation
- Approval workflow
- Export for accounting

**Categories:**
- Tools & equipment
- Travel & lodging
- Fuel
- Food & meals
- Other

---

### 6. **ÄTA (Change Orders)**
**Purpose:** Track project changes and additions

**Features:**
- ÄTA registration (title, description, estimate)
- Photo documentation
- Digital signature capture (client sign-off)
- Approval workflow (internal + client)
- Status tracking
- PDF export
- Kan ta emot timmar direkt (projektdelar) när arbetstid loggas mot ÄTA i tidflödena

**Workflow:**
1. Worker creates ÄTA
2. Foreman reviews
3. Client signs digitally
4. Admin approves
5. Linked to invoice

---

### 7. **Daily Diary**
**Purpose:** Daily log of site activities

**Features:**
- Daily notes/observations
- Weather tracking
- Crew count
- Photo attachments
- Auto-save (no lost data)
- Historical view

**Use Cases:**
- Safety incidents
- Delivery confirmations
- Visitor logs
- Progress notes
- Issue tracking

---

### 8. **Checklists**
**Purpose:** Safety and quality checklists

**Features:**
- Checklist templates (reusable)
- Checklist instances (per work order)
- Item completion tracking
- Notes per item
- Status overview
- Completion percentage

**Template Types:**
- Safety checklists
- Quality control
- Pre-work inspection
- Post-work cleanup
- Equipment checks

---

### 9. **Approvals & Exports**
**Purpose:** Weekly approval workflow

**Features:**
- Weekly approval periods
- Batch approve time entries
- Approve materials/expenses
- Period lock (prevents edits after approval)
- Approval history
- CSV exports (salary & invoice)
- Attachment exports (photos, receipts)

**Workflow:**
1. Week ends (Sunday)
2. Workers review their entries
3. Foremen approve team entries
4. Admin/Finance approve all
5. Period locked
6. Export for payroll

---

### 10. **Planning System**
**Purpose:** Schedule workers to projects

**Two Interfaces:**

#### A. **Week Planning Grid (Desktop - Foremen/Admins)**
- Week view (Monday-Sunday)
- Drag-and-drop scheduling
- Resource list (all workers)
- Project filter chips
- Capacity indicators
- Conflict detection
- Multi-user assignments

**Use Case:** Foreman plans next week's schedule from office

#### B. **Mobile Today List (Mobile - Field Workers)**
- Today's job list
- Check-in/check-out buttons
- Navigate to job site (Google Maps)
- Status tracking (planned → in progress → done)
- Job details (time, location, notes)

**Use Case:** Worker arrives at site, checks in, starts work

---

### 11. **Super Admin Panel**
**Purpose:** System-wide management (for EP Tracker staff)

**Features:**
- Organization management (all customers)
- User management (all users)
- Billing & subscriptions (Stripe)
- System configuration
- Feature flags
- Audit logs
- Analytics & monitoring
- Email system management
- Support tools (impersonation, trial extensions)

**Access:** Super Admin role only (EP Tracker staff)

---

### 12. **Settings**
**Purpose:** User and organization preferences

**Features:**
- Profile settings (name, email, photo)
- Organization settings (name, address, logo)
- User management (invite, roles, deactivate)
- Notification preferences
- Language selection (Swedish/English)
- Export settings
- Billing portal access

---

### 13. **Help & Documentation**
**Purpose:** In-app help and tutorials

**Features:**
- Feature explanations
- Video tutorials (future)
- FAQ section
- Contact support
- Changelog
- Keyboard shortcuts

---

### 14. **Notifications System** (EPIC 25)
**Purpose:** Keep users informed

**Features:**
- Web push notifications
- Email notifications
- In-app notification center
- Notification preferences (per feature)
- Assignment reminders
- Approval reminders
- Due date alerts

**Triggers:**
- New assignment
- Assignment starting soon
- Approval requested
- Approval status changed
- Week ending reminder

---

### 15. **Voice Notes System** (EPIC 27-30 - In Planning)
**Purpose:** Hands-free voice notes for diary

**Features (Planned):**
- Voice recording (hands-free, VAD)
- Auto transcription (Whisper AI)
- Multi-language support (Polish, English, etc.)
- Auto-translate to Swedish
- Save to daily diary
- Original transcript preserved

**Use Case:** Painter with dirty hands speaks in Polish, note appears in Swedish in diary

---

## Deployment & Hosting

### Current Setup

```
┌────────────────────────────────────────────┐
│  VERCEL (Hosting Platform)                 │
│  ┌──────────────────────────────────────┐  │
│  │  Production:                         │  │
│  │  https://eptracker.com              │  │
│  │  • Main branch auto-deploy           │  │
│  │  • Global CDN (fast worldwide)       │  │
│  │  • Automatic scaling                 │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Preview:                            │  │
│  │  • Each PR gets unique URL           │  │
│  │  • Automatic testing environment     │  │
│  │  • Safe to test changes              │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────┐
│  SUPABASE (Database & Storage)             │
│  • US East (primary)                       │
│  • Automatic backups (daily)               │
│  • Point-in-time recovery (7 days)         │
│  • CDN for file storage                    │
└────────────────────────────────────────────┘
```

---

### Deployment Process

**Continuous Deployment (CD):**

```
1. Developer pushes code
   └─> git push origin main

2. GitHub triggers webhook
   └─> Notifies Vercel

3. Vercel builds application
   ├─> Runs TypeScript checks
   ├─> Runs ESLint (code quality)
   ├─> Builds Next.js app
   └─> Optimizes assets

4. Vercel deploys to edge network
   ├─> Deploys to 20+ regions worldwide
   └─> Updates DNS automatically

5. Vercel runs health checks
   └─> Tests critical endpoints

6. Live in ~2 minutes
   └─> Users see new version automatically
```

**Zero Downtime:** New version deployed gradually (rolling update)

---

### Environments

| Environment | URL | Purpose | Database |
|-------------|-----|---------|----------|
| **Production** | eptracker.com | Live users | Production DB |
| **Staging** | staging.eptracker.com | Pre-production testing | Staging DB (copy) |
| **Preview** | pr-123.vercel.app | PR testing | Development DB |
| **Local** | localhost:3000 | Development | Local/Dev DB |

---

### Monitoring & Observability

**What we monitor:**

1. **Uptime**
   - Target: 99.9% (< 9 hours downtime/year)
   - Alerts if site is down > 1 minute

2. **Performance**
   - Page load time: < 2 seconds (p95)
   - API response time: < 500ms (p95)
   - Database query time: < 100ms (p95)

3. **Errors**
   - JavaScript errors (frontend)
   - API errors (backend)
   - Database errors

4. **Usage**
   - Daily active users (DAU)
   - Feature adoption
   - Conversion rates

**Tools:**
- Vercel Analytics (performance)
- Supabase Dashboard (database)
- Sentry (error tracking, future)
- PostHog (product analytics, future)

---

## Scalability & Performance

### Current Capacity

**Database (Supabase):**
- **Connections:** 100 concurrent (current plan)
- **Storage:** Unlimited (pay per GB)
- **Requests:** Unlimited
- **Can handle:** ~1,000 active users easily

**Frontend (Vercel):**
- **Requests:** Unlimited
- **Bandwidth:** 100GB/month (then $40/100GB)
- **Edge functions:** 1M invocations/month
- **Can handle:** Millions of page views/month

---

### Scaling Strategy

#### Phase 1: Current (10-100 users)
- Single database instance
- Shared hosting (Vercel Pro)
- No caching layer needed
- **Cost:** ~$50-100/month

#### Phase 2: Growth (100-1,000 users)
- Database: Upgrade Supabase plan ($100/month)
- Add Redis cache (Upstash, $10-50/month)
- Vercel: Upgrade to Team ($20/month/seat)
- **Cost:** ~$200-300/month

#### Phase 3: Scale (1,000-10,000 users)
- Database: Read replicas (distribute load)
- CDN optimization (more edge caching)
- Background job processing (queue system)
- Database connection pooling
- **Cost:** ~$500-1,500/month

#### Phase 4: Enterprise (10,000+ users)
- Multiple database regions
- Dedicated Supabase instance
- Enterprise Vercel plan
- Custom infrastructure as needed
- **Cost:** $2,000-10,000+/month

---

### Performance Optimizations

**Already Implemented:**

1. **Code Splitting**
   - Only load code for current page
   - Lazy load heavy components
   - Dynamic imports for modals

2. **Image Optimization**
   - Automatic resizing
   - WebP format (modern browsers)
   - Lazy loading (load when visible)
   - Responsive images (right size for device)

3. **Caching**
   - Static assets cached 1 year
   - API responses cached (React Query)
   - Database queries cached (5 minutes)

4. **Server-Side Rendering**
   - Initial HTML rendered on server
   - Fast first paint
   - SEO-friendly

5. **Database Optimization**
   - Proper indexes on all queries
   - Connection pooling
   - Query optimization

**Lighthouse Scores (Target):**
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- PWA: 100

---

## What Makes It a PWA

### Progressive Web App Requirements

✅ **1. HTTPS** (Secure)
- All traffic encrypted

✅ **2. Service Worker** (Offline)
- Works without internet

✅ **3. Web App Manifest** (Installable)
- Can be installed like native app

✅ **4. Responsive** (Any Device)
- Works on phone, tablet, desktop

✅ **5. App-like Experience**
- Feels like native app

---

### PWA Benefits

| Feature | Native App | PWA (EP Tracker) | Web App |
|---------|-----------|------------------|---------|
| App Store | ✅ | ✅ (optional) | ❌ |
| Install Required | ✅ | Optional | ❌ |
| Works Offline | ✅ | ✅ | ❌ |
| Push Notifications | ✅ | ✅ | ❌ |
| Home Screen Icon | ✅ | ✅ | ❌ |
| Updates | Manual | Automatic | Automatic |
| Storage Space | 50-200MB | 5-20MB | ~0MB |
| Development Cost | High | Low | Low |
| Cross-Platform | ❌ (2 codebases) | ✅ (1 codebase) | ✅ |
| App Store Fees | 30% | 0% | 0% |

---

### Installation Process

**iOS (Safari):**
1. Open eptracker.com in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"
5. Icon appears on home screen

**Android (Chrome):**
1. Open eptracker.com in Chrome
2. Tap "Install app" banner (auto-appears)
   OR
3. Tap menu → "Install app"
4. Tap "Install"
5. Icon appears on home screen

**Desktop (Chrome/Edge):**
1. Open eptracker.com
2. Click install icon in address bar
3. Click "Install"
4. Opens in its own window

---

## Integration Points

### External Services EP Tracker Connects To

#### 1. **Stripe** (Payments)
**Purpose:** Process subscriptions and payments

**Integration:**
- Stripe Checkout (payment form)
- Customer Portal (self-service)
- Webhooks (payment events)

**Data Flow:**
```
EP Tracker → Stripe Checkout → User pays → Webhook
   ↓                                          ↓
Store customer ID                    Update subscription
```

---

#### 2. **Resend.com** (Email)
**Purpose:** Send transactional emails

**Integration:**
- REST API
- React Email (templates)

**Emails:**
- User invitations
- Password resets
- Magic links
- Approval reminders
- Export ready notifications

---

#### 3. **Firebase** (Push Notifications)
**Purpose:** Send web push notifications

**Integration:**
- Firebase Cloud Messaging (FCM)
- Service worker (receives notifications)

**Notifications:**
- New assignments
- Approval requests
- Due date reminders

---

#### 4. **Google Maps** (Navigation)
**Purpose:** Navigate to job sites

**Integration:**
- Deep links (no API key needed)
- Opens Google Maps app

**Format:** `https://maps.google.com/?q=<address>`

---

### Future Integrations (Roadmap)

**Phase 3:**
- **Fortnox/Visma:** Accounting integration (invoice export)
- **BankID:** Swedish authentication
- **Slack/Teams:** Notification integration

**Phase 4:**
- **EstimatePro:** Estimation software integration
- **Wholesale APIs:** Material pricing lookups

---

## Development Workflow

### Team Structure (Recommended)

**Small Team (1-3 devs):**
- Full-stack developers
- Everyone works on everything
- Simple git workflow

**Medium Team (4-10 devs):**
- Frontend specialists
- Backend specialists
- DevOps/Infrastructure
- Git flow with feature branches

**Large Team (10+ devs):**
- Feature teams (cross-functional)
- Platform team (infrastructure)
- QA team (testing)
- Monorepo with multiple packages

---

### Development Process

**1. Local Development**
```bash
# Clone repository
git clone https://github.com/your-org/ep-tracker.git

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# (Fill in Supabase credentials)

# Run development server
npm run dev

# Open browser
http://localhost:3000
```

**2. Feature Development**
```bash
# Create feature branch
git checkout -b feat/voice-notes

# Make changes
# ... code ...

# Run linting
npm run lint

# Commit changes
git commit -m "feat: add voice notes"

# Push to GitHub
git push origin feat/voice-notes

# Create Pull Request
# (On GitHub.com)
```

**3. Code Review**
- Automated checks run (TypeScript, ESLint)
- Preview deployment created
- Team member reviews code
- Feedback addressed
- Approved → merged to main

**4. Deployment**
- Merge triggers automatic deploy
- Vercel builds and deploys
- Live in ~2 minutes
- Automatic rollback if errors detected

---

### Quality Assurance

**Automated:**
- TypeScript type checking
- ESLint (code quality)
- Prettier (formatting)
- Build verification (compiles successfully)

**Manual:**
- Code review (peer review)
- Feature testing (QA on preview)
- Smoke testing (critical paths)

**Future (Planned):**
- Unit tests (Jest)
- Integration tests (Testing Library)
- E2E tests (Playwright)
- Visual regression tests (Percy)

---

## Cost Structure

### Monthly Operating Costs (Estimates)

#### Startup Phase (10-50 users)
| Service | Plan | Cost |
|---------|------|------|
| Vercel (Hosting) | Pro | $20 |
| Supabase (Database) | Pro | $25 |
| Resend (Email) | Free | $0 |
| Stripe (Payments) | Pay-as-you-go | ~$0-50 |
| Firebase (Push) | Free | $0 |
| Domain | Yearly/12 | $1-2 |
| **Total** | | **$46-97/month** |

---

#### Growth Phase (50-500 users)
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25-100 |
| Resend | Starter | $20 |
| Stripe | 2.9% + $0.30 | ~$100-500 |
| Firebase | Spark | $0-20 |
| Upstash (Redis) | Pay-as-you-go | $10-30 |
| **Total** | | **$175-690/month** |

---

#### Scale Phase (500-5,000 users)
| Service | Plan | Cost |
|---------|------|------|
| Vercel | Team | $100-300 |
| Supabase | Team | $599 |
| Resend | Pro | $80 |
| Stripe | 2.9% + $0.30 | ~$1,000-5,000 |
| Firebase | Blaze | $50-200 |
| Upstash | Pay-as-you-go | $30-100 |
| Sentry (Errors) | Team | $26 |
| **Total** | | **$1,885-6,305/month** |

*(Stripe costs vary with revenue, shown separately in P&L)*

---

### One-Time Costs

| Item | Cost | When |
|------|------|------|
| Domain purchase | $10-50 | Year 1 |
| SSL certificate | $0 (free) | - |
| Logo design | $500-5,000 | Year 1 |
| Initial development | $0-150K | Year 1 (if outsourced) |
| Stripe account setup | $0 | Year 1 |

---

### Hidden Costs to Consider

**Developer Time:**
- Bug fixes: ~10-20 hours/month
- Feature development: ~40-160 hours/month
- Support: ~5-10 hours/month

**Infrastructure:**
- Database migrations: ~2-5 hours/month
- Deployment issues: ~1-3 hours/month
- Monitoring/alerts: ~1-2 hours/month

**Third-Party Limits:**
- Vercel bandwidth: $40 per 100GB over limit
- Supabase storage: $0.021 per GB/month
- Resend emails: $8 per 10K emails over limit

---

## Future-Proofing

### Why This Architecture Is Future-Proof

#### 1. **Modern Tech Stack**
- Next.js, React, TypeScript are industry standard
- Not going away anytime soon
- Easy to find developers

#### 2. **Cloud-Native**
- Scales automatically
- No server management
- Global deployment ready

#### 3. **Vendor Flexibility**
- Supabase is open-source (can self-host)
- Next.js can deploy anywhere (Vercel, AWS, etc.)
- Not locked into specific vendors

#### 4. **API-First Design**
- Business logic in APIs
- Frontend is replaceable (could build mobile apps)
- Easy to add integrations

#### 5. **Database-Centric**
- PostgreSQL is mature (30+ years)
- Standard SQL (portable)
- Can migrate to any Postgres provider

---

### Migration Paths If Needed

#### If Growth Exceeds Supabase
**Option 1:** Self-host Supabase
- Same tech, your infrastructure
- Full control

**Option 2:** Migrate to AWS RDS
- Managed PostgreSQL
- Copy database dump
- Update connection string

**Option 3:** Other Postgres providers
- Railway, Render, Heroku, Neon
- Standard Postgres → easy migration

---

#### If Growth Exceeds Vercel
**Option 1:** Vercel Enterprise
- Custom limits
- Dedicated support

**Option 2:** AWS Amplify
- Similar service
- Next.js supported

**Option 3:** Self-host
- Docker containers
- Kubernetes
- Full control

---

### Technology Refresh Cycle

**Every 1-2 years:**
- Update dependencies (Next.js, React, etc.)
- Adopt new features
- Remove deprecated code

**Every 3-5 years:**
- Consider architecture evolution
- Evaluate new technologies
- Refactor technical debt

**Current Stack Longevity:**
- Next.js/React: 5-10+ years (industry standard)
- TypeScript: 10+ years (mature)
- PostgreSQL: 20+ years (proven)
- PWA: 10+ years (web standard)

---

## Appendix: Glossary

**API (Application Programming Interface):** Way for software to talk to other software

**CDN (Content Delivery Network):** Network of servers worldwide that deliver content fast

**Component:** Reusable UI piece (like a button or form)

**Database:** Where data is stored permanently

**Deployment:** Publishing code to production (making it live)

**Frontend:** What users see and interact with

**Backend:** Server-side logic and database

**IndexedDB:** Browser's built-in database for offline storage

**JWT (JSON Web Token):** Secure way to transmit user identity

**Middleware:** Code that runs between request and response

**Migration:** Script to change database structure

**Offline-First:** Design approach where app works offline by default

**PWA (Progressive Web App):** Web app that works like a native app

**RLS (Row Level Security):** Database-level security that controls data access

**REST API:** Standard way for frontend to talk to backend

**Service Worker:** Background script that enables offline functionality

**State Management:** How app tracks and updates data

**TypeScript:** JavaScript with type checking

**Webhook:** Automatic notification when something happens

---

## Summary: Why EP Tracker's Architecture Matters

### Key Strengths

✅ **Modern & Maintainable**
- Industry-standard technologies
- Easy to find developers
- Well-documented patterns

✅ **Scalable & Performant**
- Handles 10 to 10,000+ users
- Fast load times (< 2 seconds)
- Global CDN delivery

✅ **Offline-First**
- Works without internet
- Critical for construction sites
- Automatic synchronization

✅ **Secure & Compliant**
- Multi-layered security
- GDPR compliant
- Audit trail for compliance

✅ **Cost-Effective**
- Low initial costs (~$50/month)
- Scales with usage
- No expensive licenses

✅ **Future-Proof**
- Not locked to vendors
- Can migrate if needed
- Open-source foundations

---

### Business Value

**For Users:**
- Works anywhere (web, phone, tablet)
- No app store friction
- Instant updates
- Offline capability

**For Business:**
- Fast time to market
- Low maintenance overhead
- Easy to add features
- Scales without rewrites

**For Developers:**
- Modern, enjoyable tech stack
- Good documentation
- Clear patterns
- Active community support

---

## Questions & Contact

**Technical Questions:**
- See `README.md` for developer setup
- See `docs/` folder for detailed docs

**Business Questions:**
- Architecture decisions rationale
- Scaling strategy
- Cost optimization
- Migration planning

**This Document:**
- Created: October 29, 2025
- For: Non-technical stakeholders
- Purpose: Understand how EP Tracker is built
- Next Review: After major architecture changes

---

**Related Documents:**
- [System Overview](./SYSTEM-OVERVIEW.md) - Technical details
- [Project Status](./PROJECT-STATUS.md) - Feature status
- [README.md](../README.md) - Developer getting started

---

*This document explains EP Tracker's architecture in plain language. For technical implementation details, see the developer documentation.*



