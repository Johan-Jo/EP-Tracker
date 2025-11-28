import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { TimePageNew } from '@/components/time/time-page-new';

interface PageProps {
	searchParams: Promise<{ project_id?: string; work_order_id?: string; start_at?: string; stop_at?: string }>;
}

export default async function TimePage(props: PageProps) {
	try {
		const searchParams = await props.searchParams;
		const projectId = searchParams.project_id;
		const workOrderId = searchParams.work_order_id;
		const startAt = searchParams.start_at;
		const stopAt = searchParams.stop_at;
		
		// Server-side: Only fetch session with error handling
		let session;
		try {
			session = await getSession();
		} catch (sessionError) {
			console.error('[TimePage] Error getting session:', sessionError);
			return (
				<div className='p-4 md:p-8 border border-red-300 rounded bg-red-50 text-red-800'>
					<p className='font-semibold'>Fel vid autentisering.</p>
					<p className='text-sm mt-1'>Försök ladda om sidan eller logga in igen.</p>
				</div>
			);
		}

		const { user, membership } = session || { user: null, membership: null };

		// Check if we're in demo mode
		const inDemoMode = await isDemoRoute();

		// Skip auth redirect if in demo mode
		if (!inDemoMode && !user) {
			redirect('/sign-in');
		}

		if (!membership) {
			return (
				<div className='p-4 md:p-8'>
					<p className='text-destructive'>Ingen aktiv organisation hittades</p>
				</div>
			);
		}

		return <TimePageNew orgId={membership.org_id} userId={user.id} userRole={membership.role} projectId={projectId} workOrderId={workOrderId} startAt={startAt} stopAt={stopAt} />;
	} catch (error) {
		console.error('[TimePage] SSR render error', error);
		console.error('[TimePage] Error details:', {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		return (
			<div className='p-4 md:p-8 border border-red-300 rounded bg-red-50 text-red-800'>
				<p className='font-semibold'>Internt fel i tidssidan.</p>
				<p className='text-sm mt-1'>Försök ladda om sidan. Om felet kvarstår, se server-loggarna.</p>
				{process.env.NODE_ENV === 'development' && error instanceof Error && (
					<pre className='mt-2 text-xs bg-red-100 p-2 rounded overflow-auto'>
						{error.message}
						{error.stack && `\n\n${error.stack}`}
					</pre>
				)}
			</div>
		);
	}
}

