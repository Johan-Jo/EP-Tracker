# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for EP Tracker's billing system.

---

## 📋 Prerequisites

- Stripe account ([sign up here](https://dashboard.stripe.com/register))
- Access to EP Tracker Super Admin panel
- Database migrations applied (see migration file)

---

## 🚀 Step-by-Step Setup

### Step 1: Database Migration

1. Open Supabase SQL Editor
2. Run the PowerShell script to copy migration:
   ```powershell
   .\scripts\copy-stripe-migration.ps1
   ```
3. Paste and execute the SQL in Supabase
4. Verify all tables and columns were created

---

### Step 2: Get Stripe API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)
4. Add to `.env.local`:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

### Step 3: Create Products & Prices

#### Create Products

1. Go to [Stripe Dashboard → Product Catalog](https://dashboard.stripe.com/test/products)
2. Create 3 products:

**Basic Plan:**
- Name: `EP Tracker - Basic`
- Description: `Up to 5 users, 2 GB storage`

**Pro Plan:**
- Name: `EP Tracker - Pro`
- Description: `Up to 25 users, 25 GB storage`

**Enterprise Plan:**
- Name: `EP Tracker - Enterprise`
- Description: `Up to 100 users, 100 GB storage`

#### Create Prices

For each product, create **2 prices** (monthly & annual):

**Basic:**
- Monthly: 199 SEK/month
- Annual: 2,149 SEK/year (save 10%)

**Pro:**
- Monthly: 299 SEK/month
- Annual: 3,229 SEK/year (save 10%)

**Enterprise:**
- Contact for pricing (or set custom amount)

#### Get Price IDs

After creating prices, copy each Price ID (starts with `price_`) and add to `.env.local`:

```env
STRIPE_PRICE_ID_BASIC_MONTHLY=price_...
STRIPE_PRICE_ID_BASIC_ANNUAL=price_...
STRIPE_PRICE_ID_PRO_MONTHLY=price_...
STRIPE_PRICE_ID_PRO_ANNUAL=price_...
STRIPE_PRICE_ID_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ID_ENTERPRISE_ANNUAL=price_...
```

---

### Step 4: Update Pricing Plans Table

Run this SQL in Supabase to link Stripe Price IDs to your pricing plans:

```sql
-- Update Basic Monthly
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_BASIC_MONTHLY_ID'
WHERE name = 'Basic' AND billing_cycle = 'monthly';

-- Update Basic Annual
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_BASIC_ANNUAL_ID'
WHERE name = 'Basic' AND billing_cycle = 'annual';

-- Update Pro Monthly
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_PRO_MONTHLY_ID'
WHERE name = 'Pro' AND billing_cycle = 'monthly';

-- Update Pro Annual
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_PRO_ANNUAL_ID'
WHERE name = 'Pro' AND billing_cycle = 'annual';

-- Update Enterprise Monthly
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_ENTERPRISE_MONTHLY_ID'
WHERE name = 'Enterprise' AND billing_cycle = 'monthly';

-- Update Enterprise Annual
UPDATE pricing_plans
SET stripe_price_id = 'price_YOUR_ENTERPRISE_ANNUAL_ID'
WHERE name = 'Enterprise' AND billing_cycle = 'annual';
```

---

### Step 5: Set Up Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   - Development: `http://localhost:3001/api/stripe/webhooks`
   - Production: `https://yourdomain.com/api/stripe/webhooks`
4. Select events to listen to:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **"Add endpoint"**
6. Copy the **Signing Secret** (starts with `whsec_`)
7. Add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### Step 6: Test Webhook (Local Development)

For local development, use Stripe CLI to forward webhooks:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login:
   ```bash
   stripe login
   ```
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhooks
   ```
4. The CLI will give you a webhook secret starting with `whsec_` - use this in `.env.local`

---

### Step 7: Enable Automatic Tax (Optional)

1. Go to [Stripe Dashboard → Settings → Tax](https://dashboard.stripe.com/settings/tax)
2. Enable **Automatic Tax**
3. Add Sweden (SE) as a location
4. Set VAT rate to 25%

This ensures Swedish VAT is automatically calculated and added at checkout.

---

## 🧪 Testing

### Test Cards

Stripe provides test cards for various scenarios:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any valid ZIP

**Failure:**
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any valid ZIP

**Requires Authentication:**
- Card: `4000 0025 0000 3155`
- Follow the 3D Secure prompt

### Test Checkout Flow

1. Log in as Super Admin
2. Go to an organization
3. Click "Manage Billing"
4. Complete checkout with test card
5. Verify:
   - Subscription created in Stripe
   - Webhook event received
   - Database updated with Stripe IDs
   - Organization status changed to "active"

---

## 📊 Monitor Webhooks

View webhook logs in Stripe Dashboard:
1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click on your endpoint
3. See all received events and responses

You can also check the `stripe_webhook_events` table in your database:

```sql
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚀 Going to Production

### Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test** to **Live** mode (top right)
2. Get **Live API Keys** from [API Keys page](https://dashboard.stripe.com/apikeys)
3. Update `.env.production.local` with live keys:
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```
4. Create **Live Products & Prices** (same as test, but in live mode)
5. Update live price IDs in environment
6. Create **Live Webhook Endpoint** pointing to production URL
7. Update production environment with live webhook secret

### Production Checklist

- [ ] Live API keys configured
- [ ] Live products created
- [ ] Live prices created
- [ ] Database updated with live price IDs
- [ ] Live webhook endpoint created
- [ ] Webhook secret configured in production
- [ ] Automatic tax enabled
- [ ] Test checkout in production with real card
- [ ] Monitor webhook logs for 24 hours

---

## ❗ Important Notes

### Security

- **Never commit API keys to version control**
- Use environment variables for all sensitive data
- Webhook signature verification is critical
- Service role key should only be used server-side

### VAT Handling

- All displayed prices **exclude** VAT
- Stripe automatically adds 25% Swedish VAT at checkout
- Customers in Sweden pay displayed price + 25%
- Customers outside EU pay displayed price only

### Trial Period

- Organizations get 14-day trial upon signup
- After trial, Stripe subscription is created
- If payment fails, subscription enters "past_due" status
- Organization is suspended after grace period

### Subscription Lifecycle

1. **Trial** → Free for 14 days
2. **Active** → Payment successful, full access
3. **Past Due** → Payment failed, grace period
4. **Suspended** → Grace period expired, limited access
5. **Cancelled** → User cancelled, access until period end

---

## 🆘 Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL is correct
2. Verify endpoint is publicly accessible (use ngrok for local)
3. Check signature secret matches
4. Look at webhook logs in Stripe Dashboard

### Checkout Session Fails

1. Check Price IDs are correct
2. Verify customer ID is valid
3. Check Stripe API keys are correct
4. Look at browser console for errors

### Database Not Updating

1. Check webhook events table for errors
2. Verify RLS policies allow service role
3. Check Supabase logs
4. Ensure migrations were applied

---

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Test Cards](https://stripe.com/docs/testing)

---

**Setup Complete!** 🎉

You're now ready to accept payments with Stripe. If you encounter any issues, check the troubleshooting section or Stripe Dashboard logs.

