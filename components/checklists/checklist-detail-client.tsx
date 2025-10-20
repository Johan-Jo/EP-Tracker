'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Calendar, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ChecklistDetailClientProps {
	checklistId: string;
}

export function ChecklistDetailClient({ checklistId }: ChecklistDetailClientProps) {
	const supabase = createClient();

	const { data: checklist, isLoading } = useQuery({
		queryKey: ['checklist', checklistId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('checklists')
				.select(`
					*,
					project:projects(name, project_number),
					template:checklist_templates(name, category),
					created_by_user:profiles!checklists_created_by_fkey(full_name)
				`)
				.eq('id', checklistId)
				.single();

			if (error) throw error;
			return data;
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar checklista...</div>
			</div>
		);
	}

	if (!checklist) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<p className="text-muted-foreground">Checklista hittades inte</p>
				</CardContent>
			</Card>
		);
	}

	const items = checklist.checklist_data?.items || [];
	const totalItems = items.length;
	const checkedItems = items.filter((item: {checked: boolean}) => item.checked).length;
	const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
	const isComplete = checklist.completed_at !== null;

	return (
		<div className="max-w-4xl space-y-6">
			{/* Header Card */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<CardTitle className="text-2xl">{checklist.title}</CardTitle>
							<p className="text-sm text-muted-foreground">
								Projekt: {checklist.project.project_number ? `${checklist.project.project_number} - ` : ''}{checklist.project.name}
							</p>
						</div>
					</div>
					<div className="flex flex-wrap gap-2 mt-4">
						{isComplete ? (
							<Badge variant="default" className="flex items-center gap-1">
								<CheckCircle2 className="h-3 w-3" />
								Klar ({progress}%)
							</Badge>
						) : (
							<Badge variant="secondary" className="flex items-center gap-1">
								<Circle className="h-3 w-3" />
								Pågående ({progress}%)
							</Badge>
						)}
						{checklist.template && (
							<Badge variant="outline">
								{checklist.template.category} - {checklist.template.name}
							</Badge>
						)}
						<Badge variant="secondary">
							{checkedItems}/{totalItems} punkter
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<p className="flex items-center gap-2 text-muted-foreground">
							<Calendar className="h-4 w-4" />
							Skapad: {new Date(checklist.created_at).toLocaleDateString('sv-SE', {
								weekday: 'long',
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</p>
						{checklist.created_by_user && (
							<p className="text-muted-foreground">
								Skapad av: {checklist.created_by_user.full_name}
							</p>
						)}
						{checklist.completed_at && (
							<p className="text-muted-foreground">
								Slutförd: {new Date(checklist.completed_at).toLocaleDateString('sv-SE')}
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Checklist Items */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Checkpunkter
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{items.map((item: { text: string; checked: boolean; notes?: string }, index: number) => (
							<div key={index} className="border rounded-lg p-4 space-y-2">
								<div className="flex items-start gap-3">
									{item.checked ? (
										<CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
									) : (
										<Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
									)}
									<div className="flex-1">
										<p className={item.checked ? 'line-through text-muted-foreground' : ''}>
											{item.text}
										</p>
										{item.notes && (
											<p className="text-sm text-muted-foreground mt-1 italic">
												📝 {item.notes}
											</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Signature */}
			{checklist.signed_by_name && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle2 className="h-5 w-5 text-primary" />
							Signatur
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm">
							<strong>Signerad av:</strong> {checklist.signed_by_name}
						</p>
						{checklist.signed_at && (
							<p className="text-sm text-muted-foreground mt-1">
								{new Date(checklist.signed_at).toLocaleString('sv-SE')}
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

