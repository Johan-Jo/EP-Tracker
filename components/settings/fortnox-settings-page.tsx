'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FortnoxConnectionManager } from '@/components/integrations/fortnox-connection-manager';
import { FortnoxCustomerImport } from '@/components/integrations/fortnox-customer-import';
import { FortnoxPayrollMappings } from '@/components/integrations/fortnox-payroll-mappings';

interface FortnoxSettingsPageProps {
	orgId: string;
}

export function FortnoxSettingsPage({ orgId }: FortnoxSettingsPageProps) {
	const searchParams = useSearchParams();
	const [activeTab, setActiveTab] = useState('connection');

	// Set active tab from URL query param
	useEffect(() => {
		const tab = searchParams.get('tab');
		if (tab && ['connection', 'customers', 'payroll'].includes(tab)) {
			setActiveTab(tab);
		}
	}, [searchParams]);

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

			<main className='px-4 md:px-8 py-6 max-w-4xl'>
				<Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
					<TabsList>
						<TabsTrigger value='connection'>Anslutning</TabsTrigger>
						<TabsTrigger value='customers'>Kunder</TabsTrigger>
						<TabsTrigger value='payroll'>Payroll Mappningar</TabsTrigger>
					</TabsList>

					<TabsContent value='connection' className='space-y-6'>
						<FortnoxConnectionManager orgId={orgId} />
					</TabsContent>

					<TabsContent value='customers' className='space-y-6'>
						<FortnoxCustomerImport orgId={orgId} />
					</TabsContent>

					<TabsContent value='payroll' className='space-y-6'>
						<FortnoxPayrollMappings orgId={orgId} />
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}


