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
		<div className='p-4 md:p-8 space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight'>Min profil</h1>
				<p className='text-muted-foreground mt-2'>
					Hantera dina personliga uppgifter
				</p>
			</div>

			<form action={updateProfile}>
				<Card>
					<CardHeader>
						<CardTitle>Personuppgifter</CardTitle>
						<CardDescription>
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
							<Button type='submit'>Spara ändringar</Button>
						</div>
					</CardContent>
				</Card>
			</form>

			<Card>
				<CardHeader>
					<CardTitle>Kontoinformation</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3 text-sm'>
					<div className='flex justify-between items-center'>
						<span className='text-muted-foreground'>Roll:</span>
						<span className='font-semibold'>{roleDisplay}</span>
					</div>
					<div className='flex justify-between items-center'>
						<span className='text-muted-foreground'>Organisation:</span>
						<span>{orgName}</span>
					</div>
					<div className='flex justify-between pt-2 border-t'>
						<span className='text-muted-foreground'>Användar-ID:</span>
						<span className='font-mono text-xs'>{user.id}</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-muted-foreground'>Registrerad:</span>
						<span>
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

