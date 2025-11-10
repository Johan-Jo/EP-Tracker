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
import { Loader2, Plus, X, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { SignatureInput } from '@/components/shared/signature-input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const checklistSchema = z.object({
	project_id: z.string().uuid('Välj ett projekt'),
	template_id: z.string().uuid().nullable().optional(),
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
	const [newItemText, setNewItemText] = useState('');
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
		if (selectedTemplate && selectedTemplate !== 'none' && templates) {
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
		} else if (selectedTemplate === 'none') {
			// Clear items when "no template" is selected
			setItems([]);
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
		if (newItemText.trim()) {
			const newItem: ChecklistItem = {
				id: `custom-${Date.now()}`,
				text: newItemText.trim(),
				checked: false,
				notes: '',
			};
			setItems([...items, newItem]);
			setNewItemText('');
		}
	};

	const removeItem = (id: string) => {
		setItems(items.filter(item => item.id !== id));
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
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
			{/* Project & Template Selection Card */}
			<div className="bg-card border-2 border-border rounded-xl p-5 space-y-4">
				{!projectId && (
					<div className="space-y-2">
						<Label htmlFor="project_id" className="flex items-center gap-1 text-base font-medium">
							Projekt <span className="text-destructive">*</span>
						</Label>
						<Select
							value={selectedProject ?? ''}
							onValueChange={(value) => setValue('project_id', value)}
						>
							<SelectTrigger id="project_id" className="h-12 border-2 hover:border-primary/30 transition-colors">
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
							<p className="text-sm text-destructive mt-1 flex items-center gap-1">
								⚠️ {errors.project_id.message}
							</p>
						)}
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="template_id" className="text-base font-medium">Välj mall (valfritt)</Label>
					<Select
						value={selectedTemplate ?? 'none'}
						onValueChange={(value) => setValue('template_id', value === 'none' ? null : value)}
					>
						<SelectTrigger id="template_id" className="h-12 border-2 hover:border-primary/30 transition-colors">
							<SelectValue placeholder="Välj en mall eller skapa egen" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">✨ Ingen mall - Skapa egen</SelectItem>
							{templates?.map((template: { id: string; name: string; category: string }) => (
								<SelectItem key={template.id} value={template.id}>
									{template.category ? `[${template.category}] ` : ''}{template.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground mt-1">
						Välj en mall för att snabbt komma igång med förifyllda punkter
					</p>
				</div>

				<div className="space-y-2">
					<Label htmlFor="title" className="flex items-center gap-1 text-base font-medium">
						Titel <span className="text-destructive">*</span>
					</Label>
					<Input
						id="title"
						{...register('title')}
						placeholder="T.ex. Säkerhetscheck 2025-10-19"
						className="h-12 border-2 hover:border-primary/30 focus:border-primary transition-colors"
					/>
					{errors.title && (
						<p className="text-sm text-destructive mt-1 flex items-center gap-1">
							⚠️ {errors.title.message}
						</p>
					)}
				</div>
			</div>

			{/* Checkpoints Card */}
			<div className="bg-card border-2 border-border rounded-xl p-5 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<Label className="text-base font-medium">Checkpunkter</Label>
						<p className="text-xs text-muted-foreground mt-0.5">
							Lägg till punkter som ska kontrolleras
						</p>
					</div>
					<div className="flex items-center gap-2 px-3 py-1 bg-accent rounded-full">
						<span className="text-xs font-medium text-muted-foreground">Totalt:</span>
						<span className="text-sm font-bold text-primary">{items.length}</span>
					</div>
				</div>

				{/* Add New Item */}
				<div className="flex gap-2">
					<div className="relative flex-1">
						<Input
							value={newItemText}
							onChange={(e) => setNewItemText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addCustomItem();
								}
							}}
							placeholder="Skriv en ny checkpunkt och tryck Enter..."
							className="h-12 border-2 pl-10 hover:border-primary/30 focus:border-primary transition-colors"
						/>
						<Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
					</div>
					<Button
						type="button"
						onClick={addCustomItem}
						disabled={!newItemText.trim()}
						className="h-12 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
					>
						Lägg till
					</Button>
				</div>

				{/* Items List */}
				{items.length === 0 ? (
					<div className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-muted/30">
						<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/50 mb-4">
							<Plus className="w-8 h-8 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground mb-1">
							Inga checkpunkter ännu
						</p>
						<p className="text-xs text-muted-foreground">
							Välj en mall eller lägg till egna punkter för att komma igång
						</p>
					</div>
				) : (
					<div className="space-y-2">
						{items.map((item, index) => (
							<div
								key={item.id}
								className="flex items-center gap-3 p-4 bg-accent/30 border-2 border-transparent hover:border-primary/30 rounded-lg hover:bg-accent/50 transition-all group"
							>
								<button
									type="button"
									className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
									title="Drag för att omorganisera"
								>
									<GripVertical className="w-5 h-5" />
								</button>

								<Checkbox
									id={`item-${item.id}`}
									checked={item.checked}
									onCheckedChange={(checked) => toggleItem(item.id)}
									className="border-2"
								/>

								<label
									htmlFor={`item-${item.id}`}
									className="flex-1 cursor-pointer text-sm font-medium"
								>
									{item.text}
								</label>

								<div className="flex items-center gap-2">
									<span className="text-xs font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-full">
										#{index + 1}
									</span>

									<button
										type="button"
										onClick={() => removeItem(item.id)}
										className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
										title="Ta bort punkt"
									>
										<X className="w-4 h-4" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Signature */}
			{allChecked && (
				<div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
					<SignatureInput
						onSign={setSignature}
						label="✅ Signatur (alla punkter är checkade)"
						existingSignature={signature}
					/>
				</div>
			)}

			{/* Action Buttons */}
			<div className="flex gap-3 pt-2">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={createChecklistMutation.isPending}
						className="flex-1 md:flex-none h-12 border-2"
					>
						Avbryt
					</Button>
				)}
				<Button
					type="submit"
					disabled={createChecklistMutation.isPending || items.length === 0}
					className="flex-1 md:flex-auto h-12 text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all"
				>
					{createChecklistMutation.isPending && (
						<Loader2 className="mr-2 h-5 w-5 animate-spin" />
					)}
					{createChecklistMutation.isPending ? 'Sparar...' : 'Spara checklista'}
				</Button>
			</div>
		</form>
	);
}

