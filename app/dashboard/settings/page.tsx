import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { SettingsPageNew } from '@/components/settings/settings-page-new';

export default async function SettingsPage() {
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	const isAdmin = membership?.role === 'admin';
	const canManageUsers = membership?.role && ['admin', 'foreman'].includes(membership.role);

	return <SettingsPageNew isAdmin={isAdmin} canManageUsers={canManageUsers} />;
}

