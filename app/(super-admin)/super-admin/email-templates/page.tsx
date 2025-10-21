import { Mail, Edit, CheckCircle, XCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Email Templates | Super Admin',
  description: 'Manage email templates',
};

export default async function EmailTemplatesPage() {
  const supabase = await createClient();
  
  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching email templates:', error);
  }

  const getTypeColor = (type: string) => {
    switch (type) {
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
          E-postmallar
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Hantera e-postmallar och deras innehåll
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Totalt</h3>
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {templates?.length || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Aktiva</h3>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {templates?.filter(t => t.is_active).length || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Inaktiva</h3>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {templates?.filter(t => !t.is_active).length || 0}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">System</h3>
            <Shield className="h-5 w-5 text-orange-500" />
          </div>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
            {templates?.filter(t => t.is_system).length || 0}
          </p>
        </div>
      </div>

      {/* Templates Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mallnamn
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Beskrivning
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Typ
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {templates && templates.length > 0 ? (
                templates.map((template: any) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </p>
                          {template.is_system && (
                            <div className="mt-1 flex items-center gap-1">
                              <Shield className="h-3 w-3 text-orange-500" />
                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                System
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {template.description || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(template.template_type)}`}>
                        {template.template_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {template.is_active ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Aktiv</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Inaktiv</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/email-templates/${template.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
                      >
                        <Edit className="h-4 w-4" />
                        Redigera
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Inga e-postmallar hittades
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

