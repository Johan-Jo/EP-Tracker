'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const editUserSchema = z.object({
	role: z.enum(['admin', 'foreman', 'worker', 'finance', 'ue']),
	hourly_rate_sek: z.string().optional(), // Timtaxa debitering
	salary_per_hour_sek: z.string().optional(), // Timlön
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
	userId: string;
	currentRole: string;
	currentHourlyRate?: number | null;
	currentSalaryPerHour?: number | null;
	userName: string;
	userEmail: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

export function EditUserDialog({
	userId,
	currentRole,
	currentHourlyRate,
	currentSalaryPerHour,
	userName,
	userEmail,
	open: controlledOpen,
	onOpenChange,
	onSuccess,
}: EditUserDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeactivating, setIsDeactivating] = useState(false);
	const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

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
			salary_per_hour_sek: currentSalaryPerHour?.toString() || '',
		},
	});

	const selectedRole = watch('role');

	// Reset form when dialog opens
	useEffect(() => {
		if (open) {
			reset({
				role: currentRole as any,
				hourly_rate_sek: currentHourlyRate?.toString() || '',
				salary_per_hour_sek: currentSalaryPerHour?.toString() || '',
			});
		}
	}, [open, currentRole, currentHourlyRate, currentSalaryPerHour, reset]);

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

			// Convert salary per hour to number if provided
			if (data.salary_per_hour_sek && data.salary_per_hour_sek.trim() !== '') {
				payload.salary_per_hour_sek = parseFloat(data.salary_per_hour_sek);
			} else {
				payload.salary_per_hour_sek = null;
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

	const handleDeactivate = () => {
		setShowDeactivateDialog(true);
	};

	const confirmDeactivate = async () => {
		setIsDeactivating(true);
		setShowDeactivateDialog(false);

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
		<>
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit(onSubmit)}>
					<DialogHeader>
						<DialogTitle>Redigera användare</DialogTitle>
						<DialogDescription>
							Uppdatera roll, timtaxa debitering och timlön för {userName}
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
									<SelectItem value="ue">UE (Underentreprenör)</SelectItem>
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
								{selectedRole === 'ue' && 'Underentreprenör med samma behörigheter som arbetare'}
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="hourly_rate_sek">Timtaxa debitering (SEK)</Label>
							<Input
								id="hourly_rate_sek"
								type="number"
								step="0.01"
								min="0"
								placeholder="t.ex. 399"
								{...register('hourly_rate_sek')}
								disabled={isSubmitting || isDeactivating}
							/>
							{errors.hourly_rate_sek && (
								<p className="text-sm text-destructive">{errors.hourly_rate_sek.message}</p>
							)}
							<p className="text-xs text-muted-foreground">
								Det belopp som faktureras kunden per timme.
							</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="salary_per_hour_sek">Timlön (SEK)</Label>
							<Input
								id="salary_per_hour_sek"
								type="number"
								step="0.01"
								min="0"
								placeholder="t.ex. 250"
								{...register('salary_per_hour_sek')}
								disabled={isSubmitting || isDeactivating}
							/>
							{errors.salary_per_hour_sek && (
								<p className="text-sm text-destructive">{errors.salary_per_hour_sek.message}</p>
							)}
							<p className="text-xs text-muted-foreground">
								Faktisk lön per timme som används för beräkning av bruttolön.
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

		{/* Deactivate Confirmation Dialog */}
		<AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Inaktivera användare?</AlertDialogTitle>
					<AlertDialogDescription>
						Är du säker på att du vill inaktivera <strong>{userName}</strong>? De kommer inte längre ha åtkomst till organisationen.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeactivating}>Avbryt</AlertDialogCancel>
					<AlertDialogAction
						onClick={confirmDeactivate}
						disabled={isDeactivating}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Inaktivera
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</>
	);
}

