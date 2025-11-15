/**
 * Project Alerts Settings Page
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProjectAlertSettings } from '@/components/projects/project-alert-settings';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Alert-inställningar - EP-Tracker`,
    description: 'Hantera projektspecifika alert-inställningar',
  };
}

async function getProject(projectId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, project_number, alert_settings')
    .eq('id', projectId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function ProjectAlertsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Check user role
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!membership || !['admin', 'foreman'].includes(membership.role)) {
    redirect('/dashboard');
  }

  const project = await getProject(id);

  if (!project) {
    redirect('/dashboard/projects');
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till projekt
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Alert-inställningar</h1>
        <p className="text-gray-600 mt-2">
          {project.name} ({project.project_number})
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurera påminnelser och varningar för detta projekt
        </p>
      </div>

      {/* Settings Component */}
      <ProjectAlertSettings
        projectId={id}
        initialSettings={project.alert_settings}
      />
    </div>
  );
}

