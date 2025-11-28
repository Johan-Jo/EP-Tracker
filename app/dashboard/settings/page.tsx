import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { SettingsPageNew } from '@/components/settings/settings-page-new';

export default async function SettingsPage() {
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Use cached session
	const { user, membership } = await getSession();

	// Skip auth redirect if in demo mode
	if (!inDemoMode && !user) {
		redirect('/sign-in');
	}

	const isAdmin = membership?.role === 'admin';
	const canManageUsers = membership?.role && ['admin', 'foreman'].includes(membership.role);
	const canManageFortnox = membership?.role && ['admin', 'finance'].includes(membership.role);

	return <SettingsPageNew isAdmin={isAdmin} canManageUsers={canManageUsers} canManageFortnox={canManageFortnox} />;
}

