import { createClient } from '@/lib/supabase/server';
import { ControlView as ControlViewComponent } from '@/components/worksites/control-view';

export default async function ControlViewPage({ 
	params 
}: { 
	params: Promise<{ projectId: string }> 
}) {
	const { projectId } = await params;
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	
	if (!user) {
		return (
			<div className='p-6'>
				<p className='text-sm text-muted-foreground'>Logga in för att visa kontrollvy.</p>
			</div>
		);
	}

	// Fetch active status for initial data
	const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/worksites/${projectId}/active`, {
		cache: 'no-store',
	});
	const active = response.ok ? await response.json() : { active: false };

	return <ControlViewComponent projectId={projectId} initialData={active} />;
}
