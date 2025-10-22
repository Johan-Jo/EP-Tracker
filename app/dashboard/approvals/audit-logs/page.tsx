import { getSession } from '@/lib/auth/get-session';
import { redirect } from 'next/navigation';
import { AuditLogViewer } from '@/components/approvals/audit-log-viewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AuditLogsPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		return (
			<div className='p-4 md:p-8'>
				<p className='text-destructive'>Ingen aktiv organisation hittades</p>
			</div>
		);
	}

	// Only admin can access audit logs
	if (membership.role !== 'admin') {
		redirect('/dashboard');
	}

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div className="flex items-center gap-4">
				<Link href="/dashboard/approvals">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Tillbaka
					</Button>
				</Link>
				<div>
					<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>
						Granskningsloggar
					</h1>
					<p className='text-gray-600 dark:text-gray-400 mt-2'>
						Visa alla händelser och ändringar i systemet
					</p>
				</div>
			</div>

			<AuditLogViewer orgId={membership.org_id} />
		</div>
	);
}

