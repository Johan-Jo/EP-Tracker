/**
 * Notification Settings Page
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationSettings } from '@/components/notifications/notification-settings';
import { PageTourTrigger } from '@/components/onboarding/page-tour-trigger';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Notiser - EP-Tracker',
  description: 'Hantera dina push-notiser och påminnelser',
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user's role from membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const userRole = membership?.role || 'worker';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notiser</h1>
            <p className="text-gray-600 dark:text-white mt-2">
              Hantera push-notiser och påminnelser
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/help?section=notifications">
                <HelpCircle className="h-4 w-4 mr-2" />
                Hjälp
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <NotificationSettings userRole={userRole} />

      {/* Tour Trigger */}
      <PageTourTrigger tourId="notifications" />
    </div>
  );
}

