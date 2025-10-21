'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Users, 
  BarChart3, 
  Settings, 
  HeadphonesIcon,
  FileText,
  Mail,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Super Admin Navigation
 * 
 * Sidebar navigation for super admin panel.
 * Different from regular org navigation - focuses on platform management.
 */

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/super-admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Organizations',
    href: '/super-admin/organizations',
    icon: Building2,
  },
  {
    name: 'Billing',
    href: '/super-admin/billing',
    icon: CreditCard,
    subItems: [
      { name: 'Overview', href: '/super-admin/billing' },
      { name: 'Plans', href: '/super-admin/billing/plans' },
      { name: 'Subscriptions', href: '/super-admin/billing/subscriptions' },
      { name: 'Payments', href: '/super-admin/billing/payments' },
    ],
  },
  {
    name: 'Users',
    href: '/super-admin/users',
    icon: Users,
  },
  {
    name: 'Analytics',
    href: '/super-admin/analytics',
    icon: BarChart3,
  },
  {
    name: 'Support',
    href: '/super-admin/support',
    icon: HeadphonesIcon,
  },
  {
    name: 'Audit Logs',
    href: '/super-admin/logs',
    icon: FileText,
  },
  {
    name: 'E-postloggar',
    href: '/super-admin/email-logs',
    icon: Mail,
  },
  {
    name: 'E-postmallar',
    href: '/super-admin/email-templates',
    icon: Palette,
  },
  {
    name: 'System',
    href: '/super-admin/system',
    icon: Settings,
  },
];

export function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 px-2">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        const Icon = item.icon;
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const showSubItems = hasSubItems && isActive;
        
        return (
          <div key={item.name}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/20 dark:text-orange-100'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )}
            >
              <Icon className={cn(
                'h-5 w-5 flex-shrink-0',
                isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 group-hover:text-gray-600'
              )} />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900 dark:bg-orange-900/30 dark:text-orange-400">
                  {item.badge}
                </span>
              )}
            </Link>
            
            {/* Sub-items */}
            {showSubItems && (
              <div className="ml-8 mt-1 space-y-1">
                {item.subItems!.map((subItem) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-sm transition-colors',
                        isSubActive
                          ? 'bg-orange-50 text-orange-900 font-medium dark:bg-orange-900/10 dark:text-orange-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200'
                      )}
                    >
                      {subItem.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

