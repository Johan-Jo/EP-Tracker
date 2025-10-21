import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getAuditLogs, getAuditLogActions, getAuditLogResourceTypes } from '@/lib/super-admin/audit-logs';
import { AuditLogTable } from '@/components/super-admin/system/audit-log-table';

export const metadata = {
	title: 'Granskningsloggar | Super Admin',
	description: 'Visa alla super admin-åtgärder',
};

export default async function AuditLogsPage() {
	await requireSuperAdmin();

	const [{ logs, total }, actions, resourceTypes] = await Promise.all([
		getAuditLogs({ limit: 50, offset: 0 }),
		getAuditLogActions(),
		getAuditLogResourceTypes(),
	]);

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Granskningsloggar</h1>
					<p className="text-muted-foreground mt-2">
						Spåra alla super admin-åtgärder i systemet
					</p>
				</div>

				<Suspense fallback={<div>Laddar...</div>}>
					<AuditLogTable
						initialLogs={logs}
						initialTotal={total}
						availableActions={actions}
						availableResourceTypes={resourceTypes}
					/>
				</Suspense>
			</div>
		</div>
	);
}

