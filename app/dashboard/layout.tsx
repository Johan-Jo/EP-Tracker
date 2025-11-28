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
import { DemoProvider } from '@/lib/demo/demo-context';
import { DemoBanner } from '@/components/core/demo-banner';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';
import { isDemoRoute } from '@/lib/demo/is-demo-route';
import { cookies } from 'next/headers';

// EPIC 26: Enforce single region (Stockholm) to avoid multi-region serverless error
export const runtime = 'nodejs';
export const preferredRegion = 'arn1'; // Stockholm

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Check if we're in demo mode
	const inDemoMode = await isDemoRoute();
	
	// Use cached session to avoid duplicate DB calls
	const { user, profile, membership } = await getSession();

	// Skip auth redirect if in demo mode (getSession returns fake user for demo)
	if (!inDemoMode && !user) {
		redirect('/sign-in');
	}

	// Redirect to complete setup if user hasn't created organization yet (but not in demo mode)
	if (!inDemoMode && !membership) {
		redirect('/complete-setup');
	}

	// In demo mode, use admin role and demo org membership
	// If in demo mode but no membership, default to admin role
	const userRole = inDemoMode
		? ((membership?.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue') || 'admin')
		: ((membership?.role as 'admin' | 'foreman' | 'worker' | 'finance' | 'ue') || 'admin');

	// Check if super admin is impersonating a user (skip in demo mode)
	const impersonationSession = inDemoMode ? null : await getImpersonationSession();

	// Check if example mode is enabled OR if we're in demo route
	const cookieStore = await cookies();
	const exampleModeEnabled = cookieStore.get('exampleModeEnabled')?.value === 'true';
	
	// Get demo org ID, but handle errors gracefully
	let demoOrgId: string | null = null;
	if (inDemoMode || exampleModeEnabled) {
		try {
			demoOrgId = await getDemoOrgId();
		} catch (error) {
			console.error('[DashboardLayout] Error getting demo org:', error);
			// Continue without demo org - will fall back to normal mode
		}
	}
	
	const demoMode: 'anonymous' | 'exampleOrg' | 'none' = inDemoMode 
		? 'anonymous' 
		: (exampleModeEnabled ? 'exampleOrg' : 'none');

	// Use demo org ID if in example mode, otherwise use membership org_id
	// If in demo mode but no membership, use demo org ID if available
	const effectiveOrgId = (demoMode === 'exampleOrg' && demoOrgId) 
		? demoOrgId 
		: (membership?.org_id || (inDemoMode ? demoOrgId : null));

	return (
		<DemoProvider demoOrgId={demoOrgId} initialMode={demoMode}>
			<div className='min-h-screen bg-gray-50 text-foreground transition-colors dark:bg-gray-900'>
				{/* Impersonation Banner - shows if super admin is impersonating */}
				{impersonationSession && (
					<ImpersonationBanner session={impersonationSession} />
				)}
				{/* Demo Banner - shows if in demo or example mode */}
				{(demoMode === 'anonymous' || demoMode === 'exampleOrg') && <DemoBanner />}
				{/* Sidebar for desktop */}
				<div className={impersonationSession || demoMode !== 'none' ? 'pt-12' : ''}>
					<Sidebar userRole={userRole} />
				</div>

				{/* Main content area */}
				<div className={`flex flex-col md:pl-64 ${impersonationSession || demoMode !== 'none' ? 'pt-12' : ''}`}>
					{/* Top navigation */}
					<TopNav 
						userEmail={inDemoMode ? 'demo@example.com' : (user?.email || '')} 
						userName={inDemoMode ? 'Demo Användare' : (profile?.full_name || undefined)} 
					/>

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

				{/* Data preloader - skip in demo mode */}
				{!inDemoMode && user && effectiveOrgId && (
					<DataPreloader userId={user.id} orgId={effectiveOrgId} autoStart={false} />
				)}
			</div>
		</DemoProvider>
	);
}

