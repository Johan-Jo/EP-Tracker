import { Suspense } from 'react';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { getFeatureFlags } from '@/lib/super-admin/feature-flags';
import { FeatureFlagsPageClient } from '@/components/super-admin/system/feature-flags-page-client';

export const metadata = {
	title: 'Feature Flags | Super Admin',
	description: 'Hantera globala feature toggles',
};

export default async function FeatureFlagsPage() {
	await requireSuperAdmin();

	const flags = await getFeatureFlags();

	return (
		<div className="container mx-auto p-6 lg:p-8">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
					<p className="text-muted-foreground mt-2">
						Hantera globala feature toggles för alla organisationer
					</p>
				</div>

				<Suspense fallback={<div>Laddar...</div>}>
					<FeatureFlagsPageClient initialFlags={flags} />
				</Suspense>
			</div>
		</div>
	);
}

