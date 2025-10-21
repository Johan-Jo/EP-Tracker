import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { SuperAdminBanner } from '@/components/super-admin/super-admin-banner';
import { SuperAdminNav } from '@/components/super-admin/super-admin-nav';
import { GlobalSearch } from '@/components/super-admin/support/global-search';

/**
 * Super Admin Layout
 * 
 * Wraps all super admin pages with:
 * - Authentication check (redirects if not super admin)
 * - Super admin banner
 * - Super admin navigation
 * - Global search
 * - Distinct styling from regular org dashboard
 */

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify user is super admin, redirect if not
  await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Super Admin Banner - always visible */}
      <SuperAdminBanner />

      <div className="flex h-[calc(100vh-52px)]">
        {/* Sidebar Navigation */}
        <aside className="hidden w-64 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 lg:block">
          <div className="flex h-full flex-col">
            {/* Logo / Header */}
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                EP Tracker
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Super Admin Panel
              </p>
            </div>

            {/* Global Search */}
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <GlobalSearch />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              <SuperAdminNav />
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Platform v2.0
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

