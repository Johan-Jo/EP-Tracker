# EPIC 15: Stripe Integration
**Phase:** 2 - Super Admin Panel  
**Status:** 🚧 In Progress  
**Started:** 2025-10-20

---

## 🎯 Goal
Integrate Stripe payment processing to enable real subscription billing, checkout flows, and automated payment handling for the Super Admin Panel.

---

## 📋 Requirements

### Core Features
1. **Stripe Checkout** - Create hosted checkout sessions for subscription signup
2. **Webhook Handlers** - Process Stripe events for subscription lifecycle
3. **Payment Tracking** - Sync Stripe payments with local database
4. **Subscription Sync** - Keep local subscription status in sync with Stripe
5. **Customer Portal** - Link to Stripe customer portal for self-service

### Stripe Events to Handle
- `checkout.session.completed` - New subscription created
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed
- `customer.subscription.updated` - Plan change, renewal
- `customer.subscription.deleted` - Subscription cancelled

---

## 🏗️ Implementation Plan

### Phase 1: Setup & Configuration ✅
- [ ] Install Stripe SDK packages
- [ ] Add Stripe API keys to environment variables
- [ ] Create Stripe products and prices in dashboard
- [ ] Set up webhook endpoint in Stripe dashboard

### Phase 2: Checkout Flow 🚧
- [ ] Create checkout session API endpoint
- [ ] Build subscription selection UI
- [ ] Implement checkout redirect
- [ ] Handle success/cancel redirects

### Phase 3: Webhook Handlers 🔜
- [ ] Create webhook verification utility
- [ ] Implement event handlers for each event type
- [ ] Update local database on events
- [ ] Add error handling and logging

### Phase 4: Customer Portal 🔜
- [ ] Create customer portal session API
- [ ] Add "Manage Billing" button for customers
- [ ] Link to Stripe-hosted portal

### Phase 5: Admin Features 🔜
- [ ] View Stripe customer details in admin panel
- [ ] Manually trigger invoice creation
- [ ] Manually refund payments
- [ ] View payment history

---

## 📁 Files to Create/Modify

### New Files
```
lib/
├── stripe/
│   ├── client.ts                    # Stripe client initialization
│   ├── checkout.ts                  # Checkout session helpers
│   ├── webhooks.ts                  # Webhook event handlers
│   ├── customers.ts                 # Customer management
│   └── subscriptions.ts             # Subscription management

app/api/
├── stripe/
│   ├── create-checkout-session/
│   │   └── route.ts                 # Create Stripe checkout
│   ├── create-portal-session/
│   │   └── route.ts                 # Create customer portal
│   └── webhooks/
│       └── route.ts                 # Handle Stripe webhooks

components/
├── billing/
│   ├── subscription-plans.tsx       # Plan selection UI
│   ├── checkout-button.tsx          # Checkout CTA button
│   └── manage-billing-button.tsx    # Portal access button
```

### Modified Files
```
- .env.local (add Stripe keys)
- package.json (add stripe packages)
- app/(super-admin)/super-admin/billing/subscriptions/page.tsx
- app/(super-admin)/super-admin/organizations/[id]/page.tsx
```

---

## 🔐 Environment Variables

```env
# Stripe API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (from Stripe dashboard)
STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
STRIPE_PRICE_ID_BASIC_ANNUAL=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_...
```

---

## 🎨 UI Components

### 1. Subscription Plans Component
- Display all pricing plans
- Highlight current plan
- Show monthly/annual toggle
- CTA buttons for each plan

### 2. Checkout Button
- Triggers Stripe checkout
- Shows loading state
- Handles errors

### 3. Manage Billing Button
- Opens Stripe customer portal
- For existing customers only

---

## 📊 Database Changes

No new tables needed! We already have:
- `subscriptions` - Store Stripe subscription IDs
- `payment_transactions` - Track all payments
- `pricing_plans` - Map to Stripe price IDs

**Add columns:**
```sql
ALTER TABLE organizations ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE subscriptions ADD COLUMN stripe_price_id VARCHAR(255);
ALTER TABLE payment_transactions ADD COLUMN stripe_payment_intent_id VARCHAR(255);
```

---

## 🧪 Testing Strategy

### Unit Tests
- Webhook signature verification
- Event handler logic
- Checkout session creation

### Integration Tests
- Full checkout flow (test mode)
- Webhook event processing
- Subscription lifecycle

### Manual Tests
1. Create checkout session
2. Complete test payment
3. Verify webhook received
4. Check database updated
5. Test customer portal

---

## 🚀 Deployment Checklist

- [ ] Set production Stripe keys
- [ ] Configure webhook endpoint in Stripe
- [ ] Test webhook in production
- [ ] Create real products and prices
- [ ] Update price IDs in env vars
- [ ] Test full checkout flow
- [ ] Monitor webhook logs

---

## 📝 Notes

### Pricing Plan Mapping
```typescript
// Map local plans to Stripe price IDs
const STRIPE_PRICE_MAP = {
  'basic_monthly': process.env.STRIPE_PRICE_ID_BASIC_MONTHLY,
  'basic_annual': process.env.STRIPE_PRICE_ID_BASIC_ANNUAL,
  'pro_monthly': process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  'pro_annual': process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
  'enterprise_monthly': process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
  'enterprise_annual': process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL,
};
```

### VAT Handling
Stripe automatically calculates and adds Swedish VAT (25%) when customer location is detected as Sweden. We exclude VAT from displayed prices and let Stripe handle it.

---

## 🎯 Success Criteria

- [ ] Can create Stripe checkout session from admin panel
- [ ] Checkout redirects to Stripe and completes successfully
- [ ] Webhooks process events and update database
- [ ] Subscription status syncs between Stripe and database
- [ ] Payment failures trigger appropriate actions
- [ ] Customer portal accessible for existing customers
- [ ] Admin can view Stripe data in panel

---

**Status:** Ready to begin implementation 🚀

