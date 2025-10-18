import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/sign-out-button';

export default async function Home() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-8'>
			<div className='max-w-2xl text-center'>
				<h1 className='mb-4 text-4xl font-bold text-primary'>EP Time Tracker</h1>
				<p className='mb-8 text-lg text-muted-foreground'>
					Tidrapportering och platsrapportering för svenska entreprenörer
				</p>

				{user ? (
					<div className='space-y-4'>
						<div className='p-4 rounded-lg bg-green-50 border border-green-200'>
							<p className='text-sm font-medium text-green-900'>
								✅ Inloggad som: {user.email}
							</p>
							<p className='text-xs text-green-700 mt-1'>
								User ID: {user.id}
							</p>
						</div>
						<div className='flex gap-4 justify-center'>
							<Link
								href='/dashboard'
								className='rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity'
							>
								Gå till Dashboard
							</Link>
							<SignOutButton />
						</div>
					</div>
				) : (
					<div className='flex gap-4 justify-center'>
						<Link
							href='/sign-in'
							className='rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity'
						>
							Logga in
						</Link>
						<Link
							href='/sign-up'
							className='rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-accent transition-colors'
						>
							Skapa konto
						</Link>
					</div>
				)}
				<div className='mt-12 p-6 rounded-lg bg-muted'>
					<h2 className='text-xl font-semibold mb-4'>Phase 1 MVP - Progress</h2>
					<div className='space-y-4 text-left'>
						<div>
							<h3 className='text-sm font-medium mb-2'>✅ EPIC 1: Infrastructure Complete</h3>
							<ul className='text-xs space-y-1 text-muted-foreground ml-4'>
								<li>• Next.js 15 + React 19 + TypeScript</li>
								<li>• Supabase integration</li>
								<li>• State management & offline storage</li>
								<li>• PWA & i18n configured</li>
							</ul>
						</div>
						<div>
							<h3 className='text-sm font-medium mb-2'>✅ EPIC 2: Database & Auth Complete</h3>
							<ul className='text-xs space-y-1 text-muted-foreground ml-4'>
								<li>• Complete database schema (15+ tables)</li>
								<li>• RLS policies for multi-tenant security</li>
								<li>• Authentication pages & API routes</li>
								<li>• Storage buckets configured</li>
								<li>• Swedish checklist templates</li>
							</ul>
						</div>
						<div className='mt-3 pt-3 border-t border-border'>
							<p className='text-xs text-muted-foreground'>
								<strong>Next:</strong> EPIC 3 - Core UI & Projects Management
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
