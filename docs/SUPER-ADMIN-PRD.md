# PRD: Super Admin Panel (Site Owner Dashboard)

**Project:** EP Time Tracker  
**Feature:** Multi-Tenant SaaS Admin Panel  
**Phase:** Phase 2 - SaaS Operations  
**Target Users:** Site Owners / Platform Administrators  
**Status:** 📝 Proposal

---

## 🎯 Executive Summary

Create a **Super Admin Panel** for EP Time Tracker site owners to manage the entire SaaS platform: monitor all organizations, track revenue/payments, analyze usage, provide support, and manage system health.

**Current State:** No way to view/manage multiple organizations or track platform-level metrics.

**Proposed State:** Dedicated `/super-admin` portal with full visibility into all tenants, billing, usage, and system health.

---

## 💡 Problem Statement

**Pain Points:**
1. **No visibility** into which organizations are using the platform
2. **No payment tracking** - can't see who's paid, who's overdue, MRR, churn
3. **No usage analytics** - don't know which features are popular, where users struggle
4. **No support tools** - can't help customers without direct database access
5. **No organization management** - can't suspend/delete/upgrade accounts
6. **No system monitoring** - can't track performance, errors, storage usage across all tenants

**Impact:** Can't run EP Tracker as a business - no way to track revenue, identify problems, or scale operations.

---

## 🎯 Success Criteria

### Quantitative
- Can answer "What's our MRR?" in < 5 seconds
- Can identify struggling customers (low usage) automatically
- Support tickets resolved 50% faster with admin tools
- 100% visibility into all organizations and users
- Churn prediction with 80% accuracy

### Qualitative
- Site owners feel "in control" of the business
- Easy to onboard new customers
- Quick to troubleshoot customer issues
- Data-driven decision making enabled

---

## 👥 User Personas

### Primary: Johan (Site Owner / CEO)
- Runs EP Tracker as a SaaS business
- Needs to track revenue, customers, growth
- Wants to identify which features drive retention
- Needs to provide support to customers
- Makes decisions on feature prioritization

### Secondary: Support Team
- Helps customers with issues
- Needs to view customer data to troubleshoot
- Can impersonate users (with consent)
- Manages onboarding for new organizations

---

## 🏗️ Proposed Solution

### Navigation Structure

```
/super-admin (Super Admin Panel)
├── 📊 Dashboard (Overview)
├── 🏢 Organisationer (Organizations)
├── 👥 Användare (All Users)
├── 💳 Betalningar (Billing & Payments)
├── 📈 Användning (Usage Analytics)
├── 🆘 Support (Customer Support Tools)
├── ⚙️ Systeminställningar (System Config)
└── 🔍 Systemlogg (System Audit Log)
```

---

## 📋 Feature Breakdown

### 1. Dashboard (Overview) ⭐ **Phase 2.1 - Critical**

**Path:** `/super-admin`

**Access Control:**
- New database table: `super_admins` (user_id, granted_by, granted_at)
- New role: `super_admin` (separate from org roles)
- Middleware: Check if user is super admin before allowing access

**Widgets:**

#### Revenue Metrics
- **MRR (Monthly Recurring Revenue):** Current month
- **ARR (Annual Recurring Revenue):** Projected
- **Paying Customers:** Count
- **Trial Users:** Count
- **Churn Rate:** Last 30 days

#### Growth Metrics
- **New Organizations:** This month vs last month
- **Active Users:** Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- **Growth Rate:** % month-over-month

#### Usage Metrics
- **Total Time Entries:** All time + this week
- **Total Projects:** Active vs archived
- **Storage Used:** GB across all organizations
- **API Requests:** Last 24h + trend

#### System Health
- **Uptime:** 99.9% (last 30 days)
- **Avg Response Time:** API latency
- **Error Rate:** % of failed requests
- **Background Jobs:** Pending sync queue items

#### Charts
- **Revenue Trend:** MRR over last 12 months (line chart)
- **User Growth:** New users per week (bar chart)
- **Feature Usage:** Top 10 features by usage (horizontal bar)
- **Organizations by Plan:** Free/Basic/Pro/Enterprise (pie chart)

**API Routes:**
```typescript
GET /api/super-admin/metrics/revenue
GET /api/super-admin/metrics/growth
GET /api/super-admin/metrics/usage
GET /api/super-admin/metrics/health
```

---

### 2. Organisationer (Organizations) ⭐ **Phase 2.1 - Critical**

**Path:** `/super-admin/organizations`

**Features:**

#### Organizations Table
**Columns:**
- Organization name
- Plan (Free/Trial/Paid)
- Status (Active/Suspended/Deleted)
- User count
- Storage used (GB)
- Created date
- Last activity
- MRR contribution
- Actions dropdown

**Filters:**
- Plan type
- Status
- Date range (created)
- Search by name

**Sort:** By name, created date, user count, MRR, last activity

**Bulk Actions:**
- Export to CSV
- Send announcement email

#### Organization Detail View
**Path:** `/super-admin/organizations/[orgId]`

**Tabs:**

1. **Översikt (Overview)**
   - Organization name, ID, created date
   - Current plan + billing status
   - Owner info (name, email, phone)
   - Storage used / limit
   - User count / limit
   - Active projects count
   - Last activity timestamp
   - Quick actions: Edit plan, Suspend, Delete

2. **Användare (Users)**
   - List all users in org
   - User roles, last login, activity level
   - Can deactivate user
   - Can reset password (send email)

3. **Användning (Usage)**
   - Weekly time entries (chart)
   - Feature adoption (which features used)
   - Storage breakdown (receipts, photos, etc.)
   - API usage

4. **Betalningar (Payments)**
   - Payment history
   - Invoices
   - Payment method
   - Next billing date
   - Overdue invoices (if any)

5. **Support (Support History)**
   - Support tickets (if integrated)
   - Login as user (impersonate with audit log)
   - Activity log for this org
   - Notes from support team

**Actions:**
- Edit organization details
- Change plan (upgrade/downgrade)
- Suspend organization (disables access)
- Delete organization (soft delete with grace period)
- Send email to org owner
- Login as user (with consent/audit trail)

**API Routes:**
```typescript
GET /api/super-admin/organizations
GET /api/super-admin/organizations/[id]
PATCH /api/super-admin/organizations/[id] // Edit org
POST /api/super-admin/organizations/[id]/suspend
POST /api/super-admin/organizations/[id]/delete
POST /api/super-admin/organizations/[id]/impersonate
```

---

### 3. Användare (All Users) ⭐ **Phase 2.2**

**Path:** `/super-admin/users`

**Features:**

#### Users Table
- All users across all organizations
- Columns: Name, Email, Organization, Role, Last login, Status
- Search by name/email/org
- Filter by role, status, organization
- Click user → view details

#### User Detail
- User profile
- Organization membership
- Activity summary (logins, entries created, etc.)
- Can suspend user account
- Can reset password

**Use Cases:**
- Find specific user across all orgs
- Identify inactive users
- Support: "User can't log in" → lookup → reset password

---

### 4. Betalningar (Billing & Payments) ⭐ **Phase 2.1 - Critical**

**Path:** `/super-admin/billing`

**Database Schema (New):**
```sql
-- Pricing plans
CREATE TABLE pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Free', 'Basic', 'Pro', 'Enterprise'
  price_sek DECIMAL(10,2), -- Monthly price in SEK
  max_users INTEGER,
  max_storage_gb INTEGER,
  features JSONB, -- { "offline": true, "exports": true, ... }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organization subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES pricing_plans(id),
  status TEXT CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'suspended')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_sek DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SEK',
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT, -- 'card', 'invoice', 'swish'
  invoice_number TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Features:**

#### Revenue Dashboard
- **MRR Chart:** Monthly recurring revenue over time
- **Revenue by Plan:** Breakdown (Free 0%, Basic 40%, Pro 50%, Enterprise 10%)
- **Payment Status:** Paid vs overdue vs failed
- **Churn Rate:** Canceled subscriptions

#### Subscriptions Table
- Organization name
- Plan
- Status (Active/Trial/Past Due/Canceled)
- MRR contribution
- Next billing date
- Actions: View invoices, change plan, cancel

#### Overdue Payments
- Organizations with failed/overdue payments
- Amount owed
- Days overdue
- Quick action: Send reminder, suspend account

#### Invoices
- All invoices
- Filter by status (paid/unpaid/overdue)
- Download PDF
- Send reminder email

**API Routes:**
```typescript
GET /api/super-admin/billing/revenue
GET /api/super-admin/billing/subscriptions
GET /api/super-admin/billing/payments
POST /api/super-admin/billing/subscriptions/[id]/cancel
POST /api/super-admin/billing/invoices/[id]/send-reminder
```

---

### 5. Användning (Usage Analytics) ⭐ **Phase 2.2**

**Path:** `/super-admin/analytics`

**Features:**

#### Feature Adoption
- Which features are most used? (Time tracking, Materials, ÄTA, etc.)
- Adoption rate per feature
- Feature usage by plan tier

#### User Engagement
- DAU/WAU/MAU trends
- Average session duration
- Login frequency
- Feature engagement funnel

#### Content Analytics
- Total time entries created (all orgs)
- Total materials registered
- Total ÄTA created
- Total CSV exports downloaded

#### Performance Metrics
- Page load times (by page)
- API response times (by endpoint)
- Error rates
- Offline sync success rate

#### Cohort Analysis
- Retention by signup date cohort
- Churn prediction (organizations at risk)

**Charts:**
- Feature usage over time (stacked area)
- User growth cohorts (line chart)
- Funnel: Signup → First project → First time entry → First approval
- Heatmap: Feature usage by day of week

**API Routes:**
```typescript
GET /api/super-admin/analytics/features
GET /api/super-admin/analytics/engagement
GET /api/super-admin/analytics/content
GET /api/super-admin/analytics/performance
```

---

### 6. Support (Customer Support Tools) ⭐ **Phase 2.2**

**Path:** `/super-admin/support`

**Features:**

#### Quick Lookup
- Search bar: "Find user or organization"
- Autocomplete results
- Click → Go to org/user detail

#### Impersonate User
- "Login as user" button (with consent/audit)
- See the app exactly as user sees it
- Troubleshoot issues in real-time
- Banner: "You are viewing as [User Name]" with "Exit" button
- All actions logged in audit trail

#### Common Support Actions
- Reset user password
- Resend verification email
- Unlock suspended account
- Extend trial period
- Grant storage quota increase
- Clear offline sync queue (if stuck)

#### Support Tickets (Future integration)
- Zendesk/Intercom integration
- Show tickets per organization
- Link tickets to users

#### System Status
- Show current system health
- Recent errors (last 100)
- Background job status
- Database query performance

**API Routes:**
```typescript
POST /api/super-admin/support/impersonate
POST /api/super-admin/support/reset-password
POST /api/super-admin/support/clear-sync-queue
GET /api/super-admin/support/system-status
```

---

### 7. Systeminställningar (System Config) **Phase 2.3**

**Path:** `/super-admin/system`

**Features:**

#### Feature Flags
- Toggle features on/off globally
- A/B testing configurations
- Beta features per organization

#### Maintenance Mode
- Enable/disable site-wide maintenance
- Custom maintenance message
- Scheduled maintenance window

#### Email Templates
- Edit transactional emails (welcome, reset password, etc.)
- Preview before sending

#### Storage Limits
- Set default storage limits per plan
- Monitor global storage usage

#### Rate Limiting
- Configure API rate limits
- View current limits per endpoint

---

### 8. Systemlogg (System Audit Log) **Phase 2.3**

**Path:** `/super-admin/logs`

**Features:**

#### Super Admin Actions Log
- All actions taken by super admins
- Who did what, when
- Impersonation sessions logged
- Organization suspension/deletion logged

#### System Events
- User signups
- Payment failures
- Errors (grouped by type)
- Performance alerts

**Filters:**
- By super admin user
- By action type
- By date range
- By organization (filter to specific org)

---

## 🗄️ Database Changes

### New Tables

```sql
-- Super admin users
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Pricing plans (see Billing section above)
CREATE TABLE pricing_plans (...);
CREATE TABLE subscriptions (...);
CREATE TABLE payments (...);

-- Super admin audit log
CREATE TABLE super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID REFERENCES super_admins(id),
  action TEXT NOT NULL, -- 'impersonate', 'suspend_org', 'delete_org', etc.
  target_type TEXT, -- 'organization', 'user'
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update organizations table
ALTER TABLE organizations ADD COLUMN plan_id UUID REFERENCES pricing_plans(id);
ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'deleted'));
ALTER TABLE organizations ADD COLUMN storage_used_bytes BIGINT DEFAULT 0;
ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
```

---

## 🔐 Security & Permissions

### Access Control
- **Super Admin Check:** Middleware verifies user in `super_admins` table
- **RLS Bypass:** Super admin routes bypass org-level RLS (server-side only)
- **Audit Logging:** Every super admin action logged
- **Impersonation:** Requires explicit consent + audit trail
- **2FA Required:** Super admins must enable 2FA

### Data Privacy
- GDPR compliant data viewing
- Option to mask sensitive data (phone numbers, addresses)
- Export user data on request
- Delete user data on request (GDPR right to be forgotten)

---

## 📊 Success Metrics

### Business Metrics
- MRR growth: Track month-over-month
- Churn rate: < 5% monthly
- Customer lifetime value (CLTV): > 50,000 SEK
- Support ticket resolution time: < 24h average

### Platform Metrics
- Number of organizations: Track growth
- Total users: Track growth
- Feature adoption rates: % of orgs using each feature
- API uptime: > 99.9%

---

## 🚀 Implementation Plan

### Phase 2.1 (Priority: Critical) - 2-3 weeks
- [ ] Database schema (pricing_plans, subscriptions, payments, super_admins)
- [ ] Super admin authentication & middleware
- [ ] Dashboard overview (revenue, growth, usage, health)
- [ ] Organizations list & detail view
- [ ] Billing dashboard (MRR, subscriptions, payments)
- [ ] Basic audit logging

### Phase 2.2 (Priority: High) - 2 weeks
- [ ] All users view
- [ ] Usage analytics (features, engagement)
- [ ] Support tools (impersonate, quick actions)
- [ ] Enhanced organization management

### Phase 2.3 (Priority: Medium) - 1 week
- [ ] System configuration (feature flags, maintenance mode)
- [ ] System audit log viewer
- [ ] Email template editor

### Future Enhancements
- [ ] Stripe/Klarna payment integration
- [ ] Zendesk/Intercom support integration
- [ ] Advanced analytics (cohorts, funnels, predictions)
- [ ] Automated churn prevention (email campaigns)
- [ ] A/B testing framework

---

## 💰 Cost Estimate

**Development Time:** 5-6 weeks total  
**Complexity:** Medium-High  
**Dependencies:** None (can build independently)

---

## 📝 Decisions Made

1. **Payment Processing:** ✅ Stripe
2. **Pricing Plans:** ✅ Defined (see below)
3. **Trial Duration:** ✅ 14 days
4. **Storage Limits:** ✅ 2GB / 25GB / 100GB per plan
5. **User Limits:** ✅ 5 / 25 / 100 per plan
6. **Impersonation:** Allow for support reasons (with audit trail)
7. **Data Retention:** 30 days grace period for deleted organizations

---

## 💰 Pricing Plan Specification

> **Note:** All prices exclude 25% Swedish VAT (moms). Customer pays listed price + VAT.  
> **Currency:** SEK (Swedish Kronor). EUR support planned for future expansion.

### Free Trial (14 Days)
- **Price:** 0 SEK
- **Duration:** 14 days (no credit card required)
- **Users:** Up to 5
- **Storage:** 2 GB
- **Features:**
  - All core features enabled
  - Time tracking (timer + manual + crew)
  - Materials, expenses, mileage
  - ÄTA, diary, checklists
  - Approvals workflow
  - CSV exports
  - Offline mode
  - PWA installation
- **Limitations:**
  - Watermark on exports: "Trial - Upgrade to remove"
  - Must convert to paid plan after 14 days or account suspended
- **After Trial:** Auto-converts to Basic plan (if payment method added) or suspended

---

### Basic Plan
**Monthly Billing:**
- **Price:** 199 SEK/month (+ 25% VAT = 248.75 SEK total)
- **Annual Equivalent:** 2,388 SEK/year + VAT

**Annual Billing (10% discount):**
- **Price:** 2,149 SEK/year (+ 25% VAT = 2,686.25 SEK total)
- **Monthly Equivalent:** 179 SEK/month + VAT
- **Savings:** 239 SEK/year

**Limits:**
- **Users:** Up to 5
- **Storage:** 2 GB

**Features:**
- All core features (same as trial)
- No watermarks on exports
- Email support (< 48h response)
- 99.5% uptime SLA

**Best For:** Small teams, 1-2 projects, solo contractors

---

### Pro Plan ⭐ Most Popular
**Monthly Billing:**
- **Price:** 299 SEK/month (+ 25% VAT = 373.75 SEK total)
- **Annual Equivalent:** 3,588 SEK/year + VAT

**Annual Billing (10% discount):**
- **Price:** 3,229 SEK/year (+ 25% VAT = 4,036.25 SEK total)
- **Monthly Equivalent:** 269 SEK/month + VAT
- **Savings:** 359 SEK/year

**Limits:**
- **Users:** Up to 25
- **Storage:** 25 GB

**Features:**
- All Basic features
- Priority email support (< 12h response)
- Advanced analytics & reporting
- Custom checklist templates
- Bulk operations
- API access (future)
- 99.9% uptime SLA

**Best For:** Growing companies, 3-10 projects, teams of 5-25

---

### Enterprise Plan
**Custom Pricing:**
- **Starting:** 999 SEK/month (+ 25% VAT)
- **Actual:** Negotiated based on needs

**Limits:**
- **Users:** Up to 100 (or unlimited)
- **Storage:** 100 GB (or unlimited)
- **Custom:** Volume discounts available

**Features:**
- All Pro features
- Dedicated account manager
- Phone support (< 4h response)
- Custom integrations (Fortnox, Visma, etc.)
- Custom training & onboarding
- 99.95% uptime SLA
- Single Sign-On (SSO)
- Custom SLA contracts
- White-label options
- Priority feature requests

**Best For:** Large construction companies, 10+ projects, enterprise deployments

---

### Add-ons (Available on all paid plans)
- **Extra Users:** +50 SEK/user/month + VAT
- **Extra Storage:** +20 SEK/10GB/month + VAT
- **SMS Notifications:** +100 SEK/month + VAT (500 SMS included)
- **Advanced Reporting Module:** +150 SEK/month + VAT
- **Fortnox Integration:** +200 SEK/month + VAT (Enterprise only)
- **Visma Integration:** +200 SEK/month + VAT (Enterprise only)

---

### Annual Plan Benefits
- **10% discount** on all annual subscriptions
- **Lock in current pricing** (no price increases during contract)
- **Priority support** (faster response times)
- **Flexible payment terms** (invoice available for Enterprise)
- **Easy upgrades** (prorate remaining balance)

---

## 💳 Stripe Integration Plan

### Payment Flow
1. User signs up → 14-day free trial starts
2. During trial: Collect payment info (Stripe Checkout)
3. Day 14: Auto-charge first payment
4. If payment fails: Grace period (7 days) → Suspend if not resolved
5. Monthly recurring billing via Stripe Subscriptions

### Stripe Products
- 3 main products: Basic, Pro, Enterprise
- Webhook handlers for: `payment_intent.succeeded`, `payment_intent.failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Invoice generation via Stripe (Swedish locale)

### Implementation (EPIC 17 - Future)
- Install `@stripe/stripe-js` and `stripe` npm packages
- Create Stripe products & prices in dashboard
- Implement webhook endpoint: `/api/webhooks/stripe`
- Sync Stripe subscription status with local `subscriptions` table
- Handle plan upgrades/downgrades (prorate)

---

## ✅ All Decisions Finalized

1. **Impersonation:** ✅ Allowed for support (with audit log)
2. **Data Retention:** ✅ 30 days for soft-deleted orgs
3. **VAT Handling:** ✅ Prices EXCLUDE 25% Swedish VAT (added at checkout)
4. **Currency:** ✅ SEK only (EUR support planned for future)
5. **Billing Cycle:** ✅ Monthly + Annual (10% discount on annual)
6. **Free Plan:** ✅ Trial only (no permanent free tier)

---

## ✅ Acceptance Criteria

- [ ] Super admins can log in to `/super-admin`
- [ ] Dashboard shows real-time MRR, growth, and usage metrics
- [ ] Can view list of all organizations with search/filter
- [ ] Can drill into any organization to see details, users, usage, payments
- [ ] Can suspend/delete organizations
- [ ] Can impersonate users (with audit log)
- [ ] Billing dashboard shows revenue trends and overdue payments
- [ ] Usage analytics show feature adoption and engagement
- [ ] All super admin actions logged in audit trail
- [ ] Mobile-responsive (though primarily desktop tool)

---

**Next Steps:** Review open questions, finalize pricing structure, then proceed with EPIC implementation.

