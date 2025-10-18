import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/core/sidebar';
import { MobileNav } from '@/components/core/mobile-nav';
import { TopNav } from '@/components/core/top-nav';

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

	// Fetch user profile
	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	return (
		<div className='min-h-screen bg-background'>
			{/* Sidebar for desktop */}
			<Sidebar />

			{/* Main content area */}
			<div className='flex flex-col md:pl-64'>
				{/* Top navigation */}
				<TopNav userEmail={user.email} userName={profile?.full_name || undefined} />

				{/* Main content */}
				<main className='flex-1 pb-20 md:pb-0'>{children}</main>
			</div>

			{/* Mobile bottom navigation */}
			<MobileNav />
		</div>
	);
}

