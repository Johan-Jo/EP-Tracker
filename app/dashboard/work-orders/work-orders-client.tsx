'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Filter } from 'lucide-react';
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
}

export function WorkOrdersClient({
	initialWorkOrders,
	projects,
	customers,
	users,
	canEdit,
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
		<div className='p-4 md:p-8 space-y-6'>
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>Arbetsorder</h1>
					<p className='text-muted-foreground mt-1'>
						Hantera och planera arbetsorder
					</p>
				</div>
				<div className='flex gap-2'>
					<Button
						variant='outline'
						onClick={() => setShowFilters(!showFilters)}
					>
						<Filter className='w-4 h-4 mr-2' />
						Filter
					</Button>
					{canEdit && (
						<Button onClick={() => setShowCreateModal(true)}>
							<Plus className='w-4 h-4 mr-2' />
							Skapa arbetsorder
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

			<Card>
				<CardHeader>
					<CardTitle>Arbetsorder ({workOrders.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{workOrders.length === 0 ? (
						<div className='text-center py-12 text-muted-foreground'>
							<p>Inga arbetsorder hittades</p>
							{canEdit && (
								<Button
									variant='outline'
									className='mt-4'
									onClick={() => setShowCreateModal(true)}
								>
									<Plus className='w-4 h-4 mr-2' />
									Skapa första arbetsordern
								</Button>
							)}
						</div>
					) : (
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
											{workOrder.location_city || '-'}
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
					)}
				</CardContent>
			</Card>

			{showCreateModal && (
				<CreateWorkOrderModal
					projects={projects}
					customers={customers}
					users={users}
					onClose={() => setShowCreateModal(false)}
					onSuccess={handleWorkOrderCreated}
				/>
			)}
		</div>
	);
}

