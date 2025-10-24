'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Loader2, UserCheck, Mail, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ManageTeamDialog } from '@/components/projects/manage-team-dialog';
import { toast } from 'sonner';

interface ProjectMember {
	id: string;
	user_id: string;
	created_at: string;
	profiles: {
		id: string;
		full_name: string;
		email: string;
	};
}

interface ProjectTeamTabProps {
	projectId: string;
	projectName: string;
	canEdit: boolean;
}

export function ProjectTeamTab({ projectId, projectName, canEdit }: ProjectTeamTabProps) {
	const [showTeamDialog, setShowTeamDialog] = useState(false);
	const [members, setMembers] = useState<ProjectMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [removing, setRemoving] = useState<string | null>(null);

	useEffect(() => {
		fetchMembers();
	}, [projectId]);

	const fetchMembers = async () => {
		try {
			const response = await fetch(`/api/projects/${projectId}/members`);
			if (response.ok) {
				const data = await response.json();
				setMembers(data.members || []);
			}
		} catch (error) {
			console.error('Error fetching project members:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleDialogClose = (open: boolean) => {
		setShowTeamDialog(open);
		if (!open) {
			// Refresh members when dialog closes
			fetchMembers();
		}
	};

	const handleRemoveMember = async (userId: string, userName: string) => {
		if (!confirm(`Är du säker på att du vill ta bort ${userName} från projektet?`)) {
			return;
		}

		setRemoving(userId);
		try {
			const response = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to remove member');
			}

			setMembers(members.filter((m) => m.user_id !== userId));
			toast.success(`${userName} borttagen från projektet`);
		} catch (error) {
			console.error('Error removing member:', error);
			toast.error('Misslyckades att ta bort medlem');
		} finally {
			setRemoving(null);
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className='flex items-center gap-2'>
								<Users className='w-5 h-5' />
								Projektteam
							</CardTitle>
							<CardDescription>
								Hantera vilka användare som har tillgång till detta projekt
							</CardDescription>
						</div>
						{canEdit && (
							<Button onClick={() => setShowTeamDialog(true)}>
								<Plus className='w-4 h-4 mr-2' />
								Hantera team
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Project Members List */}
						<div>
							<h3 className="font-semibold text-sm mb-3">
								Projektmedlemmar ({members.length})
							</h3>
							{loading ? (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
								</div>
							) : members.length === 0 ? (
								<div className="text-center py-8 px-4 bg-muted/50 rounded-lg border-2 border-dashed">
									<UserCheck className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
									<p className="text-sm text-muted-foreground">
										Inga arbetare tillagda i projektet än
									</p>
									{canEdit && (
										<p className="text-xs text-muted-foreground mt-1">
											Klicka på "Hantera team" för att lägga till användare
										</p>
									)}
								</div>
							) : (
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{members.map((member) => (
										<div
											key={member.id}
											className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
										>
											<Avatar className="w-10 h-10">
												<AvatarFallback className="bg-primary text-primary-foreground text-sm">
													{getInitials(member.profiles.full_name)}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="font-medium text-sm truncate">
													{member.profiles.full_name}
												</p>
												<p className="text-xs text-muted-foreground truncate flex items-center gap-1">
													<Mail className="w-3 h-3" />
													{member.profiles.email}
												</p>
											</div>
											{canEdit && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleRemoveMember(member.user_id, member.profiles.full_name)}
													disabled={removing === member.user_id}
													className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
													title={`Ta bort ${member.profiles.full_name} från projektet`}
												>
													{removing === member.user_id ? (
														<Loader2 className="w-4 h-4 animate-spin" />
													) : (
														<X className="w-4 h-4" />
													)}
												</Button>
											)}
										</div>
									))}
								</div>
							)}
						</div>

						{/* Info Box */}
						<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<h3 className="font-semibold text-sm text-blue-900 mb-2">ℹ️ Om projektåtkomst</h3>
							<ul className="text-sm text-blue-800 space-y-1">
								<li>• <strong>Arbetare</strong> kan bara se projekt de är tilldelade</li>
								<li>• <strong>Arbetsledare & Admins</strong> ser alla projekt automatiskt</li>
								<li>• Använd "Hantera team" för att lägga till arbetare i projektet</li>
							</ul>
						</div>

						{!canEdit && (
							<p className='text-sm text-muted-foreground'>
								Endast admins och arbetsledare kan hantera projektmedlemmar.
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<ManageTeamDialog
				projectId={projectId}
				projectName={projectName}
				open={showTeamDialog}
				onOpenChange={handleDialogClose}
				canEdit={canEdit}
			/>
		</>
	);
}

