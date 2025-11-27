import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { WorkOrderTodayScreen } from '@/components/work-orders/work-order-today-screen';

export default async function WorkOrderTodayPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/complete-setup');
	}

	return <WorkOrderTodayScreen />;
}

