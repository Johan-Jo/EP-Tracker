'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

// Form schema (simplified version of createAssignmentSchema)
const assignmentFormSchema = z.object({
	project_id: z.string().min(1, 'Projekt måste väljas'),
	user_ids: z.array(z.string()).min(1, 'Minst en person måste väljas'),
	date: z.string(),
	all_day: z.boolean(),
	start_time: z.string().optional(),
	end_time: z.string().optional(),
	address: z.string().optional(),
	note: z.string().optional(),
	sync_to_mobile: z.boolean(),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

interface AddAssignmentDialogProps {
	open: boolean;
	onClose: () => void;
	date?: string;
	person?: string;
	assignment?: any; // Full assignment object for edit mode
	onSubmit: (data: AssignmentFormData) => Promise<void>;
	projects?: Array<{ id: string; name: string; color: string }>;
	users?: Array<{ id: string; name: string }>;
}

export function AddAssignmentDialog({
	open,
	onClose,
	date,
	person,
	assignment,
	onSubmit,
	projects = [],
	users = [],
}: AddAssignmentDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isEditMode = !!assignment;

	// Extract default values from assignment if in edit mode
	const getDefaultValues = () => {
		if (assignment) {
			const startDate = new Date(assignment.start_ts);
			return {
				project_id: assignment.project_id || '',
				user_ids: [assignment.user_id],
				date: format(startDate, 'yyyy-MM-dd'),
				all_day: assignment.all_day,
				start_time: assignment.all_day ? '07:00' : format(startDate, 'HH:mm'),
				end_time: assignment.all_day ? '16:00' : format(new Date(assignment.end_ts), 'HH:mm'),
				address: assignment.address || '',
				note: assignment.note || '',
				sync_to_mobile: assignment.sync_to_mobile ?? true,
			};
		}
		return {
			project_id: '',
			user_ids: person ? [person] : [],
			date: date || format(new Date(), 'yyyy-MM-dd'),
			all_day: true,
			start_time: '07:00',
			end_time: '16:00',
			sync_to_mobile: true,
		};
	};

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
		setValue,
		reset,
	} = useForm<AssignmentFormData>({
		resolver: zodResolver(assignmentFormSchema),
		defaultValues: getDefaultValues(),
	});

	const allDay = watch('all_day');
	const currentDate = watch('date');

	// Reset form when dialog opens (only on open, not on assignment change)
	useEffect(() => {
		if (open) {
			reset(getDefaultValues());
		}
	}, [open]);

	const handleFormSubmit = async (data: AssignmentFormData) => {
		setIsSubmitting(true);
		try {
			// Add assignment ID if editing
			const submitData = isEditMode 
				? { ...data, id: assignment.id }
				: data;
			
			await onSubmit(submitData);
			reset();
			onClose();
		} catch (error) {
			console.error('Error submitting assignment:', error);
			// Error will be shown via toast in parent component
			// Re-throw so parent can handle it
			throw error;
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{isEditMode ? 'Redigera uppdrag' : 'Lägg till uppdrag'}</DialogTitle>
					<DialogDescription>
						{isEditMode 
							? 'Uppdatera information för detta uppdrag.' 
							: 'Skapa ett nytt uppdrag för ett projekt och tilldela personal.'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
					{/* Project Selection */}
					<div className="space-y-2">
						<Label htmlFor="project_id">Projekt *</Label>
						<Select 
							value={watch('project_id')} 
							onValueChange={(value) => setValue('project_id', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj projekt" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										<div className="flex items-center gap-2">
											<div
												className="w-3 h-3 rounded-full"
												style={{ backgroundColor: project.color }}
											/>
											{project.name}
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.project_id && (
							<p className="text-sm text-destructive">{errors.project_id.message}</p>
						)}
					</div>

					{/* User Selection (Multi-select placeholder - simplified for now) */}
					<div className="space-y-2">
						<Label htmlFor="user_ids">Personal *</Label>
						<Select 
							value={watch('user_ids')?.[0] || ''} 
							onValueChange={(value) => setValue('user_ids', [value])}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj personal" />
							</SelectTrigger>
							<SelectContent>
								{users.map((user) => (
									<SelectItem key={user.id} value={user.id}>
										{user.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.user_ids && (
							<p className="text-sm text-destructive">{errors.user_ids.message}</p>
						)}
					</div>

					{/* Date */}
					<div className="space-y-2">
						<Label htmlFor="date">Datum *</Label>
						<div className="relative">
							<Input
								id="date"
								type="date"
								value={currentDate || ''}
								onChange={(e) => {
									const newDate = e.target.value;
									setValue('date', newDate, { shouldValidate: true, shouldDirty: true });
								}}
								className="w-full"
							/>
							{currentDate && (
								<p className="text-xs text-muted-foreground mt-1">Valt datum: {currentDate}</p>
							)}
						</div>
						{errors.date && (
							<p className="text-sm text-destructive">{errors.date.message}</p>
						)}
					</div>

					{/* All Day Toggle */}
					<div className="flex items-center justify-between">
						<Label htmlFor="all_day">Heldag</Label>
						<Switch
							id="all_day"
							checked={allDay}
							onCheckedChange={(checked) => setValue('all_day', checked)}
						/>
					</div>

					{/* Time Range (disabled if all_day) */}
					{!allDay && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start_time">Starttid</Label>
								<Input
									type="time"
									{...register('start_time')}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="end_time">Sluttid</Label>
								<Input
									type="time"
									{...register('end_time')}
								/>
							</div>
						</div>
					)}

					{/* Address */}
					<div className="space-y-2">
						<Label htmlFor="address">Adress</Label>
						<Input
							{...register('address')}
							placeholder="T.ex. Storgatan 123"
						/>
					</div>

					{/* Note */}
					<div className="space-y-2">
						<Label htmlFor="note">Anteckning</Label>
						<Textarea
							{...register('note')}
							placeholder="Lägg till anteckningar..."
							rows={3}
						/>
					</div>

					{/* Sync to Mobile */}
					<div className="flex items-center justify-between">
						<Label htmlFor="sync_to_mobile">Synka till mobil</Label>
						<Switch
							id="sync_to_mobile"
							defaultChecked={true}
							onCheckedChange={(checked) => setValue('sync_to_mobile', checked)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Avbryt
						</Button>
						<Button 
							type="submit" 
							disabled={isSubmitting}
							className="shadow-lg"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Sparar...
								</>
							) : (
								'Spara'
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

