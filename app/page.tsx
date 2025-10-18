import Link from 'next/link';

export default function Home() {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-8'>
			<div className='max-w-2xl text-center'>
				<h1 className='mb-4 text-4xl font-bold text-primary'>EP Time Tracker</h1>
				<p className='mb-8 text-lg text-muted-foreground'>
					Tidrapportering och platsrapportering för svenska entreprenörer
				</p>
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
				<div className='mt-12 p-6 rounded-lg bg-muted'>
					<h2 className='text-xl font-semibold mb-4'>Phase 1 MVP - Infrastructure Complete ✅</h2>
					<ul className='text-left text-sm space-y-2 text-muted-foreground'>
						<li>✅ Next.js 15 + React 19 + TypeScript</li>
						<li>✅ Supabase client setup (Auth, Storage, Database)</li>
						<li>✅ State management (Zustand + React Query)</li>
						<li>✅ Offline storage (Dexie IndexedDB)</li>
						<li>✅ PWA configuration</li>
						<li>✅ i18n (Swedish + English)</li>
						<li>✅ Tailwind CSS + shadcn/ui</li>
						<li>✅ ESLint + Prettier</li>
						<li>✅ Git repository initialized</li>
					</ul>
					<p className='mt-4 text-xs'>
						Next: Set up Supabase project and implement database schema (EPIC 2)
					</p>
				</div>
			</div>
		</div>
	);
}
