'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { membershipRoleEnum } from '@/lib/schemas/organization';
import { useRouter } from 'next/navigation';

const inviteUserSchema = z.object({
	email: z.string().email({ message: 'Ogiltig e-postadress' }),
	full_name: z.string().min(1, { message: 'Namn krävs' }).optional().nullable(),
	role: membershipRoleEnum,
	hourly_rate_sek: z.number().min(0, { message: 'Timtaxa måste vara positiv' }).optional().nullable(),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

interface InviteUserFormProps {
	orgId: string;
}

const roleDescriptions = {
	worker: 'Kan endast se och redigera sina egna data',
	foreman: 'Kan se alla data men inte hantera användare eller organisation',
	finance: 'Skrivskyddad åtkomst för fakturering och lönehantering',
	admin: 'Full åtkomst till alla funktioner inklusive användarhantering',
};

export function InviteUserForm({ orgId }: InviteUserFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const form = useForm<InviteUserFormValues>({
		resolver: zodResolver(inviteUserSchema),
		defaultValues: {
			email: '',
			full_name: '',
			role: 'worker',
			hourly_rate_sek: null,
		},
	});

	const selectedRole = form.watch('role');

	const onSubmit = async (values: InviteUserFormValues) => {
		setIsSubmitting(true);
		setError(null);

		try {
			// Convert empty string to null for hourly_rate_sek
			const payload = {
				...values,
				hourly_rate_sek: values.hourly_rate_sek === null || values.hourly_rate_sek === undefined ? null : values.hourly_rate_sek,
			};

			const response = await fetch('/api/users/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Misslyckades att skicka inbjudan');
			}

			// Success - redirect back to users page
			router.push('/dashboard/settings/users?invited=true');
		} catch (error: any) {
			setError(error.message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			{error && (
				<div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
					{error}
				</div>
			)}

			<div className="space-y-2">
				<label htmlFor="email" className="text-sm font-medium">
					E-postadress <span className="text-red-500">*</span>
				</label>
				<Input
					id="email"
					type="email"
					placeholder="användare@ep-tracker.se"
					{...form.register('email')}
				/>
				{form.formState.errors.email && (
					<p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
				)}
				<p className="text-sm text-muted-foreground">
					Inbjudan skickas till denna e-postadress
				</p>
			</div>

			<div className="space-y-2">
				<label htmlFor="full_name" className="text-sm font-medium">
					Fullständigt namn <span className="text-red-500">*</span>
				</label>
				<Input
					id="full_name"
					type="text"
					placeholder="Förnamn Efternamn"
					{...form.register('full_name')}
				/>
				{form.formState.errors.full_name && (
					<p className="text-sm text-red-600">{form.formState.errors.full_name.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<label htmlFor="role" className="text-sm font-medium">
					Roll <span className="text-red-500">*</span>
				</label>
				<Select
					name="role"
					value={form.watch('role')}
					onValueChange={(value) => form.setValue('role', value as any)}
				>
					<SelectTrigger id="role">
						<SelectValue placeholder="Välj roll" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="worker">Arbetare</SelectItem>
						<SelectItem value="foreman">Arbetsledare</SelectItem>
						<SelectItem value="finance">Ekonomi</SelectItem>
						<SelectItem value="admin">Admin</SelectItem>
					</SelectContent>
				</Select>
				{form.formState.errors.role && (
					<p className="text-sm text-red-600">{form.formState.errors.role.message}</p>
				)}
				<p className="text-sm text-muted-foreground">
					{roleDescriptions[selectedRole as keyof typeof roleDescriptions]}
				</p>
			</div>

			<div className="space-y-2">
				<label htmlFor="hourly_rate_sek" className="text-sm font-medium">
					Timtaxa (SEK)
				</label>
				<Input
					id="hourly_rate_sek"
					type="number"
					step="0.01"
					placeholder="t.ex. 250"
					{...form.register('hourly_rate_sek')}
				/>
				{form.formState.errors.hourly_rate_sek && (
					<p className="text-sm text-red-600">
						{form.formState.errors.hourly_rate_sek.message}
					</p>
				)}
				<p className="text-sm text-muted-foreground">
					Valfritt. Används för löneexport och rapporter.
				</p>
			</div>

			<div className="flex gap-3 pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.back()}
					disabled={isSubmitting}
				>
					Avbryt
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Skicka inbjudan
				</Button>
			</div>
		</form>
	);
}

