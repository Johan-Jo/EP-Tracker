'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, X, Loader2, UserCheck, UserX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

interface OrgMember {
	id: string;
	user_id: string;
	role: string;
	profiles: {
		id: string;
		full_name: string;
		email: string;
	};
}

interface ManageTeamDialogProps {
	projectId: string;
	projectName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit?: boolean;
}

export function ManageTeamDialog({ projectId, projectName, open, onOpenChange, canEdit = true }: ManageTeamDialogProps) {
	const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
	const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const [removing, setRemoving] = useState<string | null>(null);
	const [selectedUserId, setSelectedUserId] = useState<string>('');

	// If user doesn't have edit permissions, close dialog immediately
	useEffect(() => {
		if (open && !canEdit) {
			toast.error('Du har inte behörighet att hantera projektmedlemmar');
			onOpenChange(false);
		}
	}, [open, canEdit, onOpenChange]);

	useEffect(() => {
		if (open) {
			fetchData();
		}
	}, [open, projectId]);

	const fetchData = async () => {
		setLoading(true);
		try {
			// Fetch both in parallel for better performance
			const [membersRes, allMembersRes] = await Promise.all([
				fetch(`/api/projects/${projectId}/members`),
				fetch('/api/organizations/members'),
			]);

			// Process project members
			if (membersRes.ok) {
				const data = await membersRes.json();
				setProjectMembers(data.members || []);
			}

			// Process org members
			if (allMembersRes.ok) {
				const data = await allMembersRes.json();
				setOrgMembers(data.members || []);
			}
		} catch (error) {
			console.error('Error fetching team data:', error);
			toast.error('Misslyckades att ladda teammedlemmar');
		} finally {
			setLoading(false);
		}
	};

	const handleAddMember = async () => {
		if (!selectedUserId) {
			toast.error('Välj en användare');
			return;
		}

		setAdding(true);
		try {
			const response = await fetch(`/api/projects/${projectId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user_id: selectedUserId }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to add member');
			}

			const data = await response.json();
			setProjectMembers([...projectMembers, data.member]);
			setSelectedUserId('');
			toast.success('Medlem tillagd i projektet');
		} catch (error) {
			console.error('Error adding member:', error);
			toast.error(error instanceof Error ? error.message : 'Misslyckades att lägga till medlem');
		} finally {
			setAdding(false);
		}
	};

	const handleRemoveMember = async (userId: string, userName: string) => {
		setRemoving(userId);
		try {
			const response = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to remove member');
			}

			setProjectMembers(projectMembers.filter((m) => m.user_id !== userId));
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

	// Get org members not in project
	const availableMembers = orgMembers.filter(
		(om) => !projectMembers.some((pm) => pm.user_id === om.user_id)
	);

	// Allow all roles to be added (including admins and foremen)
	// They can explicitly add themselves even though they have automatic access
	const membersToAdd = availableMembers;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						Hantera projektteam
					</DialogTitle>
					<DialogDescription>
						Lägg till eller ta bort teammedlemmar för <strong>{projectName}</strong>
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-6 py-4">
					{/* Add Member Section */}
					<div className="space-y-3">
						<h3 className="font-semibold text-sm">Lägg till medlem</h3>
						<div className="flex gap-2">
							<div className="flex-1">
								<Select value={selectedUserId} onValueChange={setSelectedUserId}>
									<SelectTrigger>
										<SelectValue placeholder="Välj användare att lägga till" />
									</SelectTrigger>
									<SelectContent>
										{membersToAdd.length === 0 ? (
											<div className="p-2 text-sm text-muted-foreground">
												Alla användare är redan tillagda
											</div>
										) : (
											membersToAdd.map((member) => (
												<SelectItem key={member.user_id} value={member.user_id}>
													{member.profiles.full_name} ({member.profiles.email})
													{member.role !== 'worker' && (
														<span className="text-xs text-muted-foreground ml-2">
															- {member.role === 'admin' ? 'Admin' : member.role === 'foreman' ? 'Arbetsledare' : member.role}
														</span>
													)}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>
							</div>
							<Button
								onClick={handleAddMember}
								disabled={adding || !selectedUserId}
								className="shrink-0"
							>
								{adding ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<>
										<Plus className="w-4 h-4 mr-2" />
										Lägg till
									</>
								)}
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							OBS: Admins och arbetsledare har automatisk åtkomst till alla projekt
						</p>
					</div>

					{/* Current Members Section */}
					<div className="space-y-3">
						<h3 className="font-semibold text-sm">
							Projektmedlemmar ({projectMembers.length})
						</h3>
						{loading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
							</div>
						) : projectMembers.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
								<p>Inga medlemmar tillagda än</p>
								<p className="text-xs">Lägg till teammedlemmar ovan</p>
							</div>
						) : (
							<div className="space-y-2">
								{projectMembers.map((member) => (
									<div
										key={member.id}
										className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
									>
										<Avatar className="w-10 h-10">
											<AvatarFallback className="bg-primary text-primary-foreground">
												{getInitials(member.profiles.full_name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{member.profiles.full_name}</p>
											<p className="text-sm text-muted-foreground truncate">
												{member.profiles.email}
											</p>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												handleRemoveMember(member.user_id, member.profiles.full_name)
											}
											disabled={removing === member.user_id}
											className="shrink-0"
										>
											{removing === member.user_id ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												<X className="w-4 h-4" />
											)}
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="flex justify-end pt-4 border-t">
					<Button onClick={() => onOpenChange(false)}>Stäng</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

