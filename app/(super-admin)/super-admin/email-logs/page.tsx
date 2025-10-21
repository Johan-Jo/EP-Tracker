import { Mail, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Email Logs | Super Admin',
  description: 'View email sending history and status',
};

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>;
}

export default async function EmailLogsPage({ searchParams }: PageProps) {
  const { status, type, page = '1' } = await searchParams;
  const supabase = await createClient();
  
  const limit = 50;
  const offset = (parseInt(page) - 1) * limit;

  // Fetch email logs
  let query = supabase
    .from('email_logs')
    .select('*, organizations(name)', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (type) {
    query = query.eq('email_type', type);
  }

  const { data: logs, error, count } = await query;

  if (error) {
    console.error('Error fetching email logs:', error);
  }

  const totalPages = count ? Math.ceil(count / limit) : 0;
  const currentPage = parseInt(page);

  // Calculate summary stats
  const { data: stats } = await supabase
    .from('email_logs')
    .select('status, email_type')
    .then(({ data }) => {
      if (!data) return { data: null };
      
      const summary = {
        total: data.length,
        sent: data.filter((l: any) => l.status === 'sent' || l.status === 'delivered').length,
        failed: data.filter((l: any) => l.status === 'failed' || l.status === 'bounced').length,
        pending: data.filter((l: any) => l.status === 'pending').length,
      };
      
      return { data: summary };
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'bounced':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
      case 'bounced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getTypeColor = (emailType: string) => {
    switch (emailType) {
      case 'announcement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'notification':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'transactional':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'marketing':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          E-postloggar
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Visa historik över skickade e-postmeddelanden
        </p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Totalt</h3>
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.total}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Skickade</h3>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.sent}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Misslyckade</h3>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.failed}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Väntande</h3>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.pending}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/super-admin/email-logs"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            !status && !type
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Alla
        </Link>
        <Link
          href="/super-admin/email-logs?status=sent"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            status === 'sent'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Skickade
        </Link>
        <Link
          href="/super-admin/email-logs?status=failed"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            status === 'failed'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Misslyckade
        </Link>
        <Link
          href="/super-admin/email-logs?type=announcement"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            type === 'announcement'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Meddelanden
        </Link>
        <Link
          href="/super-admin/email-logs?type=notification"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            type === 'notification'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Notifieringar
        </Link>
      </div>

      {/* Email Logs Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Typ
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Till
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ämne
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Organisation
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Skickat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {logs && logs.length > 0 ? (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(log.email_type)}`}>
                        {log.email_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {log.to_name || log.to_email}
                        </p>
                        {log.to_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.to_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-white">{log.subject}</p>
                      {log.template_name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Template: {log.template_name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.organizations ? (
                        <Link
                          href={`/super-admin/organizations/${log.organization_id}`}
                          className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400"
                        >
                          {log.organizations.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.sent_at).toLocaleString('sv-SE')}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Inga e-postloggar hittades
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Visar sida {currentPage} av {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/super-admin/email-logs?page=${currentPage - 1}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Föregående
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/super-admin/email-logs?page=${currentPage + 1}${status ? `&status=${status}` : ''}${type ? `&type=${type}` : ''}`}
                  className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Nästa
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

