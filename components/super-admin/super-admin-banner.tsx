'use client';

import { ShieldAlert, X, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Super Admin Banner
 * 
 * Displays a prominent banner at the top of the page when in super admin mode.
 * Important for security awareness - users should know they have elevated privileges.
 */

interface SuperAdminBannerProps {
  className?: string;
  showExitButton?: boolean;
}

export function SuperAdminBanner({ className, showExitButton = true }: SuperAdminBannerProps) {
  const router = useRouter();

  const handleExitSuperAdmin = () => {
    // Navigate back to regular dashboard
    router.push('/dashboard');
  };

  return (
    <div 
      className={cn(
        'flex items-center justify-between gap-4 border-b border-orange-600 bg-orange-500 px-4 py-2.5 text-white',
        className
      )}
      role="banner"
      aria-label="Super Admin Mode Active"
    >
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-semibold">Super Admin Mode Active</span>
          <span className="text-xs opacity-90">
            You have elevated privileges to manage the entire platform
          </span>
        </div>
      </div>

      {showExitButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitSuperAdmin}
          className="flex-shrink-0 text-white hover:bg-orange-600 hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Exit Super Admin
        </Button>
      )}
    </div>
  );
}

/**
 * Compact variant for mobile or secondary pages
 */
export function SuperAdminBannerCompact({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'flex items-center gap-2 border-b border-orange-600 bg-orange-500 px-3 py-1.5 text-white',
        className
      )}
      role="banner"
    >
      <ShieldAlert className="h-4 w-4" />
      <span className="text-xs font-medium">Super Admin</span>
    </div>
  );
}

