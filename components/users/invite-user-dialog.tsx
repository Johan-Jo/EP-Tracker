'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const inviteUserSchema = z.object({
	email: z.string().email({ message: 'Ogiltig e-postadress' }),
	full_name: z.string().min(1, { message: 'Namn krävs' }),
	role: z.enum(['admin', 'foreman', 'worker', 'finance'], { message: 'Roll måste väljas' }),
	hourly_rate_sek: z.string().optional(),
});

type InviteUserFormData = z.infer<typeof inviteUserSchema>;

interface InviteUserDialogProps {
	onSuccess?: () => void;
}

export function InviteUserDialog({ onSuccess }: InviteUserDialogProps) {
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<InviteUserFormData>({
		resolver: zodResolver(inviteUserSchema),
		defaultValues: {
			role: 'worker',
		},
	});

	const selectedRole = watch('role');

	const onSubmit = async (data: InviteUserFormData) => {
		setIsSubmitting(true);

		try {
			const payload: any = {
				email: data.email,
				full_name: data.full_name,
				role: data.role,
			};

			// Convert hourly rate to number if provided
			if (data.hourly_rate_sek && data.hourly_rate_sek.trim() !== '') {
				payload.hourly_rate_sek = parseFloat(data.hourly_rate_sek);
			}

			const response = await fetch('/api/users/invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to send invitation');
			}

		// Success!
		reset();
		setOpen(false);
		toast.success('Inbjudan skickad!', {
			description: 'Användaren kommer att få ett e-postmeddelande med en länk för att aktivera sitt konto.',
			duration: 5000,
		});
		onSuccess?.();
	} catch (error) {
		console.error('Error inviting user:', error);
		toast.error('Misslyckades att skicka inbjudan', {
			description: error instanceof Error ? error.message : 'Något gick fel',
		});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button>
					<Mail className="w-4 h-4 mr-2" />
					Bjud in användare
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Bjud in ny användare</DialogTitle>
						<DialogDescription>
							Skicka en inbjudan via e-post. Användaren kommer att få en länk för att skapa sitt konto.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="email">E-postadress *</Label>
							<Input
								id="email"
								type="email"
								placeholder="namn@exempel.se"
								{...register('email')}
								disabled={isSubmitting}
							/>
							{errors.email && (
								<p className="text-sm text-destructive">{errors.email.message}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="full_name">Fullständigt namn *</Label>
							<Input
								id="full_name"
								placeholder="För- och efternamn"
								{...register('full_name')}
								disabled={isSubmitting}
							/>
							{errors.full_name && (
								<p className="text-sm text-destructive">{errors.full_name.message}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="role">Roll *</Label>
							<Select
								value={selectedRole}
								onValueChange={(value) => setValue('role', value as any)}
								disabled={isSubmitting}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj roll" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="worker">Arbetare</SelectItem>
									<SelectItem value="foreman">Arbetsledare</SelectItem>
									<SelectItem value="finance">Ekonomi</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
							{errors.role && (
								<p className="text-sm text-destructive">{errors.role.message}</p>
							)}
							<p className="text-xs text-muted-foreground">
								{selectedRole === 'admin' && 'Full åtkomst till alla funktioner'}
								{selectedRole === 'foreman' && 'Kan se alla data men inte hantera användare'}
								{selectedRole === 'finance' && 'Skrivskyddad åtkomst för fakturering och lön'}
								{selectedRole === 'worker' && 'Kan endast se och redigera sina egna data'}
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="hourly_rate_sek">Timtaxa (SEK)</Label>
							<Input
								id="hourly_rate_sek"
								type="number"
								step="0.01"
								min="0"
								placeholder="t.ex. 250"
								{...register('hourly_rate_sek')}
								disabled={isSubmitting}
							/>
							{errors.hourly_rate_sek && (
								<p className="text-sm text-destructive">{errors.hourly_rate_sek.message}</p>
							)}
							<p className="text-xs text-muted-foreground">
								Valfritt. Används för löneexport och rapporter.
							</p>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
							Avbryt
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Skicka inbjudan
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

