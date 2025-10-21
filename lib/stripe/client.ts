import Stripe from 'stripe';

/**
 * Stripe Client
 * 
 * Initializes the Stripe SDK with the secret key.
 * Use this for server-side operations only.
 */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
  appInfo: {
    name: 'EP Tracker',
    version: '2.0.0',
  },
});

/**
 * Stripe Price ID Mappings
 * 
 * Maps our internal plan names to Stripe Price IDs.
 * These should match the prices created in your Stripe Dashboard.
 */
export const STRIPE_PRICE_MAP = {
  basic_monthly: process.env.STRIPE_PRICE_ID_BASIC_MONTHLY || '',
  basic_annual: process.env.STRIPE_PRICE_ID_BASIC_ANNUAL || '',
  pro_monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
  pro_annual: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '',
  enterprise_monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || '',
  enterprise_annual: process.env.STRIPE_PRICE_ID_ENTERPRISE_ANNUAL || '',
} as const;

/**
 * Get Stripe Price ID by Plan
 */
export function getStripePriceId(planName: string, billingCycle: 'monthly' | 'annual'): string | null {
  const key = `${planName.toLowerCase()}_${billingCycle}` as keyof typeof STRIPE_PRICE_MAP;
  return STRIPE_PRICE_MAP[key] || null;
}

/**
 * Validate Stripe Price ID exists
 */
export function validatePriceId(priceId: string): boolean {
  return Object.values(STRIPE_PRICE_MAP).includes(priceId);
}

