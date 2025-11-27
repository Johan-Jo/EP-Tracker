'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';

interface WorkOrderTodayCardProps {
	workOrder: {
		id: string;
		work_order_number: string;
		title: string;
		description?: string | null;
		project: {
			id: string;
			name: string;
			project_number?: string | null;
			site_address?: string | null;
		};
		customer?: {
			id: string;
			type: string;
			company_name?: string | null;
			first_name?: string | null;
			last_name?: string | null;
		} | null;
		planned_start_at: string;
		planned_end_at: string | null;
		all_day: boolean;
		status: string;
		priority: string | null;
		location_address?: string | null;
		location_city?: string | null;
		location_zip?: string | null;
		location_lat?: number | null;
		location_lng?: number | null;
		actual_start_at?: string | null;
		actual_end_at?: string | null;
	};
	onStartWork: (workOrderId: string) => void;
	onEndWork: (workOrderId: string) => void;
	isStarting?: boolean;
	isEnding?: boolean;
}

export function WorkOrderTodayCard({
	workOrder,
	onStartWork,
	onEndWork,
	isStarting,
	isEnding,
}: WorkOrderTodayCardProps) {
	const startTime = workOrder.all_day
		? 'Heldag'
		: format(new Date(workOrder.planned_start_at), 'HH:mm', { locale: sv });
	const endTime = workOrder.all_day
		? ''
		: (workOrder.planned_end_at ? format(new Date(workOrder.planned_end_at), 'HH:mm', { locale: sv }) : '');
	const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;

	const address = workOrder.location_address || workOrder.project.site_address || '';
	const customerName = workOrder.customer
		? workOrder.customer.type === 'COMPANY'
			? workOrder.customer.company_name
			: `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
		: '';

	const getStatusBadge = () => {
		switch (workOrder.status) {
			case 'assigned':
				return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Tilldelad</Badge>;
			case 'in_progress':
				return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Pågår</Badge>;
			case 'completed':
				return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Klar</Badge>;
			default:
				return null;
		}
	};

	const getPriorityBadge = () => {
		if (!workOrder.priority) return null;
		const colors: Record<string, string> = {
			low: 'bg-blue-100 text-blue-700 border-blue-200',
			medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
			high: 'bg-orange-100 text-orange-700 border-orange-200',
			urgent: 'bg-red-100 text-red-700 border-red-200',
		};
		const labels: Record<string, string> = {
			low: 'Låg',
			medium: 'Medium',
			high: 'Hög',
			urgent: 'Akut',
		};
		return (
			<Badge variant="outline" className={colors[workOrder.priority] || ''}>
				{labels[workOrder.priority] || workOrder.priority}
			</Badge>
		);
	};

	const handleNavigate = () => {
		if (workOrder.location_lat && workOrder.location_lng) {
			// Use coordinates if available (more accurate)
			window.open(`https://www.google.com/maps/search/?api=1&query=${workOrder.location_lat},${workOrder.location_lng}`, '_blank');
		} else if (address) {
			// Fallback to address
			const fullAddress = [address, workOrder.location_city, workOrder.location_zip].filter(Boolean).join(', ');
			const encodedAddress = encodeURIComponent(fullAddress);
			window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
		}
	};

	const isStarted = !!workOrder.actual_start_at;
	const isCompleted = !!workOrder.actual_end_at;

	return (
		<Card className="border-l-4 border-l-orange-500">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<CardTitle className="text-lg mb-1 flex items-center gap-2">
							<span className="truncate">{workOrder.title}</span>
						</CardTitle>
						<p className="text-xs text-muted-foreground mb-1">
							{workOrder.work_order_number}
						</p>
						<p className="text-sm font-medium text-foreground mb-1">
							{workOrder.project.name}
						</p>
						{customerName && (
							<p className="text-sm text-muted-foreground">{customerName}</p>
						)}
					</div>
					<div className="flex flex-col gap-1 items-end flex-shrink-0">
						{getStatusBadge()}
						{getPriorityBadge()}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Time */}
				<div className="flex items-center gap-2 text-sm">
					<Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
					<span>{timeDisplay}</span>
				</div>

				{/* Address */}
				{address && (
					<div className="flex items-center gap-2 text-sm">
						<MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
						<span className="truncate">{address}</span>
					</div>
				)}

				{/* Description */}
				{workOrder.description && (
					<div className="text-sm text-muted-foreground">
						<p className="line-clamp-2">{workOrder.description}</p>
					</div>
				)}

				{/* Actions */}
				<div className="flex flex-wrap gap-2 pt-2">
					{address && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleNavigate}
							className="flex-1"
						>
							<Navigation className="w-4 h-4 mr-2" />
							Navigera
						</Button>
					)}

					{!isStarted && !isCompleted && (
						<Button
							size="sm"
							onClick={() => onStartWork(workOrder.id)}
							disabled={isStarting}
							className="flex-1 bg-green-600 hover:bg-green-700"
						>
							{isStarting ? (
								<>Startar...</>
							) : (
								<>
									<Play className="w-4 h-4 mr-2" />
									Starta arbete
								</>
							)}
						</Button>
					)}

					{isStarted && !isCompleted && (
						<Button
							size="sm"
							onClick={() => onEndWork(workOrder.id)}
							disabled={isEnding}
							className="flex-1 bg-blue-600 hover:bg-blue-700"
						>
							{isEnding ? (
								<>Avslutar...</>
							) : (
								<>
									<Square className="w-4 h-4 mr-2" />
									Avsluta arbete
								</>
							)}
						</Button>
					)}

					<Button
						variant="outline"
						size="sm"
						asChild
						className="flex-1"
					>
						<Link href={`/dashboard/work-orders/${workOrder.id}`}>
							Öppna
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

