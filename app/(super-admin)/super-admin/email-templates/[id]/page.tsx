import { ArrowLeft, Mail, Shield, Save } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmailTemplateForm } from '@/components/super-admin/email-templates/email-template-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmailTemplateEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/super-admin/email-templates"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till mallar
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-8 w-8 text-orange-600" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {template.name}
              </h1>
            </div>
            {template.is_system && (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-orange-100 px-3 py-1 dark:bg-orange-900/20">
                <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                  Systemmall - Begränsad redigering
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Details */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mall-information
          </h2>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Typ</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{template.template_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {template.is_active ? 'Aktiv' : 'Inaktiv'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Skapad</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(template.created_at).toLocaleDateString('sv-SE')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Uppdaterad</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(template.updated_at).toLocaleDateString('sv-SE')}
              </dd>
            </div>
          </dl>
        </div>

        {/* Variables Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tillgängliga variabler
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Använd dessa variabler i ämnesraden med dubbla klammerparenteser:
          </p>
          <ul className="mt-4 space-y-2">
            {template.variables && Array.isArray(template.variables) ? (
              template.variables.map((variable: string) => (
                <li
                  key={variable}
                  className="rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                >
                  {'{{' + variable + '}}'}
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 dark:text-gray-400">
                Inga variabler definierade
              </li>
            )}
          </ul>
        </div>

        {/* Example Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Exempel
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Aktuell ämnesrad:
              </p>
              <p className="mt-1 rounded-md bg-blue-50 px-3 py-2 text-sm text-gray-900 dark:bg-blue-900/20 dark:text-gray-100">
                {template.subject_template}
              </p>
            </div>
            {template.variables && Array.isArray(template.variables) && template.variables.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Exempel med värden:
                </p>
                <p className="mt-1 rounded-md bg-green-50 px-3 py-2 text-sm text-gray-900 dark:bg-green-900/20 dark:text-gray-100">
                  {template.subject_template
                    .replace('{{organizationName}}', 'Byggfirma AB')
                    .replace('{{daysRemaining}}', '3')
                    .replace('{{planName}}', 'Pro')
                    .replace('{{amount}}', '299')
                    .replace('{{userName}}', 'Johan')
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <EmailTemplateForm template={template} />
    </div>
  );
}

