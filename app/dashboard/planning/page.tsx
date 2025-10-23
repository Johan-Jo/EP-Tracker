import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { PlanningPageClient } from '@/components/planning/planning-page-client';

export default async function PlanningPage() {
	// Use cached session
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/complete-setup');
	}

	// Check permissions: admin/foreman only
	const userRole = membership.role as string;
	if (!['admin', 'foreman', 'finance'].includes(userRole)) {
		redirect('/dashboard');
	}

	return <PlanningPageClient />;
}

