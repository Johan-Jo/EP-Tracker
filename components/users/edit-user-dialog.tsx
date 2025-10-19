'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@zod/resolvers/zod';
import { z } from 'zod';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const editUserSchema = z.object({
	role: z.enum(['admin', 'foreman', 'worker', 'finance']),
	hourly_rate_sek: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
	userId: string;
	currentRole: string;
	currentHourlyRate?: number | null;
	userName: string;
	userEmail: string;
	onSuccess?: () => void;
}

export function EditUserDialog({
	userId,
	currentRole,
	currentHourlyRate,
	userName,
	userEmail,
	onSuccess,
}: EditUserDialogProps) {
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeactivating, setIsDeactivating] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset,
	} = useForm<EditUserFormData>({
		resolver: zodResolver(editUserSchema),
		defaultValues: {
			role: currentRole as any,
			hourly_rate_sek: currentHourlyRate?.toString() || '',
		},
	});

	const selectedRole = watch('role');

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			reset({
				role: currentRole as any,
				hourly_rate_sek: currentHourlyRate?.toString() || '',
			});
		}
	}, [open, currentRole, currentHourlyRate, reset]);

	const onSubmit = async (data: EditUserFormData) => {
		setIsSubmitting(true);

		try {
			const payload: any = {
				role: data.role,
			};

			// Convert hourly rate to number if provided
			if (data.hourly_rate_sek && data.hourly_rate_sek.trim() !== '') {
				payload.hourly_rate_sek = parseFloat(data.hourly_rate_sek);
			} else {
				payload.hourly_rate_sek = null;
			}

			const response = await fetch(`/api/users/${userId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to update user');
			}

			// Success!
			setOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error('Error updating user:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att uppdatera användare');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeactivate = async () => {
		if (!confirm(`Är du säker på att du vill inaktivera ${userName}? De kommer inte längre ha åtkomst till organisationen.`)) {
			return;
		}

		setIsDeactivating(true);

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to deactivate user');
			}

			// Success!
			setOpen(false);
			onSuccess?.();
		} catch (error) {
			console.error('Error deactivating user:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att inaktivera användare');
		} finally {
			setIsDeactivating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="ghost">
					<Pencil className="w-4 h-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Redigera användare</DialogTitle>
						<DialogDescription>
							Uppdatera roll och timtaxa för {userName}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>E-postadress</Label>
							<Input value={userEmail} disabled />
							<p className="text-xs text-muted-foreground">
								E-postadressen kan inte ändras
							</p>
						</div>

						<div className="grid gap-2">
							<Label>Namn</Label>
							<Input value={userName} disabled />
							<p className="text-xs text-muted-foreground">
								Användaren kan uppdatera sitt namn i sin profil
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="role">Roll *</Label>
							<Select
								value={selectedRole}
								onValueChange={(value) => setValue('role', value as any)}
								disabled={isSubmitting || isDeactivating}
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
								disabled={isSubmitting || isDeactivating}
							/>
							{errors.hourly_rate_sek && (
								<p className="text-sm text-destructive">{errors.hourly_rate_sek.message}</p>
							)}
							<p className="text-xs text-muted-foreground">
								Används för löneexport och rapporter.
							</p>
						</div>

						<div className="pt-4 border-t">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium">Inaktivera användare</p>
									<p className="text-xs text-muted-foreground">
										Ta bort användarens åtkomst till organisationen
									</p>
								</div>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={handleDeactivate}
									disabled={isSubmitting || isDeactivating}
								>
									{isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									{!isDeactivating && <Trash2 className="w-4 h-4 mr-2" />}
									Inaktivera
								</Button>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isSubmitting || isDeactivating}
						>
							Avbryt
						</Button>
						<Button type="submit" disabled={isSubmitting || isDeactivating}>
							{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Spara ändringar
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

