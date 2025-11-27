'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Filter, ClipboardList, CheckCircle2, ArrowRight, Lightbulb, Users, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CreateWorkOrderModal } from '@/components/work-orders/create-work-order-modal';
import { WorkOrderFilters } from '@/components/work-orders/work-order-filters';

interface Project {
	id: string;
	name: string;
	project_number?: string;
}

interface Customer {
	id: string;
	type: 'COMPANY' | 'PRIVATE';
	company_name?: string;
	first_name?: string;
	last_name?: string;
}

interface User {
	id: string;
	full_name?: string;
	email?: string;
}

interface WorkOrdersClientProps {
	initialWorkOrders: WorkOrderWithRelations[];
	projects: Project[];
	customers: Customer[];
	users: User[];
	canEdit: boolean;
	orgId: string;
}

export function WorkOrdersClient({
	initialWorkOrders,
	projects,
	customers,
	users,
	canEdit,
	orgId,
}: WorkOrdersClientProps) {
	const router = useRouter();
	const [workOrders, setWorkOrders] = useState(initialWorkOrders);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showFilters, setShowFilters] = useState(false);

	const getStatusBadge = (status: string) => {
		const variants: Record<string, string> = {
			PLANERAD: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-200',
			PÅGÅENDE: 'border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-500/40 dark:bg-yellow-500/15 dark:text-yellow-200',
			KLAR: 'border-green-200 bg-green-100 text-green-700 dark:border-green-500/40 dark:bg-green-500/15 dark:text-green-200',
			FAKTURERAD: 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-500/40 dark:bg-gray-500/15 dark:text-gray-200',
			AVBOKAD: 'border-red-200 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200',
		};

		const labels: Record<string, string> = {
			PLANERAD: 'Planerad',
			PÅGÅENDE: 'Pågående',
			KLAR: 'Klar',
			FAKTURERAD: 'Fakturerad',
			AVBOKAD: 'Avbokad',
		};

		return (
			<Badge className={variants[status] || 'outline'}>
				{labels[status] || status}
			</Badge>
		);
	};

	const getPriorityBadge = (priority: string) => {
		const variants: Record<string, string> = {
			LOW: 'outline',
			NORMAL: 'default',
			HIGH: 'border-orange-200 bg-orange-100 text-orange-700',
			AKUT: 'border-red-200 bg-red-100 text-red-700',
		};

		const labels: Record<string, string> = {
			LOW: 'Låg',
			NORMAL: 'Normal',
			HIGH: 'Hög',
			AKUT: 'Akut',
		};

		return (
			<Badge variant={variants[priority] as any} className={variants[priority]}>
				{labels[priority] || priority}
			</Badge>
		);
	};

	const getCustomerName = (customer: Customer | null | undefined) => {
		if (!customer) return '-';
		if (customer.type === 'COMPANY') {
			return customer.company_name || '-';
		}
		return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '-';
	};

	const getResponsibleUser = (workOrder: WorkOrderWithRelations) => {
		const responsible = workOrder.assignments?.find((a) => a.is_responsible);
		return responsible?.user?.full_name || '-';
	};

	const getStreetAddress = (address: string | null | undefined) => {
		if (!address) return null;
		// Formatera adress: "Gata Gatunummer, Stad" (utan postnummer)
		// Adressformat är vanligtvis: "Gata Gatunummer, Postnummer Stad"
		const parts = address.split(',');
		if (parts.length >= 2) {
			const streetPart = parts[0]?.trim(); // "Gata Gatunummer"
			// Ta bort postnummer från stad-delen (postnummer är vanligtvis 5 siffror)
			const cityPart = parts.slice(1).join(',').trim(); // "Postnummer Stad"
			// Ta bort postnummer (5 siffror, eventuellt med mellanslag)
			const cityWithoutPostcode = cityPart.replace(/^\d{3}\s?\d{2}\s+/, '').trim();
			if (cityWithoutPostcode) {
				return `${streetPart}, ${cityWithoutPostcode}`;
			}
			return streetPart;
		}
		// Om det inte finns komma, returnera hela adressen
		return address.trim();
	};

	const formatDateTime = (dateString: string | null | undefined) => {
		if (!dateString) return '-';
		try {
			return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: sv });
		} catch {
			return '-';
		}
	};

	const handleRowClick = (workOrderId: string) => {
		router.push(`/dashboard/work-orders/${workOrderId}`);
	};

	const handleWorkOrderCreated = (newWorkOrder: WorkOrderWithRelations) => {
		setWorkOrders([newWorkOrder, ...workOrders]);
		setShowCreateModal(false);
		router.refresh();
	};

	return (
		<div className='p-4 md:p-8 space-y-4 md:space-y-6 bg-black min-h-screen'>
			<div
				className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'
				data-tour='work-orders-header'
			>
				<div>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Arbetsorder</h1>
					<p className='text-sm sm:text-base text-muted-foreground mt-1'>
						Planera, spåra och hantera alla dina jobb på ett strukturerat sätt
					</p>
				</div>
				<div className='flex gap-2 flex-wrap'>
					<Button
						variant='outline'
						size='sm'
						className='flex-1 sm:flex-initial'
						onClick={() => setShowFilters(!showFilters)}
					>
						<Filter className='w-4 h-4 sm:mr-2' />
						<span className='hidden sm:inline'>Filter</span>
					</Button>
					{canEdit && (
						<Button
							size='sm'
							className='flex-1 sm:flex-initial'
							data-tour='work-orders-create'
							onClick={() => setShowCreateModal(true)}
							onMouseEnter={() => {
								// Prefetch data när användaren hovrar över knappen
								if (!showCreateModal) {
									fetch('/api/projects').catch(() => {});
									fetch('/api/customers?pageSize=1000').catch(() => {});
								}
							}}
						>
							<Plus className='w-4 h-4 sm:mr-2' />
							<span className='hidden sm:inline'>Skapa arbetsorder</span>
							<span className='sm:hidden'>Skapa</span>
						</Button>
					)}
				</div>
			</div>

			{showFilters && (
				<WorkOrderFilters
					projects={projects}
					customers={customers}
					users={users}
					onClose={() => setShowFilters(false)}
				/>
			)}

			<Card className='bg-gray-800/50 border-gray-700' data-tour='work-orders-table'>
				<CardHeader>
					<CardTitle>Arbetsorder ({workOrders.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{workOrders.length === 0 ? (
						<div className='py-8 md:py-16 px-2 sm:px-4'>
							{/* Welcome Section */}
							<div className='max-w-2xl mx-auto text-center space-y-4 md:space-y-6'>
								{/* Icon */}
								<div className='flex justify-center'>
									<div className='bg-orange-100 dark:bg-orange-900/20 p-4 md:p-6 rounded-full'>
										<ClipboardList className='w-12 h-12 md:w-16 md:h-16 text-orange-600 dark:text-orange-400' />
									</div>
								</div>

								{/* Title and Description */}
								<div className='space-y-2 md:space-y-3'>
									<h2 className='text-xl md:text-2xl font-bold'>Välkommen till Arbetsorder! 👋</h2>
									<p className='text-sm md:text-lg text-muted-foreground px-2'>
										Arbetsorder hjälper dig att planera, spåra och hantera alla dina jobb på ett strukturerat sätt.
									</p>
								</div>

								{/* What are work orders */}
								<div className='bg-muted/50 rounded-lg p-4 md:p-6 text-left space-y-3 md:space-y-4'>
									<div className='flex items-start gap-2 md:gap-3'>
										<Lightbulb className='w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0' />
										<div>
											<h3 className='font-semibold mb-1 md:mb-2 text-sm md:text-base'>Vad är en arbetsorder?</h3>
											<p className='text-xs md:text-sm text-muted-foreground'>
												En arbetsorder är ett jobbkort som beskriver ett specifikt arbete som ska utföras. 
												Den innehåller all information som behövs: vad som ska göras, när, var, av vem och för vilken kund.
											</p>
										</div>
									</div>
								</div>

								{/* Benefits */}
								<div className='grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-left'>
									<div className='bg-gray-800/50 border-gray-700 border rounded-lg p-3 md:p-4 space-y-2'>
										<div className='flex items-center gap-2'>
											<CheckCircle2 className='w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0' />
											<h4 className='font-semibold text-sm md:text-base'>Bättre planering</h4>
										</div>
										<p className='text-xs md:text-sm text-muted-foreground'>
											Se alla kommande jobb på ett ställe och planera resurser i förväg
										</p>
									</div>
									<div className='bg-card border rounded-lg p-3 md:p-4 space-y-2'>
										<div className='flex items-center gap-2'>
											<CheckCircle2 className='w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0' />
											<h4 className='font-semibold text-sm md:text-base'>Spårbarhet</h4>
										</div>
										<p className='text-xs md:text-sm text-muted-foreground'>
											Följ status på varje jobb från planering till fakturering
										</p>
									</div>
									<div className='bg-card border rounded-lg p-3 md:p-4 space-y-2'>
										<div className='flex items-center gap-2'>
											<CheckCircle2 className='w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0' />
											<h4 className='font-semibold text-sm md:text-base'>Koppling till tid</h4>
										</div>
										<p className='text-xs md:text-sm text-muted-foreground'>
											Koppla tidsregistreringar direkt till arbetsorder för enklare fakturering
										</p>
									</div>
								</div>

								{/* How to get started */}
								<div className='bg-gray-800/50 border-gray-700 border rounded-lg p-4 md:p-6 text-left space-y-3 md:space-y-4'>
									<h3 className='font-semibold text-base md:text-lg flex items-center gap-2'>
										<ArrowRight className='w-4 h-4 md:w-5 md:h-5 text-orange-600 flex-shrink-0' />
										Så här kommer du igång:
									</h3>
									<ol className='space-y-2 md:space-y-3 list-decimal list-inside'>
										<li className='text-xs md:text-sm'>
											<span className='font-medium'>Klicka på "Skapa arbetsorder"</span> ovanför eller på knappen nedan
										</li>
										<li className='text-xs md:text-sm'>
											<span className='font-medium'>Välj projekt</span> - Koppla arbetsordern till ett befintligt projekt eller skapa ett nytt serviceprojekt
										</li>
										<li className='text-xs md:text-sm'>
											<span className='font-medium'>Fyll i detaljer</span> - Lägg till titel, beskrivning, datum, tid och plats
										</li>
										<li className='text-xs md:text-sm'>
											<span className='font-medium'>Tilldela personal</span> - Välj vem som ska utföra arbetet
										</li>
										<li className='text-xs md:text-sm'>
											<span className='font-medium'>Spara och börja arbeta</span> - Arbetsordern visas nu i listan och kan spåras
										</li>
									</ol>
								</div>

								{/* Quick tips */}
								<div className='grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-left'>
									<div className='flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-gray-800/50 border-gray-700 border rounded-lg'>
										<Users className='w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 flex-shrink-0' />
										<div>
											<h4 className='font-semibold mb-1 text-sm md:text-base'>Tips: Tilldela ansvarig</h4>
											<p className='text-xs md:text-sm text-muted-foreground'>
												Markera en person som ansvarig för att enkelt se vem som ska utföra jobbet
											</p>
										</div>
									</div>
									<div className='flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-gray-800/50 border-gray-700 border rounded-lg'>
										<MapPin className='w-4 h-4 md:w-5 md:h-5 text-green-600 mt-0.5 flex-shrink-0' />
										<div>
											<h4 className='font-semibold mb-1 text-sm md:text-base'>Tips: Lägg till plats</h4>
											<p className='text-xs md:text-sm text-muted-foreground'>
												Fyll i adress och dörrkod så att personalen vet exakt var jobbet ska utföras
											</p>
										</div>
									</div>
									<div className='flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-gray-800/50 border-gray-700 border rounded-lg'>
										<Clock className='w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-0.5 flex-shrink-0' />
										<div>
											<h4 className='font-semibold mb-1 text-sm md:text-base'>Tips: Använd heldag</h4>
											<p className='text-xs md:text-sm text-muted-foreground'>
												För jobb som sträcker sig över hela dagen, markera "Heldag" istället för att ange tider
											</p>
										</div>
									</div>
									<div className='flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-gray-800/50 border-gray-700 border rounded-lg'>
										<Calendar className='w-4 h-4 md:w-5 md:h-5 text-orange-600 mt-0.5 flex-shrink-0' />
										<div>
											<h4 className='font-semibold mb-1 text-sm md:text-base'>Tips: Koppla till planering</h4>
											<p className='text-xs md:text-sm text-muted-foreground'>
												Arbetsorder syns automatiskt i planeringsvyn för enkel översikt
											</p>
										</div>
									</div>
								</div>

								{/* CTA Button */}
								{canEdit ? (
									<div className='pt-2 md:pt-4'>
										<Button
											size='lg'
											onClick={() => setShowCreateModal(true)}
											onMouseEnter={() => {
												// Prefetch data when hovering over button
												if (!showCreateModal) {
													// Prefetch projects and customers
													fetch('/api/projects').catch(() => {});
													fetch('/api/customers?pageSize=1000').catch(() => {});
												}
											}}
											className='w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-4 md:py-6'
										>
											<Plus className='w-4 h-4 md:w-5 md:h-5 mr-2' />
											Skapa din första arbetsorder
										</Button>
										<p className='text-xs md:text-sm text-muted-foreground mt-2 md:mt-3'>
											Det tar bara några sekunder att komma igång
										</p>
									</div>
								) : (
									<div className='pt-2 md:pt-4'>
										<div className='bg-gray-800/50 border-gray-700 border rounded-lg p-3 md:p-4'>
											<p className='text-xs md:text-sm text-muted-foreground'>
												Du behöver administratörs- eller förmanbehörighet för att skapa arbetsorder. 
												Kontakta din administratör om du behöver skapa arbetsorder.
											</p>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						<>
							{/* Desktop Table View */}
							<div className='hidden md:block overflow-x-auto'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>WO-nummer</TableHead>
											<TableHead>Titel</TableHead>
											<TableHead>Kund</TableHead>
											<TableHead>Plats</TableHead>
											<TableHead>Projekt</TableHead>
											<TableHead>Ansvarig</TableHead>
											<TableHead>Planerat</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Prioritet</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{workOrders.map((workOrder) => (
											<TableRow
												key={workOrder.id}
												className='cursor-pointer hover:bg-muted/50'
												onClick={() => handleRowClick(workOrder.id)}
											>
												<TableCell className='font-mono text-sm'>
													{workOrder.work_order_number}
												</TableCell>
												<TableCell className='font-medium'>
													{workOrder.title}
												</TableCell>
												<TableCell>{getCustomerName(workOrder.customer)}</TableCell>
												<TableCell>
													{getStreetAddress(workOrder.location_address) || getStreetAddress(workOrder.project?.site_address) || '-'}
												</TableCell>
												<TableCell>
													{workOrder.project?.name || '-'}
												</TableCell>
												<TableCell>{getResponsibleUser(workOrder)}</TableCell>
												<TableCell>
													{formatDateTime(workOrder.planned_start_at)}
												</TableCell>
												<TableCell>
													{getStatusBadge(workOrder.status)}
												</TableCell>
												<TableCell>
													{getPriorityBadge(workOrder.priority)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Mobile Card View */}
							<div className='md:hidden space-y-3'>
								{workOrders.map((workOrder) => (
									<Card
										key={workOrder.id}
										className='cursor-pointer hover:bg-muted/50 transition-colors'
										onClick={() => handleRowClick(workOrder.id)}
									>
										<CardContent className='p-4 space-y-3'>
											<div className='flex items-start justify-between gap-2'>
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2 mb-1 flex-wrap'>
														<span className='font-mono text-xs text-muted-foreground'>
															{workOrder.work_order_number}
														</span>
														{getStatusBadge(workOrder.status)}
														{getPriorityBadge(workOrder.priority)}
													</div>
													<h3 className='font-semibold text-base truncate'>
														{workOrder.title}
													</h3>
												</div>
											</div>
											
											<div className='space-y-2 text-sm'>
												{workOrder.project?.name && (
													<div className='flex items-center gap-2'>
														<span className='text-muted-foreground min-w-[60px]'>Projekt:</span>
														<span className='truncate'>{workOrder.project.name}</span>
													</div>
												)}
												{workOrder.customer && (
													<div className='flex items-center gap-2'>
														<span className='text-muted-foreground min-w-[60px]'>Kund:</span>
														<span className='truncate'>{getCustomerName(workOrder.customer)}</span>
													</div>
												)}
												{(getStreetAddress(workOrder.location_address) || getStreetAddress(workOrder.project?.site_address)) && (
													<div className='flex items-center gap-2'>
														<span className='text-muted-foreground min-w-[60px]'>Plats:</span>
														<span className='truncate'>{getStreetAddress(workOrder.location_address) || getStreetAddress(workOrder.project?.site_address)}</span>
													</div>
												)}
												{getResponsibleUser(workOrder) !== '-' && (
													<div className='flex items-center gap-2'>
														<span className='text-muted-foreground min-w-[60px]'>Ansvarig:</span>
														<span className='truncate'>{getResponsibleUser(workOrder)}</span>
													</div>
												)}
												{workOrder.planned_start_at && (
													<div className='flex items-center gap-2'>
														<span className='text-muted-foreground min-w-[60px]'>Planerat:</span>
														<span className='truncate'>{formatDateTime(workOrder.planned_start_at)}</span>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<CreateWorkOrderModal
				source={{ source: 'calendar' }}
				open={showCreateModal}
				onOpenChange={setShowCreateModal}
				onSuccess={handleWorkOrderCreated}
				users={users.map(u => ({
					id: u.id,
					full_name: u.full_name || null,
					email: u.email || '',
				}))}
				orgId={orgId}
			/>
		</div>
	);
}

