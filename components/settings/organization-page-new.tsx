'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Info, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface OrganizationPageNewProps {
	organization: {
		id: string;
		name: string;
		created_at: string;
	};
}

export function OrganizationPageNew({ organization }: OrganizationPageNewProps) {
	const router = useRouter();
	const [organizationName, setOrganizationName] = useState(organization.name);
	const [mileageRate, setMileageRate] = useState('18.50');
	const [standardWorkHours, setStandardWorkHours] = useState('8');

	const updateOrganizationMutation = useMutation({
		mutationFn: async (data: { name: string }) => {
			const response = await fetch('/api/organizations', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte uppdatera organisation');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Organisationsinställningar sparade!');
			router.refresh();
		},
		onError: (error: Error) => {
			console.error('Organization update error:', error);
			toast.error(error.message || 'Kunde inte spara ändringar');
		},
	});

	const handleSaveBasicInfo = (e: React.FormEvent) => {
		e.preventDefault();
		if (!organizationName.trim()) {
			toast.error('Organisationsnamn krävs');
			return;
		}
		updateOrganizationMutation.mutate({ name: organizationName.trim() });
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>Organisationsinställningar</h1>
						<p className='text-sm text-muted-foreground'>Hantera din organisations grundläggande information</p>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-4xl'>
				<div className='space-y-6'>
					{/* Grunduppgifter */}
					<form onSubmit={handleSaveBasicInfo}>
						<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-primary/20 transition-colors'>
							<div className='flex items-start gap-3 mb-6'>
								<div className='p-2 rounded-lg bg-accent shrink-0'>
									<Building2 className='w-5 h-5 text-primary' />
								</div>
								<div>
									<h3 className='text-lg font-semibold mb-1'>Grunduppgifter</h3>
									<p className='text-sm text-muted-foreground'>
										Organisationens namn och grundläggande information
									</p>
								</div>
							</div>

							<div className='space-y-5'>
								{/* Organisationsnamn */}
								<div className='space-y-2'>
									<Label htmlFor='orgName' className='text-base font-medium'>
										Organisationsnamn
									</Label>
									<Input
										id='orgName'
										value={organizationName}
										onChange={(e) => setOrganizationName(e.target.value)}
										className='h-12 border-2 hover:border-primary/30 focus:border-primary transition-colors'
										placeholder='Ex: Byggfirma AB'
										required
									/>
								</div>

								{/* Organisation ID */}
								<div className='space-y-2'>
									<Label htmlFor='orgId' className='text-base font-medium'>
										Organisation ID
									</Label>
									<Input
										id='orgId'
										value={organization.id}
										disabled
										className='h-12 border-2 bg-muted text-muted-foreground cursor-not-allowed'
									/>
									<p className='text-xs text-muted-foreground flex items-start gap-1'>
										<Info className='w-3 h-3 mt-0.5 shrink-0' />
										Detta är din unika organisations-ID i systemet
									</p>
								</div>

								{/* Skapad */}
								<div className='space-y-2'>
									<Label htmlFor='createdDate' className='text-base font-medium'>
										Skapad
									</Label>
									<Input
										id='createdDate'
										value={new Date(organization.created_at).toLocaleDateString('sv-SE', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
										disabled
										className='h-12 border-2 bg-muted text-muted-foreground cursor-not-allowed'
									/>
								</div>

								{/* Save Button */}
								<div className='flex justify-end pt-2'>
									<Button
										type='submit'
										disabled={updateOrganizationMutation.isPending}
										className='h-12 px-6 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all'
									>
										{updateOrganizationMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
										{updateOrganizationMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
									</Button>
								</div>
							</div>
						</div>
					</form>

					{/* Standardinställningar */}
					<div className='bg-card border-2 border-border rounded-xl p-6'>
						<div className='mb-6'>
							<h3 className='text-lg font-semibold mb-1'>Standardinställningar</h3>
							<p className='text-sm text-muted-foreground'>
								Standardvärden för tidsrapportering och material
							</p>
						</div>

						<div className='space-y-5'>
							{/* Milersättning */}
							<div className='space-y-2'>
								<Label htmlFor='mileageRate' className='text-base font-medium'>
									Milersättning (kr/mil)
								</Label>
								<Input
									id='mileageRate'
									type='number'
									step='0.50'
									min='0'
									value={mileageRate}
									onChange={(e) => setMileageRate(e.target.value)}
									className='h-12 border-2 hover:border-primary/30 focus:border-primary transition-colors'
								/>
								<p className='text-xs text-muted-foreground flex items-start gap-1'>
									<Info className='w-3 h-3 mt-0.5 shrink-0' />
									Standard milersättning enligt Skatteverket 2025
								</p>
							</div>

							{/* Standard arbetstid */}
							<div className='space-y-2'>
								<Label htmlFor='standardWorkHours' className='text-base font-medium'>
									Standard arbetstid (timmar/dag)
								</Label>
								<Input
									id='standardWorkHours'
									type='number'
									min='0'
									max='24'
									step='0.5'
									value={standardWorkHours}
									onChange={(e) => setStandardWorkHours(e.target.value)}
									className='h-12 border-2 hover:border-primary/30 focus:border-primary transition-colors'
								/>
							</div>

							{/* Info Message */}
							<div className='bg-accent/50 border-2 border-primary/20 rounded-xl p-4 flex items-start gap-3'>
								<Info className='w-5 h-5 text-primary shrink-0 mt-0.5' />
								<p className='text-sm'>
									<span className='font-semibold text-foreground'>Obs:</span>{' '}
									<span className='text-muted-foreground'>
										Dessa inställningar kommer att aktiveras i en senare version. För närvarande är de endast
										visuella.
									</span>
								</p>
							</div>

							{/* Save Button - Disabled */}
							<div className='flex justify-end pt-2'>
								<Button
									variant='outline'
									disabled
									className='h-12 px-6 border-2 cursor-not-allowed opacity-50'
								>
									Spara ändringar (Kommer snart)
								</Button>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

