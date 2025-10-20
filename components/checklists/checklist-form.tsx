'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SignatureInput } from '@/components/shared/signature-input';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const checklistSchema = z.object({
	project_id: z.string().uuid('Välj ett projekt'),
	template_id: z.string().uuid('Välj en mall').optional().nullable(),
	title: z.string().min(1, 'Titel krävs'),
});

type ChecklistFormData = z.infer<typeof checklistSchema>;

interface ChecklistFormProps {
	projectId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

interface ChecklistItem {
	id: string;
	text: string;
	checked: boolean;
	notes?: string;
}

export function ChecklistForm({ projectId, onSuccess, onCancel }: ChecklistFormProps) {
	const [items, setItems] = useState<ChecklistItem[]>([]);
	const [signature, setSignature] = useState<{ name: string; timestamp: string } | null>(null);
	const queryClient = useQueryClient();
	const supabase = createClient();
	const router = useRouter();

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<ChecklistFormData>({
		resolver: zodResolver(checklistSchema),
		defaultValues: {
			project_id: projectId || '',
			template_id: null,
			title: '',
		},
	});

	// Fetch projects
	const { data: projects } = useQuery({
		queryKey: ['projects'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.order('created_at', { ascending: false });
			if (error) throw error;
			return data;
		},
	});

	// Fetch templates
	const { data: templates } = useQuery({
		queryKey: ['checklist-templates'],
		queryFn: async () => {
			const response = await fetch('/api/checklists/templates');
			if (!response.ok) throw new Error('Failed to fetch templates');
			const data = await response.json();
			return data.templates;
		},
	});

	const selectedTemplate = watch('template_id');

	// Load template when selected
	useEffect(() => {
		if (selectedTemplate && templates) {
			const template = templates.find((t: { id: string }) => t.id === selectedTemplate);
			if (template && template.template_data?.items) {
				const templateItems = template.template_data.items.map((item: { text: string }, index: number) => ({
					id: `item-${index}`,
					text: item.text || item,
					checked: false,
					notes: '',
				}));
				setItems(templateItems);
				setValue('title', template.name);
			}
		}
	}, [selectedTemplate, templates, setValue]);

	const createChecklistMutation = useMutation({
		mutationFn: async (data: ChecklistFormData) => {
			const checklistData = {
				...data,
				checklist_data: {
					items: items.map(item => ({
						text: item.text,
						checked: item.checked,
						notes: item.notes,
					})),
				},
				completed_at: items.every(item => item.checked) ? new Date().toISOString() : null,
				signed_by_name: signature?.name || null,
				signed_at: signature?.timestamp || null,
			};

			const response = await fetch('/api/checklists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(checklistData),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Kunde inte skapa checklista');
			}

			return response.json();
		},
		onSuccess: () => {
			toast.success('Checklista sparad!');
			queryClient.invalidateQueries({ queryKey: ['checklists'] });
			
			if (onSuccess) {
				onSuccess();
			} else {
				setTimeout(() => {
					router.push('/dashboard/checklists');
					router.refresh();
				}, 1000);
			}
		},
		onError: (error: Error) => {
			console.error('Checklist save error:', error);
			toast.error(error.message || 'Kunde inte spara checklista');
		},
	});

	const toggleItem = (id: string) => {
		setItems(items.map(item => 
			item.id === id ? { ...item, checked: !item.checked } : item
		));
	};

	const updateNotes = (id: string, notes: string) => {
		setItems(items.map(item =>
			item.id === id ? { ...item, notes } : item
		));
	};

	const addCustomItem = () => {
		const newItem: ChecklistItem = {
			id: `custom-${Date.now()}`,
			text: 'Ny punkt...',
			checked: false,
			notes: '',
		};
		setItems([...items, newItem]);
	};

	const updateItemText = (id: string, text: string) => {
		setItems(items.map(item =>
			item.id === id ? { ...item, text } : item
		));
	};

	const onSubmit = (data: ChecklistFormData) => {
		if (items.length === 0) {
			toast.error('Lägg till minst en punkt i checklistan');
			return;
		}
		createChecklistMutation.mutate(data);
	};

	const selectedProject = watch('project_id');
	const allChecked = items.length > 0 && items.every(item => item.checked);

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
			<div className="space-y-4">
				{!projectId && (
					<div>
						<Label htmlFor="project_id">Projekt *</Label>
						<Select
							value={selectedProject || ''}
							onValueChange={(value) => setValue('project_id', value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Välj projekt" />
							</SelectTrigger>
							<SelectContent>
								{projects?.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.project_number ? `${project.project_number} - ` : ''}{project.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.project_id && (
							<p className="text-sm text-destructive mt-1">{errors.project_id.message}</p>
						)}
					</div>
				)}

				<div>
					<Label htmlFor="template_id">Välj mall (valfritt)</Label>
					<Select
						value={selectedTemplate || ''}
						onValueChange={(value) => setValue('template_id', value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Välj en mall eller skapa egen" />
						</SelectTrigger>
						<SelectContent>
							{templates?.map((template: { id: string; name: string; category: string }) => (
								<SelectItem key={template.id} value={template.id}>
									{template.category ? `[${template.category}] ` : ''}{template.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label htmlFor="title">Titel *</Label>
					<Input
						id="title"
						{...register('title')}
						placeholder="T.ex. Säkerhetscheck 2025-10-19"
					/>
					{errors.title && (
						<p className="text-sm text-destructive mt-1">{errors.title.message}</p>
					)}
				</div>

				{/* Checklist Items */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>Checkpunkter</span>
							<Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
								Lägg till punkt
							</Button>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{items.length === 0 && (
							<p className="text-muted-foreground text-center py-4">
								Välj en mall eller lägg till egna punkter
							</p>
						)}
						{items.map((item) => (
							<div key={item.id} className="border rounded-lg p-4 space-y-2">
								<div className="flex items-start gap-3">
									<button
										type="button"
										onClick={() => toggleItem(item.id)}
										className="mt-1"
									>
										{item.checked ? (
											<CheckCircle2 className="h-5 w-5 text-primary" />
										) : (
											<Circle className="h-5 w-5 text-muted-foreground" />
										)}
									</button>
									<Input
										value={item.text}
										onChange={(e) => updateItemText(item.id, e.target.value)}
										className="flex-1"
									/>
								</div>
								<Input
									placeholder="Anteckningar (valfritt)"
									value={item.notes || ''}
									onChange={(e) => updateNotes(item.id, e.target.value)}
									className="ml-8"
								/>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Signature */}
				{allChecked && (
					<div className="border-t pt-6">
						<SignatureInput
							onSign={setSignature}
							label="Signatur (när alla punkter är checkade)"
							existingSignature={signature}
						/>
					</div>
				)}
			</div>

			<div className="flex gap-3 justify-end">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={createChecklistMutation.isPending}
					>
						Avbryt
					</Button>
				)}
				<Button type="submit" disabled={createChecklistMutation.isPending}>
					{createChecklistMutation.isPending && (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					)}
					Spara checklista
				</Button>
			</div>
		</form>
	);
}

