'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	Clock,
	DollarSign,
	Calendar,
	Users,
	Box,
	FileText,
	BookOpen,
	Plus,
	Edit2,
	Trash2,
	ArrowLeft,
	MoreVertical,
	Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { ManageTeamDialog } from '@/components/projects/manage-team-dialog';

interface ProjectSummaryViewProps {
	projectId: string;
	canEdit: boolean;
	projectName?: string;
	projectNumber?: string | null;
	clientName?: string | null;
	siteAddress?: string | null;
	status?: string;
	budgetMode?: string;
	budgetHours?: number | null;
	budgetAmount?: number | null;
	showEditButton?: boolean;
}

interface ProjectSummary {
	project: {
		id: string;
		name: string;
		projectNumber?: string;
		status: string;
		clientName?: string;
		siteAddress?: string;
		budgetMode: string;
		budgetHours: number;
		budgetAmount: number;
		estimatedEndDate?: string;
	};
	time: {
		totalHours: number;
		budgetHours: number;
		remainingHours: number;
		percentage: number;
		byUser: Array<{ userId: string; userName: string; hours: number }>;
	};
	costs: {
		materials: number;
		expenses: number;
		mileage: number;
		total: number;
		budgetAmount: number;
		remaining: number;
		percentage: number;
	};
	materials: {
		count: number;
		totalCost: number;
	};
	phases: Array<{
		id: string;
		name: string;
		sortOrder: number;
		budgetHours: number;
		budgetAmount: number;
		loggedHours: number;
		hoursPercentage: number;
	}>;
	team: Array<{
		userId: string;
		userName: string;
		role: string;
		loggedHours: number;
	}>;
	activities: Array<{
		id: string;
		type: string;
		description: string;
		created_at: string;
		user_name: string;
		data: any;
	}>;
	deadline?: {
		date: string;
		daysRemaining: number;
		isPastDue: boolean;
	};
}

export function ProjectSummaryView({ projectId, canEdit, projectName, projectNumber, clientName, siteAddress, status, budgetMode, budgetHours, budgetAmount, showEditButton = false }: ProjectSummaryViewProps) {
	const router = useRouter();
	const [summary, setSummary] = useState<ProjectSummary | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showNewPhaseDialog, setShowNewPhaseDialog] = useState(false);
	const [newPhaseName, setNewPhaseName] = useState('');
	const [newPhaseBudgetHours, setNewPhaseBudgetHours] = useState('');
	const [newPhaseBudgetAmount, setNewPhaseBudgetAmount] = useState('');
	const [isCreatingPhase, setIsCreatingPhase] = useState(false);
	const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
	const [editProjectName, setEditProjectName] = useState('');
	const [editProjectNumber, setEditProjectNumber] = useState('');
	const [editClientName, setEditClientName] = useState('');
	const [editSiteAddress, setEditSiteAddress] = useState('');
	const [editStatus, setEditStatus] = useState('');
	const [editBudgetMode, setEditBudgetMode] = useState('');
	const [editBudgetHours, setEditBudgetHours] = useState('');
	const [editBudgetAmount, setEditBudgetAmount] = useState('');
	const [isUpdatingProject, setIsUpdatingProject] = useState(false);
	const [showTeamDialog, setShowTeamDialog] = useState(false);

	useEffect(() => {
		fetchSummary();
		// Only re-fetch when projectId changes, not on every render
	}, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleOpenEditDialog = () => {
		setEditProjectName(projectName || '');
		setEditProjectNumber(projectNumber || '');
		setEditClientName(clientName || '');
		setEditSiteAddress(siteAddress || '');
		setEditStatus(status || 'active');
		setEditBudgetMode(budgetMode || 'none');
		setEditBudgetHours(budgetHours?.toString() || '');
		setEditBudgetAmount(budgetAmount?.toString() || '');
		setShowEditProjectDialog(true);
	};

	const fetchSummary = async () => {
		try {
			setIsLoading(true);
			const response = await fetch(`/api/projects/${projectId}/summary`);
			
			if (!response.ok) {
				throw new Error('Failed to fetch project summary');
			}

			const data = await response.json();
			setSummary(data);
		} catch (err) {
			console.error('Error fetching project summary:', err);
			setError('Kunde inte hämta projektsammanfattning');
		} finally{
			setIsLoading(false);
		}
	};

	const handleCreatePhase = async () => {
		if (!newPhaseName.trim()) {
			toast.error('Fasnamn krävs');
			return;
		}

		setIsCreatingPhase(true);
		try {
			const response = await fetch('/api/phases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					projectId,
					name: newPhaseName,
					budget_hours: newPhaseBudgetHours ? parseFloat(newPhaseBudgetHours) : null,
					budget_amount: newPhaseBudgetAmount ? parseFloat(newPhaseBudgetAmount) : null,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to create phase');
			}

			toast.success('Fas skapad');
			setNewPhaseName('');
			setNewPhaseBudgetHours('');
			setNewPhaseBudgetAmount('');
			setShowNewPhaseDialog(false);
			
			// Refresh the summary
			fetchSummary();
		} catch (error) {
			console.error('Error creating phase:', error);
			toast.error('Kunde inte skapa fas');
		} finally {
			setIsCreatingPhase(false);
		}
	};

	const handleUpdateProject = async () => {
		if (!editProjectName.trim()) {
			toast.error('Projektnamn krävs');
			return;
		}

		setIsUpdatingProject(true);
		try {
			const response = await fetch(`/api/projects/${projectId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editProjectName,
					project_number: editProjectNumber || null,
					client_name: editClientName || null,
					site_address: editSiteAddress || null,
					status: editStatus,
					budget_mode: editBudgetMode,
					budget_hours: editBudgetHours ? parseFloat(editBudgetHours) : null,
					budget_amount: editBudgetAmount ? parseFloat(editBudgetAmount) : null,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update project');
			}

			toast.success('Projekt uppdaterat');
			setShowEditProjectDialog(false);
			
			// Refresh the page to show updated data
			router.refresh();
		} catch (error) {
			console.error('Error updating project:', error);
			toast.error('Kunde inte uppdatera projekt');
		} finally {
			setIsUpdatingProject(false);
		}
	};

	if (isLoading) {
		return (
			<div className='flex items-center justify-center min-h-[400px]'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4'></div>
					<p className='text-muted-foreground'>Laddar projektsammanfattning...</p>
				</div>
			</div>
		);
	}

	if (error || !summary) {
		return (
			<div className='flex items-center justify-center min-h-[400px]'>
				<Card className='max-w-md'>
					<CardHeader>
						<CardTitle>Ett fel uppstod</CardTitle>
					</CardHeader>
					<CardContent>
						<p className='text-muted-foreground mb-4'>{error || 'Kunde inte ladda projektet'}</p>
						<Button onClick={() => router.back()}>Gå tillbaka</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const { project, time, costs, materials, phases, team, activities, deadline } = summary;

	// Calculate overall progress (average of time and cost percentage)
	const overallProgress = Math.min(100, Math.round((time.percentage + costs.percentage) / 2));

	// Get status badge color
	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'bg-green-500 hover:bg-green-600';
			case 'paused':
				return 'bg-yellow-500 hover:bg-yellow-600';
			case 'completed':
				return 'bg-blue-500 hover:bg-blue-600';
			case 'archived':
				return 'bg-gray-500 hover:bg-gray-600';
			default:
				return 'bg-gray-500 hover:bg-gray-600';
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case 'active':
				return 'Pågående';
			case 'paused':
				return 'Pausad';
			case 'completed':
				return 'Slutförd';
			case 'archived':
				return 'Arkiverad';
			default:
				return status;
		}
	};

	// Get activity icon with proper background color
	const getActivityIcon = (type: string) => {
		switch (type) {
			case 'time_entry':
				return (
					<div className='p-2 rounded-lg bg-blue-100'>
						<Clock className='w-4 h-4 text-blue-600' />
					</div>
				);
			case 'material':
				return (
					<div className='p-2 rounded-lg bg-green-100'>
						<Box className='w-4 h-4 text-green-600' />
					</div>
				);
			case 'diary':
				return (
					<div className='p-2 rounded-lg bg-purple-100'>
						<FileText className='w-4 h-4 text-purple-600' />
					</div>
				);
			default:
				return (
					<div className='p-2 rounded-lg bg-gray-100'>
						<FileText className='w-4 h-4 text-gray-600' />
					</div>
				);
		}
	};

	// Format time ago
	const formatTimeAgo = (dateString: string) => {
		try {
			return formatDistanceToNow(new Date(dateString), {
				addSuffix: true,
				locale: sv,
			});
		} catch {
			return dateString;
		}
	};

	// Get user initials
	const getUserInitials = (name: string) => {
		const parts = name.trim().split(' ');
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	};

	return (
		<div className='space-y-6'>
			{/* Edit Project Button */}
			{showEditButton && canEdit && (
				<div className='flex justify-end mb-4'>
					<Button 
						className='bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30'
						onClick={handleOpenEditDialog}
					>
						<Edit2 className='w-4 h-4 mr-2' />
						Redigera projekt
					</Button>
				</div>
			)}

			{/* Quick Actions */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
				<Button
					className='h-auto py-4 px-3 flex-col gap-2 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200'
					onClick={() => router.push(`/dashboard/time?project_id=${projectId}`)}
				>
					<Clock className='w-5 h-5' />
					<span className='text-xs'>Logga tid</span>
				</Button>
				<Button
					variant='outline'
					className='h-auto py-4 px-3 flex-col gap-2 hover:bg-accent hover:text-accent-foreground hover:border-primary/50'
					onClick={() => router.push(`/dashboard/materials?project_id=${projectId}`)}
				>
					<Box className='w-5 h-5' />
					<span className='text-xs'>Material</span>
				</Button>
				<Button
					variant='outline'
					className='h-auto py-4 px-3 flex-col gap-2 hover:bg-accent hover:text-accent-foreground hover:border-primary/50'
					onClick={() => router.push(`/dashboard/ata?project_id=${projectId}`)}
				>
					<FileText className='w-5 h-5' />
					<span className='text-xs'>ÄTA</span>
				</Button>
				<Button 
					variant='outline'
					className='h-auto py-4 px-3 flex-col gap-2 hover:bg-accent hover:text-accent-foreground hover:border-primary/50'
					onClick={() => router.push(`/dashboard/diary?project_id=${projectId}`)}
				>
					<BookOpen className='w-5 h-5' />
					<span className='text-xs'>Dagbok</span>
				</Button>
			</div>

				{/* Time and Cost Overview */}
				<div className='grid md:grid-cols-2 gap-6'>
					{/* Time Card */}
					<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-200'>
						<div className='flex items-start justify-between mb-4'>
							<div>
								<p className='text-muted-foreground mb-1'>Loggad tid</p>
								<h3 className='text-3xl font-bold'>{time.totalHours}h <span className='text-lg text-muted-foreground'>({Math.min(100, time.percentage)}%)</span></h3>
							</div>
							<div className='p-3 rounded-xl bg-blue-100'>
								<Clock className='w-6 h-6 text-blue-600' />
							</div>
						</div>
						
						<div className='space-y-3'>
							<div className='relative h-2 w-full overflow-hidden rounded-full bg-gray-200'>
								<div
									className='h-full bg-orange-500 transition-all'
									style={{ width: `${Math.min(100, time.percentage)}%` }}
								/>
							</div>
							
							<div className='pt-2 space-y-1.5'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Uppskattat totalt</span>
									<span className='font-medium'>{time.budgetHours}h</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Återstående tid</span>
									<span className='font-medium'>{Math.max(0, time.remainingHours).toFixed(1)}h</span>
								</div>
								{deadline && (
									<div className='flex justify-between pt-2 border-t'>
										<span className='text-muted-foreground'>Deadline</span>
										<span className={`font-medium ${deadline.isPastDue ? 'text-red-500' : 'text-orange-500'}`}>
											{new Date(deadline.date).toLocaleDateString('sv-SE')} ({Math.abs(deadline.daysRemaining)} dagar)
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Cost Card */}
					<div className='bg-card border-2 border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-200'>
						<div className='flex items-start justify-between mb-4'>
							<div>
								<p className='text-muted-foreground mb-1'>Förbrukat</p>
								<h3 className='text-3xl font-bold'>{costs.total.toLocaleString('sv-SE')} kr <span className='text-lg text-muted-foreground'>({Math.min(100, costs.percentage)}%)</span></h3>
							</div>
							<div className='p-3 rounded-xl bg-orange-100'>
								<DollarSign className='w-6 h-6 text-orange-600' />
							</div>
						</div>
						
						<div className='space-y-3'>
							<div className='relative h-2 w-full overflow-hidden rounded-full bg-gray-200'>
								<div
									className='h-full bg-orange-500 transition-all'
									style={{ width: `${Math.min(100, costs.percentage)}%` }}
								/>
							</div>
							
							<div className='pt-2 space-y-1.5'>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Uppskattat totalt</span>
									<span className='font-medium'>{costs.budgetAmount.toLocaleString('sv-SE')} kr</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Budget</span>
									<span className='font-medium'>{costs.budgetAmount.toLocaleString('sv-SE')} kr</span>
								</div>
								<div className='flex justify-between'>
									<span className='text-muted-foreground'>Kvar av budget</span>
									<span className={`font-medium ${costs.remaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
										{costs.remaining.toLocaleString('sv-SE')} kr
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Phases Section */}
				<div className='bg-card border-2 border-border rounded-xl p-6'>
					<div className='flex items-center justify-between mb-4'>
						<div>
							<h3 className='text-xl font-bold mb-1'>Projektfaser</h3>
							<p className='text-sm text-muted-foreground'>
								Dela upp projektet i faser för bättre struktur
							</p>
						</div>
						{canEdit && (
							<Button
								size='sm'
								className='shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-200'
								onClick={() => setShowNewPhaseDialog(true)}
							>
								<Plus className='w-4 h-4 mr-2' />
								Ny fas
							</Button>
						)}
					</div>

					{phases.length === 0 ? (
						<div className='text-center py-8'>
							<div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4'>
								<FileText className='w-8 h-8 text-muted-foreground' />
							</div>
							<p className='text-muted-foreground mb-2'>Inga faser skapade ännu</p>
							<p className='text-sm text-muted-foreground'>
								Lägg till en fas för att komma igång
							</p>
						</div>
					) : (
						<div className='space-y-3'>
							{phases
									.sort((a, b) => a.sortOrder - b.sortOrder)
									.map((phase, index) => (
										<div
											key={phase.id}
											className='p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors'
										>
											<div className='flex items-start gap-4'>
												<div className='w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold flex-shrink-0'>
													{index + 1}
												</div>
												<div className='flex-1 min-w-0'>
													<h4 className='font-medium mb-3'>{phase.name}</h4>
													<div className='flex items-center gap-4 text-sm text-muted-foreground mb-2'>
														<div className='flex items-center gap-1'>
															<Clock className='w-4 h-4' />
															<span>
																{phase.loggedHours}h / {phase.budgetHours}h
															</span>
														</div>
														<div className='flex items-center gap-1'>
															<DollarSign className='w-4 h-4' />
															<span>{phase.budgetAmount.toLocaleString('sv-SE')} kr</span>
														</div>
													</div>
													<div className='relative h-2 w-full overflow-hidden rounded-full bg-gray-200'>
														<div
															className='h-full bg-orange-500 transition-all'
															style={{ width: `${Math.min(100, phase.hoursPercentage)}%` }}
														/>
													</div>
												</div>
												{canEdit && (
													<div className='flex gap-2 shrink-0'>
														<Button
															variant='ghost'
															size='icon'
															className='h-8 w-8 hover:bg-accent hover:text-accent-foreground'
														>
															<Edit2 className='w-4 h-4' />
														</Button>
														<Button
															variant='ghost'
															size='icon'
															className='h-8 w-8 hover:bg-destructive/10 hover:text-destructive'
														>
															<Trash2 className='w-4 h-4' />
														</Button>
													</div>
												)}
											</div>
										</div>
									))}
									
									{/* Phase Summary */}
									<div className='bg-gradient-to-br from-accent to-accent/50 border-2 border-primary/20 rounded-xl p-4 mt-4'>
										<div className='grid grid-cols-3 gap-4 text-center'>
											<div>
												<p className='text-sm text-muted-foreground mb-1'>Totalt timmar</p>
												<p className='text-xl font-bold'>{time.totalHours}h</p>
											</div>
											<div>
												<p className='text-sm text-muted-foreground mb-1'>Total budget</p>
												<p className='text-xl font-bold'>{costs.budgetAmount.toLocaleString('sv-SE')} kr</p>
											</div>
											<div>
												<p className='text-sm text-muted-foreground mb-1'>Antal faser</p>
												<p className='text-xl font-bold'>{phases.length}</p>
											</div>
										</div>
									</div>
						</div>
					)}
				</div>

				{/* Team Section */}
				<div className='bg-card border-2 border-border rounded-xl p-6'>
					<div className='flex items-center justify-between mb-4'>
						<h3 className='text-xl font-bold'>Team</h3>
						{canEdit && (
							<Button 
								variant='outline'
								size='sm'
								className='hover:bg-accent hover:text-accent-foreground hover:border-primary/50'
								onClick={() => setShowTeamDialog(true)}
							>
								<Plus className='w-4 h-4 mr-2' />
								Bjud in
							</Button>
						)}
					</div>
					
					{team.length === 0 ? (
						<p className='text-sm text-muted-foreground text-center py-8'>
							Inga teammedlemmar ännu
						</p>
					) : (
						<div className='space-y-3'>
							{team.map((member) => (
								<div
									key={member.userId}
									className='flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-accent/50 transition-all duration-200'
								>
									<div className='w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shrink-0 font-bold'>
										{getUserInitials(member.userName)}
									</div>
									<div className='flex-1 min-w-0'>
										<p className='font-medium truncate'>{member.userName}</p>
										<p className='text-sm text-muted-foreground truncate'>{member.role}</p>
									</div>
									<div className='text-right shrink-0'>
										<p className='text-sm font-medium'>{member.loggedHours}h</p>
										<p className='text-xs text-muted-foreground'>Loggade</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Material Summary */}
				<div className='bg-card border-2 border-border rounded-xl p-6'>
					<div className='flex items-center justify-between mb-4'>
						<h3 className='text-xl font-bold'>Material</h3>
						<Button 
							variant='outline'
							size='sm'
							className='hover:bg-accent hover:text-accent-foreground hover:border-primary/50'
							asChild
						>
							<Link href={`/dashboard/materials?project_id=${projectId}`}>
								<Box className='w-4 h-4 mr-2' />
								Se alla
							</Link>
						</Button>
					</div>
					
					<div className='grid grid-cols-3 gap-4'>
						<div className='text-center p-4 bg-background rounded-xl'>
							<p className='text-2xl font-bold mb-1'>{materials.count}</p>
							<p className='text-sm text-muted-foreground'>Artiklar</p>
						</div>
						<div className='text-center p-4 bg-background rounded-xl'>
							<p className='text-2xl font-bold mb-1'>{materials.totalCost.toLocaleString('sv-SE')} kr</p>
							<p className='text-sm text-muted-foreground'>Total kostnad</p>
						</div>
						<div className='text-center p-4 bg-background rounded-xl'>
							<p className='text-2xl font-bold mb-1'>0</p>
							<p className='text-sm text-muted-foreground'>Väntande</p>
						</div>
					</div>
				</div>

				{/* Recent Activities */}
				<div className='bg-card border-2 border-border rounded-xl p-6'>
					<h3 className='text-xl font-bold mb-4'>Senaste aktiviteter</h3>
					
					{activities.length === 0 ? (
						<p className='text-sm text-muted-foreground text-center py-8'>
							Inga aktiviteter ännu
						</p>
					) : (
						<div className='space-y-4'>
							{activities.map((activity) => (
								<div
									key={activity.id}
									className='flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0'
								>
									{getActivityIcon(activity.type)}
									<div className='flex-1 min-w-0'>
										<p className='text-sm mb-1'>{activity.description}</p>
										<div className='flex items-center gap-2 text-xs text-muted-foreground'>
											<span>{activity.user_name}</span>
											<span>•</span>
											<span>{formatTimeAgo(activity.created_at)}</span>
										</div>
									</div>
									{activity.data?.duration_min && (
										<div className='text-right shrink-0'>
											<p className='text-sm font-medium'>
												{Math.round(activity.data.duration_min / 6) / 10}h
											</p>
										</div>
									)}
									{activity.data?.total_price && (
										<div className='text-right shrink-0'>
											<p className='text-sm font-medium'>
												{activity.data.total_price.toLocaleString('sv-SE')} kr
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

			{/* New Phase Dialog */}
			<Dialog open={showNewPhaseDialog} onOpenChange={setShowNewPhaseDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Skapa ny fas</DialogTitle>
						<DialogDescription>
							Lägg till en ny fas för att organisera projektets arbete
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<Label htmlFor='phase-name'>Fasnamn *</Label>
							<Input
								id='phase-name'
								value={newPhaseName}
								onChange={(e) => setNewPhaseName(e.target.value)}
								placeholder='T.ex. Grund, Stomme, Tak'
								disabled={isCreatingPhase}
							/>
						</div>
						<div className='grid grid-cols-2 gap-4'>
							<div>
								<Label htmlFor='budget-hours'>Budgeterade timmar</Label>
								<Input
									id='budget-hours'
									type='number'
									value={newPhaseBudgetHours}
									onChange={(e) => setNewPhaseBudgetHours(e.target.value)}
									placeholder='0'
									disabled={isCreatingPhase}
								/>
							</div>
							<div>
								<Label htmlFor='budget-amount'>Budget (kr)</Label>
								<Input
									id='budget-amount'
									type='number'
									value={newPhaseBudgetAmount}
									onChange={(e) => setNewPhaseBudgetAmount(e.target.value)}
									placeholder='0'
									disabled={isCreatingPhase}
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button 
							variant='outline' 
							onClick={() => setShowNewPhaseDialog(false)}
							disabled={isCreatingPhase}
						>
							Avbryt
						</Button>
						<Button 
							onClick={handleCreatePhase}
							disabled={isCreatingPhase || !newPhaseName.trim()}
						>
							{isCreatingPhase && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
							Skapa fas
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit Project Dialog */}
			<Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
				<DialogContent className='max-w-2xl'>
					<DialogHeader>
						<DialogTitle>Redigera projekt</DialogTitle>
						<DialogDescription>
							Uppdatera projektinformation
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<Label htmlFor='edit-project-name'>Projektnamn *</Label>
							<Input
								id='edit-project-name'
								value={editProjectName}
								onChange={(e) => setEditProjectName(e.target.value)}
								placeholder='Projektnamn'
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor='edit-project-number'>Projektnummer</Label>
							<Input
								id='edit-project-number'
								value={editProjectNumber}
								onChange={(e) => setEditProjectNumber(e.target.value)}
								placeholder='T.ex. P-2025-001'
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor='edit-client-name'>Kund</Label>
							<Input
								id='edit-client-name'
								value={editClientName}
								onChange={(e) => setEditClientName(e.target.value)}
								placeholder='Kundnamn'
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor='edit-site-address'>Platsadress</Label>
							<Input
								id='edit-site-address'
								value={editSiteAddress}
								onChange={(e) => setEditSiteAddress(e.target.value)}
								placeholder='Projektets adress'
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor='edit-status'>Status</Label>
							<Select
								value={editStatus}
								onValueChange={setEditStatus}
								disabled={isUpdatingProject}
							>
								<SelectTrigger id='edit-status'>
									<SelectValue placeholder='Välj status' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='active'>Aktiv</SelectItem>
									<SelectItem value='paused'>Pausad</SelectItem>
									<SelectItem value='completed'>Slutförd</SelectItem>
									<SelectItem value='archived'>Arkiverad</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className='border-t pt-4'>
							<h4 className='font-semibold mb-3'>Budget</h4>
							<div className='space-y-4'>
								<div>
									<Label htmlFor='edit-budget-mode'>Budgetläge</Label>
									<Select
										value={editBudgetMode}
										onValueChange={setEditBudgetMode}
										disabled={isUpdatingProject}
									>
										<SelectTrigger id='edit-budget-mode'>
											<SelectValue placeholder='Välj budgetläge' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='none'>Ingen budget</SelectItem>
											<SelectItem value='hours'>Timbudget</SelectItem>
											<SelectItem value='amount'>Beloppsbudget</SelectItem>
											<SelectItem value='ep_sync'>EP Sync</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{editBudgetMode === 'hours' && (
									<div>
										<Label htmlFor='edit-budget-hours'>Budgeterade timmar</Label>
										<Input
											id='edit-budget-hours'
											type='number'
											value={editBudgetHours}
											onChange={(e) => setEditBudgetHours(e.target.value)}
											placeholder='0'
											disabled={isUpdatingProject}
										/>
									</div>
								)}
								{editBudgetMode === 'amount' && (
									<div>
										<Label htmlFor='edit-budget-amount'>Budget (kr)</Label>
										<Input
											id='edit-budget-amount'
											type='number'
											value={editBudgetAmount}
											onChange={(e) => setEditBudgetAmount(e.target.value)}
											placeholder='0'
											disabled={isUpdatingProject}
										/>
									</div>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button 
							variant='outline' 
							onClick={() => setShowEditProjectDialog(false)}
							disabled={isUpdatingProject}
						>
							Avbryt
						</Button>
						<Button 
							onClick={handleUpdateProject}
							disabled={isUpdatingProject || !editProjectName.trim()}
						>
							{isUpdatingProject && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
							Spara ändringar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Team Management Dialog */}
			<ManageTeamDialog
				projectId={projectId}
				projectName={projectName || 'Projekt'}
				open={showTeamDialog}
				onOpenChange={(open) => {
					setShowTeamDialog(open);
					if (!open) {
						// Refresh summary to get updated team
						fetchSummary();
					}
				}}
				canEdit={canEdit}
			/>
		</div>
	);
}

