'use client';

import { FortnoxConnectionManager } from '@/components/integrations/fortnox-connection-manager';
import { FortnoxCustomerImport } from '@/components/integrations/fortnox-customer-import';

interface FortnoxSettingsPageProps {
	orgId: string;
}

export function FortnoxSettingsPage({ orgId }: FortnoxSettingsPageProps) {
	if (!orgId) {
		return (
			<div className='flex-1 overflow-auto pb-20 md:pb-0'>
				<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
					<div className='px-4 md:px-8 py-4 md:py-6'>
						<div>
							<h1 className='text-3xl font-bold tracking-tight mb-1'>Fortnox Integration</h1>
							<p className='text-sm text-muted-foreground'>
								Anslut och hantera ditt Fortnox-konto för fakturaexport
							</p>
						</div>
					</div>
				</header>
				<main className='px-4 md:px-8 py-6 max-w-4xl'>
					<p className='text-destructive'>Organisations-ID saknas. Vänligen logga in igen.</p>
				</main>
			</div>
		);
	}

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>Fortnox Integration</h1>
						<p className='text-sm text-muted-foreground'>
							Anslut och hantera ditt Fortnox-konto för fakturaexport
						</p>
					</div>
				</div>
			</header>

			<main className='px-4 md:px-8 py-6 max-w-4xl space-y-6'>
				<FortnoxConnectionManager orgId={orgId} />
				<FortnoxCustomerImport orgId={orgId} />
			</main>
		</div>
	);
}


