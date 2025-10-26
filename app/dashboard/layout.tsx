import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/core/sidebar';
import { MobileNav } from '@/components/core/mobile-nav';
import { TopNav } from '@/components/core/top-nav';
import { OfflineBanner } from '@/components/core/offline-banner';
import { ServiceWorkerUpdatePrompt } from '@/components/core/sw-update-prompt';
import { PWAInstallPrompt } from '@/components/core/pwa-install-prompt';
import { DataPreloader } from '@/components/sync/data-preloader';
import { getSession } from '@/lib/auth/get-session';
import { getImpersonationSession } from '@/lib/super-admin/impersonation';
import { ImpersonationBanner } from '@/components/super-admin/support/impersonation-banner';

// EPIC 26.7: Enable Edge Runtime for faster TTFB
export const runtime = 'edge';

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

	// Check if super admin is impersonating a user
	const impersonationSession = await getImpersonationSession();

	return (
		<div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
			{/* Impersonation Banner - shows if super admin is impersonating */}
			{impersonationSession && (
				<ImpersonationBanner session={impersonationSession} />
			)}
			{/* Sidebar for desktop */}
			<div className={impersonationSession ? 'pt-12' : ''}>
				<Sidebar userRole={userRole} />
			</div>

			{/* Main content area */}
			<div className={`flex flex-col md:pl-64 ${impersonationSession ? 'pt-12' : ''}`}>
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

			{/* PWA install prompt */}
			<PWAInstallPrompt />

			{/* Data preloader */}
			<DataPreloader userId={user.id} orgId={membership.org_id} autoStart={false} />
		</div>
	);
}

