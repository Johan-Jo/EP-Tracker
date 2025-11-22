'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit2, Calendar, MapPin, Users, Clock, Image, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkOrderWithRelations } from '@/lib/schemas/work-order';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { WorkOrderGeneralTab } from '@/components/work-orders/work-order-general-tab';
import { WorkOrderLocationTab } from '@/components/work-orders/work-order-location-tab';
import { WorkOrderPlanningTab } from '@/components/work-orders/work-order-planning-tab';
import { WorkOrderTimeTab } from '@/components/work-orders/work-order-time-tab';
import { WorkOrderCompletionTab } from '@/components/work-orders/work-order-completion-tab';

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

interface TimeEntry {
	id: string;
	user_id: string;
	start_at: string;
	stop_at: string | null;
	duration_min: number | null;
	task_label: string | null;
	notes: string | null;
	user?: {
		id: string;
		full_name?: string;
		email?: string;
	};
}

interface DiaryEntry {
	id: string;
	date: string;
	work_performed: string | null;
	created_by: string;
	created_at: string;
	created_by_user?: {
		id: string;
		full_name?: string;
	};
}

interface WorkOrderDetailClientProps {
	workOrder: WorkOrderWithRelations;
	timeEntries: TimeEntry[];
	diaryEntries: DiaryEntry[];
	projects: Project[];
	customers: Customer[];
	users: User[];
	canEdit: boolean;
}

export function WorkOrderDetailClient({
	workOrder,
	timeEntries,
	diaryEntries,
	projects,
	customers,
	users,
	canEdit,
}: WorkOrderDetailClientProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState('general');

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

	const handleWorkOrderUpdated = () => {
		router.refresh();
	};

	return (
		<div className='p-4 md:p-8 space-y-6'>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-4'>
					<Button variant='ghost' size='icon' onClick={() => router.back()}>
						<ArrowLeft className='w-4 h-4' />
					</Button>
					<div>
						<div className='flex items-center gap-2'>
							<h1 className='text-3xl font-bold tracking-tight'>
								{workOrder.work_order_number}
							</h1>
							{getStatusBadge(workOrder.status)}
							{getPriorityBadge(workOrder.priority)}
						</div>
						<p className='text-muted-foreground mt-1'>{workOrder.title}</p>
					</div>
				</div>
				{canEdit && (
					<Button variant='outline' onClick={() => setActiveTab('general')}>
						<Edit2 className='w-4 h-4 mr-2' />
						Redigera
					</Button>
				)}
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
				<TabsList className='grid w-full grid-cols-6'>
					<TabsTrigger value='general'>Allmänt</TabsTrigger>
					<TabsTrigger value='location'>Kund & Plats</TabsTrigger>
					<TabsTrigger value='planning'>Planering</TabsTrigger>
					<TabsTrigger value='time'>Tid & Material</TabsTrigger>
					<TabsTrigger value='images'>Bilder</TabsTrigger>
					<TabsTrigger value='completion'>Avslut</TabsTrigger>
				</TabsList>

				<TabsContent value='general' className='mt-6'>
					<WorkOrderGeneralTab
						workOrder={workOrder}
						projects={projects}
						customers={customers}
						canEdit={canEdit}
						onUpdate={handleWorkOrderUpdated}
					/>
				</TabsContent>

				<TabsContent value='location' className='mt-6'>
					<WorkOrderLocationTab
						workOrder={workOrder}
						customer={workOrder.customer}
						canEdit={canEdit}
						onUpdate={handleWorkOrderUpdated}
					/>
				</TabsContent>

				<TabsContent value='planning' className='mt-6'>
					<WorkOrderPlanningTab
						workOrder={workOrder}
						users={users}
						canEdit={canEdit}
						onUpdate={handleWorkOrderUpdated}
					/>
				</TabsContent>

				<TabsContent value='time' className='mt-6'>
					<WorkOrderTimeTab
						workOrder={workOrder}
						timeEntries={timeEntries}
						canEdit={canEdit}
					/>
				</TabsContent>

				<TabsContent value='images' className='mt-6'>
					<Card>
						<CardHeader>
							<CardTitle>Bilder & Dokument</CardTitle>
						</CardHeader>
						<CardContent>
							<p className='text-muted-foreground'>
								Bildhantering kommer snart. Bilder från dagbok kopplad till denna arbetsorder visas här.
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value='completion' className='mt-6'>
					<WorkOrderCompletionTab
						workOrder={workOrder}
						canEdit={canEdit}
						onUpdate={handleWorkOrderUpdated}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

