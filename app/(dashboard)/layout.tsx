import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/core/sidebar';
import { MobileNav } from '@/components/core/mobile-nav';
import { TopNav } from '@/components/core/top-nav';
import { TimerWidget } from '@/components/time/timer-widget';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Fetch user profile and membership
	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Default to 'worker' if no membership found (shouldn't happen, but safety fallback)
	const userRole = (membership?.role as 'admin' | 'foreman' | 'worker' | 'finance') || 'worker';

	return (
		<div className='min-h-screen bg-background'>
			{/* Sidebar for desktop */}
			<Sidebar userRole={userRole} />

			{/* Main content area */}
			<div className='flex flex-col md:pl-64'>
				{/* Top navigation */}
				<TopNav userEmail={user.email} userName={profile?.full_name || undefined} />

				{/* Main content */}
				<main className='flex-1 pb-20 md:pb-0'>{children}</main>
			</div>

			{/* Mobile bottom navigation */}
			<MobileNav userRole={userRole} />

			{/* Sticky timer widget */}
			{membership && <TimerWidget userId={user.id} orgId={membership.org_id} />}
		</div>
	);
}

