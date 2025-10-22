import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrganizationFormData } from '@/lib/schemas/organization';
import { revalidatePath } from 'next/cache';

export default async function OrganizationSettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Get user's organization (first one for now)
	const { data: membership } = await supabase
		.from('memberships')
		.select('org_id, role, organizations(*)')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Only admin can manage organization - redirect others
	if (!membership || membership.role !== 'admin') {
		redirect('/dashboard');
	}

	const organization = membership.organizations as any;

	async function updateOrganization(formData: FormData) {
		'use server';

		const supabase = await createClient();
		const name = formData.get('name') as string;

		if (!name || !organization.id) {
			return;
		}

		const { error } = await supabase
			.from('organizations')
			.update({ name, updated_at: new Date().toISOString() })
			.eq('id', organization.id);

		if (error) {
			throw new Error(error.message);
		}

		revalidatePath('/dashboard/settings/organization');
	}

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Organisationsinställningar</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Hantera din organisations grundläggande information
				</p>
			</div>

		<form action={updateOrganization}>
			<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
				<CardHeader>
					<CardTitle className='text-gray-900 dark:text-white'>Grunduppgifter</CardTitle>
					<CardDescription className='text-gray-600 dark:text-gray-400'>
						Organisationens namn och grundläggande information
					</CardDescription>
				</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='name'>Organisationsnamn</Label>
							<Input
								id='name'
								name='name'
								defaultValue={organization.name}
								placeholder='Ex: Byggfirma AB'
								required
							/>
						</div>

						<div className='space-y-2'>
							<Label>Organisation ID</Label>
							<Input value={organization.id} disabled className='bg-muted' />
							<p className='text-xs text-muted-foreground'>
								Detta är din unika organisations-ID i systemet
							</p>
						</div>

						<div className='space-y-2'>
							<Label>Skapad</Label>
							<Input
								value={new Date(organization.created_at).toLocaleDateString('sv-SE', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
								disabled
								className='bg-muted'
							/>
						</div>

					<div className='flex justify-end pt-4'>
						<Button type='submit' className='bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'>Spara ändringar</Button>
					</div>
				</CardContent>
			</Card>
		</form>

		<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
			<CardHeader>
				<CardTitle className='text-gray-900 dark:text-white'>Standardinställningar</CardTitle>
				<CardDescription className='text-gray-600 dark:text-gray-400'>
					Standardvärden för tidrapportering och material
				</CardDescription>
			</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label htmlFor='mileage_rate'>Milersättning (kr/mil)</Label>
						<Input
							id='mileage_rate'
							type='number'
							step='0.50'
							defaultValue='18.50'
							placeholder='18.50'
						/>
						<p className='text-xs text-muted-foreground'>
							Standard milersättning enligt Skatteverket 2025
						</p>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='default_work_hours'>Standard arbetstid (timmar/dag)</Label>
						<Input
							id='default_work_hours'
							type='number'
							step='0.5'
							defaultValue='8'
							placeholder='8'
						/>
					</div>

					<p className='text-sm text-muted-foreground bg-muted p-3 rounded-md'>
						<strong>Obs:</strong> Dessa inställningar kommer att aktiveras i en senare version.
						För närvarande är de endast visuella.
					</p>

					<div className='flex justify-end pt-4'>
						<Button disabled variant='outline'>
							Spara ändringar (Kommer snart)
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

