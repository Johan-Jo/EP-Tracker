import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CheckInPageClient } from './checkin-page-client';

interface PageProps {
	params: Promise<{ projectId: string }>;
}

export default async function CheckInPage(props: PageProps) {
	const { projectId } = await props.params;
	const supabase = await createClient();
	
	const { data: { user } } = await supabase.auth.getUser();
	
	if (!user) {
		redirect('/sign-in');
	}

	// Fetch project details
	const { data: project, error: projectError } = await supabase
		.from('projects')
		.select('id, name, worksite_enabled, worksite_code, address_line1, address_line2, city')
		.eq('id', projectId)
		.single();

	if (projectError || !project || !project.worksite_enabled) {
		return (
			<div className='min-h-screen flex items-center justify-center p-6'>
				<div className='text-center'>
					<h1 className='text-2xl font-bold text-gray-900 mb-2'>Personalliggare inte aktiverad</h1>
					<p className='text-gray-600'>Detta projekt har inte aktiv personalliggare.</p>
				</div>
			</div>
		);
	}

	return <CheckInPageClient project={project} userId={user.id} />;
}

