'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, FolderKanban, Users, Edit2, Loader2, Archive, ArchiveRestore } from 'lucide-react';
import { ProjectDateFilter } from '@/components/projects/project-date-filter';
import { ProjectTimeEntriesTable } from '@/components/projects/project-time-entries-table';
import { ProjectCostsSummary } from '@/components/projects/project-costs-summary';
import { PhasesList } from '@/components/projects/phases-list';
import { ProjectTeamTab } from '@/components/projects/project-team-tab';
import { CustomerCard } from '@/components/customers/customer-card';
import { ProjectAlertSettingsDisplay } from '@/components/projects/project-alert-settings-display';
import { FixedTimeBlocksCard } from '@/components/projects/fixed-time-blocks-card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSelect } from '@/components/customers/customer-select';
import { useCustomer } from '@/lib/hooks/use-customers';
import type { Customer } from '@/lib/schemas/customer';
import type { Phase } from '@/lib/schemas/project';
import { toast } from 'sonner';

interface ProjectDetailClientProps {
	projectId: string;
	canEdit: boolean;
	isAdmin: boolean; // Only admins can archive/unarchive
	isArchived: boolean;
	projectName: string;
	projectNumber: string | null;
	clientName: string | null;
	customerId: string | null;
	siteAddress: string | null;
	status: string;
	budgetMode: string;
	budgetHours: number | null;
	budgetAmount: number | null;
	projectStartDate: string; // ISO date string
	phases: Phase[];
	initialSummary: any;
}

export function ProjectDetailClient({
	projectId,
	canEdit,
	isAdmin,
	isArchived,
	projectName,
	projectNumber,
	clientName,
	customerId,
	siteAddress,
	status,
	budgetMode,
	budgetHours,
	budgetAmount,
	projectStartDate,
	phases,
	initialSummary,
}: ProjectDetailClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [summary, setSummary] = useState<any>(initialSummary);
	const [isLoading, setIsLoading] = useState(false);
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);
	const [showEditProjectDialog, setShowEditProjectDialog] = useState(false);
	const [editProjectName, setEditProjectName] = useState('');
	const [editProjectNumber, setEditProjectNumber] = useState('');
	const [editClientName, setEditClientName] = useState('');
	const [editSiteAddress, setEditSiteAddress] = useState('');
	const [editStatus, setEditStatus] = useState('');
	const [editBudgetMode, setEditBudgetMode] = useState('');
	const [editBudgetHours, setEditBudgetHours] = useState('');
	const [editBudgetAmount, setEditBudgetAmount] = useState('');
	const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
	const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
	const [isUpdatingProject, setIsUpdatingProject] = useState(false);
	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);

	const { data: currentCustomer } = useCustomer(editCustomerId);

	useEffect(() => {
		if (currentCustomer && editCustomerId === currentCustomer.id) {
			setEditCustomer(currentCustomer);
		} else if (!editCustomerId) {
			setEditCustomer(null);
		}
	}, [currentCustomer, editCustomerId]);

	const fetchSummary = useCallback(async (start: string | null, end: string | null) => {
		try {
			setIsLoading(true);
			const params = new URLSearchParams();
			if (start) params.append('startDate', start);
			if (end) params.append('endDate', end);

			const response = await fetch(`/api/projects/${projectId}/summary?${params.toString()}`);

			if (!response.ok) {
				throw new Error('Failed to fetch project summary');
			}

			const data = await response.json();
			setSummary(data);
		} catch (err) {
			console.error('Error fetching project summary:', err);
			toast.error('Kunde inte hämta projektsammanfattning');
		} finally {
			setIsLoading(false);
		}
	}, [projectId]);

	const handleFilterChange = useCallback((start: string | null, end: string | null) => {
		setStartDate(start);
		setEndDate(end);
		fetchSummary(start, end);
	}, [fetchSummary]);

	const handleOpenEditDialog = () => {
		setEditProjectName(projectName);
		setEditProjectNumber(projectNumber || '');
		setEditClientName(clientName || '');
		setEditSiteAddress(siteAddress || '');
		setEditStatus(status);
		setEditBudgetMode(budgetMode);
		setEditBudgetHours(budgetHours?.toString() || '');
		setEditBudgetAmount(budgetAmount?.toString() || '');
		setEditCustomerId(customerId || null);
		setShowEditProjectDialog(true);
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
					customer_id: editCustomerId || null,
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
			router.refresh();
		} catch (error) {
			console.error('Error updating project:', error);
			toast.error('Kunde inte uppdatera projekt');
		} finally {
			setIsUpdatingProject(false);
		}
	};

	const handleArchive = async () => {
		setIsArchiving(true);
		try {
			const { archiveProject } = await import('@/app/actions/archive-project');
			const result = await archiveProject(projectId);

			if (!result.success) {
				throw new Error('Failed to archive project');
			}

			toast.success('Projektet har arkiverats');
			setShowArchiveDialog(false);
			// Navigate to projects page - server action already revalidated cache
			router.push('/dashboard/projects');
			// Force refresh to ensure UI updates
			setTimeout(() => {
				router.refresh();
			}, 200);
		} catch (error) {
			console.error('Error archiving project:', error);
			toast.error(error instanceof Error ? error.message : 'Kunde inte arkivera projekt');
		} finally {
			setIsArchiving(false);
		}
	};

	const handleUnarchive = async () => {
		setIsArchiving(true);
		try {
			const { unarchiveProject } = await import('@/app/actions/archive-project');
			const result = await unarchiveProject(projectId);

			if (!result.success) {
				throw new Error('Failed to unarchive project');
			}

			toast.success('Projektet har återaktiverats');
			setShowUnarchiveDialog(false);
			// Server action already revalidated cache
			router.refresh();
		} catch (error) {
			console.error('Error unarchiving project:', error);
			toast.error(error instanceof Error ? error.message : 'Kunde inte återaktivera projekt');
		} finally {
			setIsArchiving(false);
		}
	};

	if (!summary) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-orange-500" />
					<p className="text-muted-foreground">Laddar projektdetaljer...</p>
				</div>
			</div>
		);
	}

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

	return (
		<div className="space-y-6">
			{/* Header with Filter */}
			<div className="bg-gradient-to-r from-orange-50 via-orange-50/50 to-transparent border-2 border-orange-100 rounded-2xl p-6 md:p-8">
				<div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-3">
							<h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
								{projectName}
							</h1>
							<Badge className={getStatusColor(status)}>
								{status === 'active' && 'Aktiv'}
								{status === 'paused' && 'Pausad'}
								{status === 'completed' && 'Klar'}
								{status === 'archived' && 'Arkiverad'}
							</Badge>
							{isArchived && (
								<Badge variant="outline" className="border-gray-400 text-gray-600 bg-gray-50">
									Arkiverad
								</Badge>
							)}
						</div>
						{isArchived && (
							<div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
								<p className="text-sm text-yellow-800">
									<strong>Detta projekt är arkiverat.</strong> Detta projekt kan inte ta emot nya registreringar (tid, dagbok, material, etc.) men finns kvar för historik och rapporter.
								</p>
							</div>
						)}
						{projectNumber && (
							<p className="text-sm text-gray-600 font-medium bg-white/60 inline-block px-3 py-1 rounded-lg">
								Projektnummer: {projectNumber}
							</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						{canEdit && (
							<Button
								className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
								onClick={handleOpenEditDialog}
							>
								<Edit2 className="w-4 h-4 mr-2" />
								Redigera projekt
							</Button>
						)}
						{isAdmin && !isArchived && (
							<Button
								variant="outline"
								className="border-gray-300 text-gray-700 hover:bg-gray-50"
								onClick={() => setShowArchiveDialog(true)}
							>
								<Archive className="w-4 h-4 mr-2" />
								Arkivera
							</Button>
						)}
						{isAdmin && isArchived && (
							<Button
								variant="outline"
								className="border-green-300 text-green-700 hover:bg-green-50"
								onClick={() => setShowUnarchiveDialog(true)}
							>
								<ArchiveRestore className="w-4 h-4 mr-2" />
								Återaktivera
							</Button>
						)}
					</div>
				</div>
				<ProjectDateFilter projectStartDate={projectStartDate} onFilterChange={handleFilterChange} />
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-orange-500" />
							Belopp intjänat
						</CardTitle>
					</CardHeader>
					<CardContent>
						{(() => {
							const totalHours = summary.time?.totalHours || 0;
							const hourlyRate = summary.project?.projectHourlyRateSek || 0;
							const earnedAmount = totalHours * hourlyRate;
							
							return (
								<>
									<p className="text-3xl font-bold">
										{earnedAmount > 0 
											? `${Math.round(earnedAmount).toLocaleString('sv-SE')} kr`
											: `${totalHours}h`
										}
									</p>
									{hourlyRate > 0 && (
										<p className="text-sm text-muted-foreground mt-1">
											{totalHours.toFixed(1)}h × {hourlyRate.toLocaleString('sv-SE')} kr/h
										</p>
									)}
									{!hourlyRate && budgetHours && budgetHours > 0 && (
										<p className="text-sm text-muted-foreground mt-1">
											{summary.time?.percentage || 0}% av {budgetHours}h
										</p>
									)}
								</>
							);
						})()}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-orange-500" />
							Totalt Material & Utgifter
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold">
							{summary.costs?.total?.toLocaleString('sv-SE') || '0'} kr
						</p>
						{budgetAmount && budgetAmount > 0 && (
							<p className="text-sm text-muted-foreground mt-1">
								{summary.costs?.percentage || 0}% av {budgetAmount.toLocaleString('sv-SE')} kr
							</p>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
							<FolderKanban className="w-5 h-5 text-orange-500" />
							Antal faser
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-3xl font-bold">{phases.length}</p>
						<p className="text-sm text-muted-foreground mt-1">Faser skapade</p>
					</CardContent>
				</Card>
			</div>

			{/* Time Entries & Diary Table */}
			{summary.timeEntries && (
				<ProjectTimeEntriesTable timeEntries={summary.timeEntries} />
			)}

			{/* Costs Summary */}
			{summary.costsByCategory && (
				<ProjectCostsSummary
					costsByCategory={summary.costsByCategory}
					budgetAmount={budgetAmount}
				/>
			)}

			{/* Phases */}
			<PhasesList
				projectId={projectId}
				phases={phases}
				canEdit={canEdit}
				projectBudgetHours={budgetHours}
				projectBudgetAmount={budgetAmount}
			/>

			{/* Fixed Time Blocks */}
			<FixedTimeBlocksCard
				projectId={projectId}
				canEdit={canEdit}
				billingMode={summary.project?.billingMode}
				quotedAmountSek={summary.project?.quotedAmountSek}
				projectHourlyRateSek={summary.project?.projectHourlyRateSek}
			/>

			{/* Team */}
			<Card>
				<CardHeader>
					<CardTitle>Team</CardTitle>
				</CardHeader>
				<CardContent>
					<ProjectTeamTab projectId={projectId} projectName={projectName} canEdit={canEdit} />
				</CardContent>
			</Card>

			{/* Customer Card */}
			{customerId && (
				<CustomerCard customerId={customerId} canMerge={canEdit} />
			)}

			{/* Alert Settings */}
			{canEdit && summary.project && (
				<ProjectAlertSettingsDisplay
					alertSettings={summary.project.alertSettings}
					projectId={projectId}
					canEdit={canEdit}
					onSaveSuccess={(savedSettings) => {
						// Update summary state with saved alert settings
						setSummary((prev: any) => ({
							...prev,
							project: {
								...prev.project,
								alertSettings: savedSettings,
							},
						}));
						console.log('[ProjectDetailClient] Updated summary.project.alertSettings:', savedSettings);
					}}
				/>
			)}

			{/* Edit Project Dialog */}
			<Dialog open={showEditProjectDialog} onOpenChange={setShowEditProjectDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Redigera projekt</DialogTitle>
						<DialogDescription>Uppdatera projektinformation</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="edit-project-name">Projektnamn *</Label>
							<Input
								id="edit-project-name"
								value={editProjectName}
								onChange={(e) => setEditProjectName(e.target.value)}
								placeholder="Projektnamn"
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor="edit-project-number">Projektnummer</Label>
							<Input
								id="edit-project-number"
								value={editProjectNumber}
								onChange={(e) => setEditProjectNumber(e.target.value)}
								placeholder="T.ex. P-2025-001"
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label>Kund</Label>
							<CustomerSelect
								value={editCustomer}
								onChange={(customer) => {
									setEditCustomer(customer);
									setEditCustomerId(customer.id);
									const displayName = customer.type === 'COMPANY'
										? customer.company_name
										: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim();
									setEditClientName(displayName || '');
								}}
								placeholder="Välj kund"
								allowCreate={true}
							/>
						</div>
						<div>
							<Label htmlFor="edit-site-address">Platsadress</Label>
							<Input
								id="edit-site-address"
								value={editSiteAddress}
								onChange={(e) => setEditSiteAddress(e.target.value)}
								placeholder="Projektets adress"
								disabled={isUpdatingProject}
							/>
						</div>
						<div>
							<Label htmlFor="edit-status">Status</Label>
							<Select value={editStatus} onValueChange={setEditStatus} disabled={isUpdatingProject}>
								<SelectTrigger id="edit-status">
									<SelectValue placeholder="Välj status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="active">Aktiv</SelectItem>
									<SelectItem value="paused">Pausad</SelectItem>
									<SelectItem value="completed">Slutförd</SelectItem>
									<SelectItem value="archived">Arkiverad</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="border-t pt-4">
							<h4 className="font-semibold mb-3">Budget</h4>
							<div className="space-y-4">
								<div>
									<Label htmlFor="edit-budget-mode">Budgetläge</Label>
									<Select
										value={editBudgetMode}
										onValueChange={setEditBudgetMode}
										disabled={isUpdatingProject}
									>
										<SelectTrigger id="edit-budget-mode">
											<SelectValue placeholder="Välj budgetläge" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">Ingen budget</SelectItem>
											<SelectItem value="hours">Timbudget</SelectItem>
											<SelectItem value="amount">Beloppsbudget</SelectItem>
											<SelectItem value="ep_sync">EP Sync</SelectItem>
										</SelectContent>
									</Select>
								</div>
								{editBudgetMode === 'hours' && (
									<div>
										<Label htmlFor="edit-budget-hours">Budgeterade timmar</Label>
										<Input
											id="edit-budget-hours"
											type="number"
											value={editBudgetHours}
											onChange={(e) => setEditBudgetHours(e.target.value)}
											placeholder="0"
											disabled={isUpdatingProject}
										/>
									</div>
								)}
								{editBudgetMode === 'amount' && (
									<div>
										<Label htmlFor="edit-budget-amount">Budget (kr)</Label>
										<Input
											id="edit-budget-amount"
											type="number"
											value={editBudgetAmount}
											onChange={(e) => setEditBudgetAmount(e.target.value)}
											placeholder="0"
											disabled={isUpdatingProject}
										/>
									</div>
								)}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowEditProjectDialog(false)} disabled={isUpdatingProject}>
							Avbryt
						</Button>
						<Button onClick={handleUpdateProject} disabled={isUpdatingProject || !editProjectName.trim()}>
							{isUpdatingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Spara ändringar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Archive Dialog */}
			<Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Arkivera projekt</DialogTitle>
						<DialogDescription>
							Är du säker på att du vill arkivera detta projekt? Projektet kommer att:
							<ul className="list-disc list-inside mt-2 space-y-1 text-sm">
								<li>Gömmas från standardlistor och filter</li>
								<li>Inte kunna ta emot nya registreringar (tid, dagbok, material, etc.)</li>
								<li>Fortfarande finnas kvar i databasen för historik och rapporter</li>
							</ul>
							Du kan alltid återaktivera projektet senare.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowArchiveDialog(false)} disabled={isArchiving}>
							Avbryt
						</Button>
						<Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
							{isArchiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Arkivera projekt
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Unarchive Dialog */}
			<Dialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Återaktivera projekt</DialogTitle>
						<DialogDescription>
							Är du säker på att du vill återaktivera detta projekt? Projektet kommer att:
							<ul className="list-disc list-inside mt-2 space-y-1 text-sm">
								<li>Synas igen i standardlistor och filter</li>
								<li>Kunna ta emot nya registreringar (tid, dagbok, material, etc.)</li>
								<li>Bli tillgängligt för planering och bokning</li>
							</ul>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowUnarchiveDialog(false)} disabled={isArchiving}>
							Avbryt
						</Button>
						<Button onClick={handleUnarchive} disabled={isArchiving}>
							{isArchiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
							Återaktivera projekt
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

