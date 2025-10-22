import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revalidatePath } from 'next/cache';

export default async function ProfilePage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/sign-in');
	}

	// Fetch user profile
	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', user.id)
		.single();

	// Fetch user's role from membership
	const { data: membership } = await supabase
		.from('memberships')
		.select('role, organizations(name)')
		.eq('user_id', user.id)
		.eq('is_active', true)
		.single();

	// Map role to Swedish display name
	const roleDisplayNames: Record<string, string> = {
		admin: 'Administratör',
		foreman: 'Arbetsledare',
		worker: 'Arbetare',
		finance: 'Ekonomi',
	};

	const roleDisplay = membership?.role ? roleDisplayNames[membership.role] : 'Okänd';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orgName = (membership?.organizations as any)?.name || 'Ingen organisation';

	async function updateProfile(formData: FormData) {
		'use server';

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) return;

		const full_name = formData.get('full_name') as string;
		const phone = formData.get('phone') as string;

		const { error } = await supabase
			.from('profiles')
			.update({
				full_name,
				phone,
				updated_at: new Date().toISOString(),
			})
			.eq('id', user.id);

		if (error) {
			throw new Error(error.message);
		}

		revalidatePath('/dashboard/settings/profile');
	}

	return (
		<div className='container mx-auto p-6 lg:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-gray-900 dark:text-white'>Min profil</h1>
				<p className='text-gray-600 dark:text-gray-400 mt-2'>
					Hantera dina personliga uppgifter
				</p>
			</div>

		<form action={updateProfile}>
			<Card className='border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950'>
				<CardHeader>
					<CardTitle className='text-gray-900 dark:text-white'>Personuppgifter</CardTitle>
					<CardDescription className='text-gray-600 dark:text-gray-400'>
						Uppdatera ditt namn och kontaktinformation
					</CardDescription>
				</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='email'>E-postadress</Label>
							<Input
								id='email'
								type='email'
								value={user.email}
								disabled
								className='bg-muted'
							/>
							<p className='text-xs text-muted-foreground'>
								E-postadressen kan inte ändras
							</p>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='full_name'>Fullständigt namn</Label>
							<Input
								id='full_name'
								name='full_name'
								defaultValue={profile?.full_name || ''}
								placeholder='Ex: Johan Andersson'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='phone'>Telefonnummer</Label>
							<Input
								id='phone'
								name='phone'
								type='tel'
								defaultValue={profile?.phone || ''}
								placeholder='Ex: 070-123 45 67'
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
				<CardTitle className='text-gray-900 dark:text-white'>Kontoinformation</CardTitle>
			</CardHeader>
			<CardContent className='space-y-3 text-sm'>
				<div className='flex justify-between items-center'>
					<span className='text-gray-600 dark:text-gray-400'>Roll:</span>
					<span className='font-semibold text-gray-900 dark:text-white'>{roleDisplay}</span>
				</div>
				<div className='flex justify-between items-center'>
					<span className='text-gray-600 dark:text-gray-400'>Organisation:</span>
					<span className='text-gray-900 dark:text-white'>{orgName}</span>
				</div>
				<div className='flex justify-between pt-2 border-t border-gray-200 dark:border-gray-800'>
					<span className='text-gray-600 dark:text-gray-400'>Användar-ID:</span>
					<span className='font-mono text-xs text-gray-900 dark:text-white'>{user.id}</span>
				</div>
				<div className='flex justify-between'>
					<span className='text-gray-600 dark:text-gray-400'>Registrerad:</span>
					<span className='text-gray-900 dark:text-white'>
						{new Date(profile?.created_at || '').toLocaleDateString('sv-SE', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
						})}
					</span>
				</div>
				</CardContent>
			</Card>
		</div>
	);
}

