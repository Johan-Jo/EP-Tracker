'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { crewClockInSchema, type CrewClockInInput } from '@/lib/schemas/time-entry';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, CheckCircle2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface CrewClockInProps {
	orgId: string;
	onSuccess?: () => void;
}

export function CrewClockIn({ orgId, onSuccess }: CrewClockInProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
	const [selectedProject, setSelectedProject] = useState('');

	const supabase = createClient();

	const {
		setValue,
		watch,
		handleSubmit,
		formState: { errors },
	} = useForm<CrewClockInInput>({
		resolver: zodResolver(crewClockInSchema),
		defaultValues: {
			start_at: new Date().toISOString(),
		},
	});

	// Fetch organization members
	const { data: members, isLoading: membersLoading } = useQuery({
		queryKey: ['org-members', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('memberships')
				.select(`
					user_id,
					role,
					profiles!inner (
						id,
						full_name,
						email
					)
				`)
				.eq('org_id', orgId)
				.eq('is_active', true)
				.order('role');

			if (error) throw error;
			
			// Map the data to handle the profiles array correctly
			return (data || []).map((member: any) => ({
				user_id: member.user_id,
				role: member.role,
				profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
			}));
		},
	});

	// Fetch active projects
	const { data: projects, isLoading: projectsLoading } = useQuery({
		queryKey: ['active-projects', orgId],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('projects')
				.select('id, name, project_number')
				.eq('org_id', orgId)
				.eq('status', 'active')
				.order('name');

			if (error) throw error;
			return data || [];
		},
	});

	// Fetch phases for selected project
	const { data: phases } = useQuery({
		queryKey: ['phases', selectedProject],
		queryFn: async () => {
			if (!selectedProject) return [];
			const { data, error } = await supabase
				.from('phases')
				.select('id, name')
				.eq('project_id', selectedProject)
				.order('sort_order');

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedProject,
	});

	const toggleUser = (userId: string) => {
		const newSelected = new Set(selectedUsers);
		if (newSelected.has(userId)) {
			newSelected.delete(userId);
		} else {
			newSelected.add(userId);
		}
		setSelectedUsers(newSelected);
		setValue('user_ids', Array.from(newSelected));
	};

	const selectAll = () => {
		const allUserIds = members?.map((m) => m.user_id) || [];
		setSelectedUsers(new Set(allUserIds));
		setValue('user_ids', allUserIds);
	};

	const clearAll = () => {
		setSelectedUsers(new Set());
		setValue('user_ids', []);
	};

	const onSubmit = async (data: CrewClockInInput) => {
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/time/crew', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to clock in crew');
			}

			const result = await response.json();
			alert(`Startat tid för ${result.count} användare`);
			clearAll();
			onSuccess?.();
		} catch (error) {
			console.error('Error clocking in crew:', error);
			alert(error instanceof Error ? error.message : 'Misslyckades att starta bemanning');
		} finally {
			setIsSubmitting(false);
		}
	};

	const getInitials = (name: string | null, email: string): string => {
		if (name) {
			return name
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return email.slice(0, 2).toUpperCase();
	};

	const getRoleBadge = (role: string) => {
		const labels: Record<string, string> = {
			admin: 'Admin',
			foreman: 'Arbetsledare',
			worker: 'Arbetare',
		};
		return labels[role] || role;
	};

	return (
		<Card className="border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
			<CardHeader>
				<div className="flex items-center gap-3">
					<Users className="w-6 h-6 text-primary" />
					<div>
						<CardTitle>Starta bemanning</CardTitle>
						<CardDescription>
							Starta tid för flera användare samtidigt
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{/* Project Selection */}
					<div className="space-y-2">
						<Label>Projekt *</Label>
						{projectsLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Laddar projekt...
							</div>
						) : (
							<Select
								value={watch('project_id') || ''}
								onValueChange={(value) => {
									setValue('project_id', value);
									setSelectedProject(value);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj projekt" />
								</SelectTrigger>
								<SelectContent>
									{projects?.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
											{project.project_number && ` (${project.project_number})`}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{errors.project_id && (
							<p className="text-sm text-destructive">{errors.project_id.message}</p>
						)}
					</div>

					{/* Phase Selection */}
					{selectedProject && phases && phases.length > 0 && (
						<div className="space-y-2">
							<Label>Fas (valfritt)</Label>
							<Select
								value={watch('phase_id') || ''}
								onValueChange={(value) => setValue('phase_id', value || null)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Välj fas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">Ingen fas</SelectItem>
									{phases?.map((phase) => (
										<SelectItem key={phase.id} value={phase.id}>
											{phase.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					{/* User Selection */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>Välj användare *</Label>
							<div className="flex gap-2">
								<Button type="button" size="sm" variant="outline" onClick={selectAll}>
									Välj alla
								</Button>
								<Button type="button" size="sm" variant="outline" onClick={clearAll}>
									Rensa
								</Button>
							</div>
						</div>

						{membersLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="w-4 h-4 animate-spin" />
								Laddar användare...
							</div>
						) : (
							<div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3">
								{members?.map((member) => {
									const profile = member.profiles;
									if (!profile) return null;

									const isSelected = selectedUsers.has(member.user_id);

									return (
										<div
											key={member.user_id}
											className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
												isSelected
													? 'bg-primary/10 border-primary'
													: 'hover:bg-muted'
											}`}
											onClick={() => toggleUser(member.user_id)}
										>
											<div className="relative">
												<Avatar>
													<AvatarFallback>
														{getInitials(profile.full_name, profile.email)}
													</AvatarFallback>
												</Avatar>
												{isSelected && (
													<CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-primary bg-background rounded-full" />
												)}
											</div>
											<div className="flex-1">
												<p className="font-medium">
													{profile.full_name || profile.email}
												</p>
												<p className="text-sm text-muted-foreground">
													{profile.email}
												</p>
											</div>
											<Badge variant="outline">{getRoleBadge(member.role)}</Badge>
										</div>
									);
								})}
							</div>
						)}

						{selectedUsers.size > 0 && (
							<p className="text-sm text-muted-foreground">
								{selectedUsers.size} användare valda
							</p>
						)}

						{errors.user_ids && (
							<p className="text-sm text-destructive">{errors.user_ids.message}</p>
						)}
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						className="w-full"
						disabled={isSubmitting || selectedUsers.size === 0}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Startar...
							</>
						) : (
							<>
								<Users className="w-4 h-4 mr-2" />
								Starta tid för {selectedUsers.size} användare
							</>
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

