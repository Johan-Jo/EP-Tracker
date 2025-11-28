import { redirect } from 'next/navigation';
import { DemoProvider } from '@/lib/demo/demo-context';
import { getDemoOrgId } from '@/lib/demo/get-demo-org';

// EPIC 26: Enforce single region (Stockholm) to avoid multi-region serverless error
export const runtime = 'nodejs';
export const preferredRegion = 'arn1'; // Stockholm

export default async function DemoLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// Check if demo mode is enabled (check both server and client env vars)
	const enableDemo = process.env.ENABLE_DEMO === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEMO === 'true';
	
	if (!enableDemo) {
		redirect('/');
	}

	// Get demo org ID
	const demoOrgId = await getDemoOrgId();

	if (!demoOrgId) {
		console.error('[DEMO] Demo organization not found');
		redirect('/');
	}

	return (
		<DemoProvider demoOrgId={demoOrgId} initialMode="anonymous">
			{children}
		</DemoProvider>
	);
}

