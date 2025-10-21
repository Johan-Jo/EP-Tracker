import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/core/sidebar';
import { MobileNav } from '@/components/core/mobile-nav';
import { TopNav } from '@/components/core/top-nav';
import { OfflineBanner } from '@/components/core/offline-banner';
import { ServiceWorkerUpdatePrompt } from '@/components/core/sw-update-prompt';
import { getSession } from '@/lib/auth/get-session';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Use cached session to avoid duplicate DB calls
	const { user, profile, membership } = await getSession();

	if (!user) {
		redirect('/sign-in');
	}

	// Redirect to complete setup if user hasn't created organization yet
	if (!membership) {
		redirect('/complete-setup');
	}

	const userRole = membership.role as 'admin' | 'foreman' | 'worker' | 'finance';

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
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

			{/* Offline banner */}
			<OfflineBanner />

			{/* Service worker update prompt */}
			<ServiceWorkerUpdatePrompt />
		</div>
	);
}

