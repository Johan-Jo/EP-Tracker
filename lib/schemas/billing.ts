import { z } from 'zod';

/**
 * Billing Validation Schemas
 * 
 * Schemas for pricing plans, subscriptions, and payments.
 * Used for form validation and API request validation.
 */

// =====================================================
// Pricing Plan Schema
// =====================================================

export const pricingPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100),
  price_sek: z.number().min(0, 'Price must be positive'),
  billing_cycle: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'Billing cycle must be monthly or annual' }),
  }),
  max_users: z.number().int().min(1, 'Must allow at least 1 user'),
  max_storage_gb: z.number().int().min(1, 'Must allow at least 1 GB'),
  features: z.record(z.any()).optional(),
  is_active: z.boolean().default(true),
});

export type PricingPlan = z.infer<typeof pricingPlanSchema> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// Subscription Schema
// =====================================================

export const subscriptionStatusEnum = z.enum([
  'trial',
  'active',
  'past_due',
  'canceled',
  'suspended',
]);

export const subscriptionSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  plan_id: z.string().uuid('Invalid plan ID'),
  status: subscriptionStatusEnum,
  trial_ends_at: z.string().datetime().nullable().optional(),
  current_period_start: z.string().datetime(),
  current_period_end: z.string().datetime(),
  cancel_at_period_end: z.boolean().default(false),
  canceled_at: z.string().datetime().nullable().optional(),
});

export type Subscription = z.infer<typeof subscriptionSchema> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// Payment Schema
// =====================================================

export const paymentStatusEnum = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const paymentMethodEnum = z.enum([
  'stripe',
  'bank_transfer',
  'invoice',
  'other',
]);

export const paymentSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  subscription_id: z.string().uuid('Invalid subscription ID').nullable().optional(),
  amount_sek: z.number().min(0, 'Amount must be positive'),
  status: paymentStatusEnum,
  payment_method: paymentMethodEnum,
  invoice_number: z.string().max(100).nullable().optional(),
  stripe_payment_id: z.string().max(200).nullable().optional(),
  paid_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type Payment = z.infer<typeof paymentSchema> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// =====================================================
// API Request Schemas
// =====================================================

// Create/Update Pricing Plan
export const createPricingPlanSchema = pricingPlanSchema;

export const updatePricingPlanSchema = pricingPlanSchema.partial();

// Assign Plan to Organization
export const assignPlanSchema = z.object({
  organization_id: z.string().uuid('Invalid organization ID'),
  plan_id: z.string().uuid('Invalid plan ID'),
  start_trial: z.boolean().default(false),
  trial_days: z.number().int().min(1).max(90).optional(),
});

// Change Subscription Plan
export const changePlanSchema = z.object({
  new_plan_id: z.string().uuid('Invalid plan ID'),
  immediate: z.boolean().default(false), // If true, change immediately; if false, change at period end
});

// Cancel Subscription
export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

// Record Payment
export const recordPaymentSchema = paymentSchema;

// Update Payment Status
export const updatePaymentSchema = z.object({
  status: paymentStatusEnum,
  paid_at: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// =====================================================
// Helper Types
// =====================================================

export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

// Subscription with related data
export interface SubscriptionWithDetails extends Subscription {
  organization?: {
    id: string;
    name: string;
  };
  plan?: {
    id: string;
    name: string;
    price_sek: number;
    billing_cycle: 'monthly' | 'annual';
  };
}

// Payment with related data
export interface PaymentWithDetails extends Payment {
  organization?: {
    id: string;
    name: string;
  };
  subscription?: {
    id: string;
    status: string;
  };
}

