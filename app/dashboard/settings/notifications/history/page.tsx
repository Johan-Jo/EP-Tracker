/**
 * Notification History Page
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, CheckCircle, XCircle } from 'lucide-react';

export const metadata = {
  title: 'Notishistorik - EP-Tracker',
  description: 'Se tidigare mottagna notiser',
};

async function getNotificationHistory(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[History] Error fetching:', error);
    return [];
  }

  return data || [];
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checkout_reminder: 'Check-out påminnelse',
    team_checkin: 'Team check-in',
    team_checkout: 'Team check-out',
    approval_needed: 'Godkännande väntar',
    approval_confirmed: 'Rapport godkänd',
    ata_update: 'ÄTA-uppdatering',
    diary_update: 'Dagboksinlägg',
    weekly_summary: 'Veckosammanfattning',
    test: 'Testnotis',
  };
  return labels[type] || type;
}

function getTypeIcon(type: string) {
  if (type.includes('approval')) return '✓';
  if (type.includes('team')) return '👥';
  if (type.includes('checkout')) return '⏰';
  if (type.includes('ata')) return '📋';
  if (type.includes('diary')) return '📖';
  if (type.includes('test')) return '🧪';
  return '🔔';
}

export default async function NotificationHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const notifications = await getNotificationHistory(user.id);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/settings/notifications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Notishistorik</h1>
        <p className="text-gray-600 mt-2">
          Senaste 50 notiserna du fått
        </p>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Inga notiser än
            </h3>
            <p className="text-gray-600">
              När du får notiser kommer de visas här
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0">
                  {getTypeIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {notif.delivery_status === 'clicked' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {notif.delivery_status === 'failed' && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notif.body}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      {getTypeLabel(notif.type)}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(notif.sent_at).toLocaleString('sv-SE', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    {notif.read_at && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">Läst</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

