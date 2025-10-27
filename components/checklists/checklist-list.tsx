'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, CheckCircle, Circle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Checklist {
	id: string;
	title: string;
	created_at: string;
	completed_at: string | null;
	signed_by_name: string | null;
	checklist_data: {
		items: Array<{
			text: string;
			checked: boolean;
			notes?: string;
		}>;
	};
	project: {
		name: string;
		project_number: string | null;
	};
	template: {
		name: string;
		category: string;
	} | null;
	created_by_user: {
		full_name: string;
	};
}

interface ChecklistListProps {
	projectId?: string;
	orgId: string;
}

export function ChecklistList({ projectId, orgId }: ChecklistListProps) {
	const { data: checklists, isLoading } = useQuery({
		queryKey: ['checklists', orgId, projectId],
		queryFn: async () => {
			const url = new URL('/api/checklists', window.location.origin);
			if (projectId) url.searchParams.set('project_id', projectId);

			const response = await fetch(url);
			if (!response.ok) throw new Error('Failed to fetch checklists');
			
			const data = await response.json();
			return data.checklists as Checklist[];
		},
		staleTime: 2 * 60 * 1000,  // 2 minutes (checklists don't change often)
		gcTime: 5 * 60 * 1000,      // 5 minutes
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-muted-foreground">Laddar checklistor...</div>
			</div>
		);
	}

	if (!checklists || checklists.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<p className="text-muted-foreground">Inga checklistor ännu</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{checklists.map((checklist) => {
				const totalItems = checklist.checklist_data?.items?.length || 0;
				const checkedItems = checklist.checklist_data?.items?.filter(item => item.checked).length || 0;
				const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
				const isComplete = checklist.completed_at !== null;

				return (
					<Card key={checklist.id} className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="space-y-1 flex-1">
									<div className="flex items-center gap-2">
										{isComplete ? (
											<Badge variant="default" className="flex items-center gap-1">
												<CheckCircle className="h-3 w-3" />
												Klar
											</Badge>
										) : (
											<Badge variant="secondary" className="flex items-center gap-1">
												<Circle className="h-3 w-3" />
												Pågående
											</Badge>
										)}
										{checklist.template && (
											<Badge variant="outline">
												{checklist.template.category}
											</Badge>
										)}
										<Badge variant="secondary">
											{checkedItems}/{totalItems} ({progress}%)
										</Badge>
									</div>
									<CardTitle className="text-lg">{checklist.title}</CardTitle>
									{checklist.template && (
										<p className="text-sm text-muted-foreground">
											Mall: {checklist.template.name}
										</p>
									)}
								</div>
								<Button variant="ghost" size="icon" asChild>
									<Link href={`/dashboard/checklists/${checklist.id}`}>
										<Eye className="h-4 w-4" />
									</Link>
								</Button>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<div className="flex items-center justify-between text-sm">
								<div className="space-y-1">
									<p className="text-muted-foreground">
										Projekt: {checklist.project.project_number ? `${checklist.project.project_number} - ` : ''}{checklist.project.name}
									</p>
									<p className="text-xs text-muted-foreground flex items-center gap-1">
										<Calendar className="h-3 w-3" />
										Skapad: {new Date(checklist.created_at).toLocaleDateString('sv-SE')}
									</p>
									{checklist.signed_by_name && (
										<p className="text-xs text-muted-foreground">
											Signerad av: {checklist.signed_by_name}
										</p>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

