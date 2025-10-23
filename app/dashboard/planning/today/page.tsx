import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { MobileTodayScreen } from '@/components/planning/mobile-today-screen';

export default async function TodayPage() {
	const { user, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	if (!membership) {
		redirect('/complete-setup');
	}

	return <MobileTodayScreen />;
}

