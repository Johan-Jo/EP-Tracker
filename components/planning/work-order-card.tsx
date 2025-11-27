'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Wrench, MapPin } from 'lucide-react';
import Link from 'next/link';

interface WorkOrderCardProps {
	id: string;
	workOrderNumber: string;
	title: string;
	projectName: string;
	projectColor: string;
	startTime: string;
	endTime: string | null;
	address: string | null;
	status: string;
	priority: string | null;
	onClick?: (e: React.MouseEvent) => void;
}

export function WorkOrderCard({
	id,
	workOrderNumber,
	title,
	projectName,
	projectColor,
	startTime,
	endTime,
	address,
	status,
	priority,
	onClick,
}: WorkOrderCardProps) {
	const statusColors: Record<string, string> = {
		draft: 'bg-gray-500',
		assigned: 'bg-blue-500',
		in_progress: 'bg-orange-500',
		completed: 'bg-green-500',
		cancelled: 'bg-red-500',
	};

	const priorityColors: Record<string, string> = {
		low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
		high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
		urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
	};

	return (
		<Link href={`/dashboard/work-orders/${id}`} onClick={onClick}>
			<Card
				className="group relative mb-1 cursor-pointer border-l-4 bg-white p-2 shadow-sm transition-all hover:shadow-md dark:bg-gray-800"
				style={{ borderLeftColor: projectColor || '#6b7280' }}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<Wrench className="h-3 w-3 text-muted-foreground flex-shrink-0" />
							<span className="text-xs font-semibold text-muted-foreground truncate">
								{workOrderNumber}
							</span>
							{priority && (
								<Badge
									variant="outline"
									className={`text-xs px-1.5 py-0 ${priorityColors[priority] || ''}`}
								>
									{priority}
								</Badge>
							)}
						</div>
						<p className="text-sm font-medium text-foreground line-clamp-2 mb-1">
							{title}
						</p>
						<p className="text-xs text-muted-foreground truncate mb-1">
							{projectName}
						</p>
						<div className="flex items-center gap-2 text-xs text-muted-foreground">
							<span>{startTime}</span>
							{endTime && <span>– {endTime}</span>}
						</div>
						{address && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
								<MapPin className="h-3 w-3" />
								<span className="truncate">{address}</span>
							</div>
						)}
					</div>
					<Badge
						variant="outline"
						className={`${statusColors[status] || 'bg-gray-500'} text-white border-0 text-xs px-1.5 py-0 flex-shrink-0`}
					>
						{status === 'draft' ? 'Utkast' :
						 status === 'assigned' ? 'Tilldelad' :
						 status === 'in_progress' ? 'Pågår' :
						 status === 'completed' ? 'Klar' :
						 status === 'cancelled' ? 'Avbruten' : status}
					</Badge>
				</div>
			</Card>
		</Link>
	);
}

