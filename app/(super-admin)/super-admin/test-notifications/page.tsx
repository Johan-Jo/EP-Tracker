import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/server';
import { TestNotificationsClient } from '@/components/super-admin/test-notifications-client';

export const dynamic = 'force-dynamic';

/**
 * Test Notifications Page
 * Allows super admin to test sending notifications to users
 */
export default async function TestNotificationsPage() {
  await requireSuperAdmin();
  
  const adminClient = createAdminClient();

  // Fetch all users with their profiles
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching users:', error);
  }

  const users = profiles || [];

  // Notification types available for testing
  const notificationTypes = [
    {
      value: 'test',
      label: 'Test Notifikation',
      description: 'Enkel testnotifikation',
      defaultTitle: '🎉 Test-notifikation',
      defaultBody: 'Detta är en testnotifikation från EP-Tracker.',
    },
    {
      value: 'check_in',
      label: 'Check-in Notifikation',
      description: 'När någon checkar in på ett projekt',
      defaultTitle: '👷 Johan checkade in',
      defaultBody: 'På projekt: Testprojekt\nTid: 08:00',
    },
    {
      value: 'checkout_reminder',
      label: 'Check-out Påminnelse',
      description: 'Påminnelse att checka ut',
      defaultTitle: '⏰ Påminnelse: Glöm inte att checka ut!',
      defaultBody: 'Du har varit incheckad i 8 timmar. Glöm inte att checka ut när du är klar.',
    },
    {
      value: 'approval_needed',
      label: 'Godkännande Behövs',
      description: 'När något behöver godkännas',
      defaultTitle: '✅ Godkännande behövs',
      defaultBody: 'Det finns 3 nya tidsrapporter som väntar på ditt godkännande.',
    },
    {
      value: 'approval_confirmed',
      label: 'Godkännande Bekräftat',
      description: 'När något har godkänts',
      defaultTitle: '✅ Din tidsrapport har godkänts',
      defaultBody: 'Din tidsrapport för vecka 4 har godkänts av administratören.',
    },
    {
      value: 'late_checkin',
      label: 'Försenad Check-in',
      description: 'När någon är sen med att checka in',
      defaultTitle: '⚠️ Försenad check-in',
      defaultBody: 'Johan är 15 minuter sen med att checka in på projektet Testprojekt.',
    },
    {
      value: 'forgotten_checkout',
      label: 'Glömd Check-out',
      description: 'När någon glömt att checka ut',
      defaultTitle: '⚠️ Glömd check-out',
      defaultBody: 'Johan har glömt att checka ut från projektet Testprojekt. Han checkade in för 9 timmar sedan.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Testa Notifikationer
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Skicka testnotifikationer till användare för att verifiera e-postfunktionalitet
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              E-post Fallback Aktiverat
            </h3>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">
              Eftersom Firebase inte är konfigurerat ännu, skickas alla notifikationer automatiskt via e-post till användarens registrerade e-postadress.
            </p>
          </div>
        </div>
      </div>

      {/* Test Form */}
      <TestNotificationsClient users={users} notificationTypes={notificationTypes} />
    </div>
  );
}

