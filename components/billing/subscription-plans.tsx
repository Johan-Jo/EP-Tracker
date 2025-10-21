'use client';

import { useState } from 'react';
import { Check, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  price_sek: number;
  billing_cycle: 'monthly' | 'annual';
  max_users: number;
  max_storage_gb: number;
  features: string[];
  is_active: boolean;
  is_popular?: boolean;
}

interface SubscriptionPlansProps {
  plans: PricingPlan[];
  organizationId: string;
  currentPlanId?: string;
  onCheckout?: (planId: string, billingCycle: 'monthly' | 'annual') => Promise<void>;
}

export function SubscriptionPlans({
  plans,
  organizationId,
  currentPlanId,
  onCheckout,
}: SubscriptionPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  // Filter plans by billing cycle
  const filteredPlans = plans.filter(p => p.billing_cycle === billingCycle && p.is_active);

  // Sort plans by price
  const sortedPlans = [...filteredPlans].sort((a, b) => a.price_sek - b.price_sek);

  const handleCheckout = async (planId: string) => {
    if (!onCheckout) return;

    setLoadingPlanId(planId);
    try {
      await onCheckout(planId, billingCycle);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn(
          "text-sm font-medium",
          billingCycle === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
        )}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            billingCycle === 'annual' ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-700'
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <span className={cn(
          "text-sm font-medium",
          billingCycle === 'annual' ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
        )}>
          Annual
          <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Save 10%
          </Badge>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {sortedPlans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isPopular = plan.name === 'Pro';

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-lg border p-6 shadow-sm transition-all",
                isPopular && "border-orange-500 shadow-orange-100 dark:shadow-orange-900/20",
                !isPopular && "border-gray-200 dark:border-gray-800",
                isCurrentPlan && "ring-2 ring-orange-500"
              )}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white">
                    <Zap className="mr-1 h-3 w-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white">Current Plan</Badge>
                </div>
              )}

              {/* Plan Name */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price_sek.toLocaleString('sv-SE')}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">SEK</span>
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  per {billingCycle === 'monthly' ? 'month' : 'year'}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Excl. VAT (25% added at checkout)
                </div>
              </div>

              {/* Limits */}
              <div className="mb-6 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Users</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Up to {plan.max_users}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Storage</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {plan.max_storage_gb} GB
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="mb-6 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleCheckout(plan.id)}
                disabled={isCurrentPlan || loadingPlanId === plan.id}
                className={cn(
                  "w-full",
                  isPopular && !isCurrentPlan && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {loadingPlanId === plan.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

