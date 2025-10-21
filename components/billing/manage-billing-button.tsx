'use client';

import { useState } from 'react';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ManageBillingButtonProps {
  organizationId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export function ManageBillingButton({
  organizationId,
  variant = 'outline',
  size = 'default',
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
        }),
      });

      const data = await response.json();

      if (data.success && data.portal_url) {
        // Redirect to Stripe customer portal
        window.location.href = data.portal_url;
      } else {
        console.error('Failed to create portal session:', data.error);
        alert(`Error: ${data.error || 'Failed to open billing portal'}`);
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Manage Billing
      <ExternalLink className="ml-2 h-3 w-3" />
    </Button>
  );
}

