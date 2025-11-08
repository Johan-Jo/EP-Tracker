'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export type PersonStatus = 'available' | 'busy' | 'vacation';

interface PersonRowProps {
	id: string;
	name: string;
	role: string;
	status: PersonStatus;
	avatar?: string;
}

export function PersonRow({ name, role, status, avatar }: PersonRowProps) {
	const getStatusColor = () => {
		switch (status) {
			case 'available':
				return 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
			case 'busy':
				return 'border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-200';
			case 'vacation':
				return 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200';
		}
	};

	const getStatusText = () => {
		switch (status) {
			case 'available':
				return 'Ledig';
			case 'busy':
				return 'Upptagen';
			case 'vacation':
				return 'Semester';
		}
	};

	const getInitials = () => {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	return (
		<div className="flex items-center gap-3 rounded-xl bg-white/95 px-3 py-2 text-left transition-colors dark:bg-white/5">
			<Avatar className="h-10 w-10 shrink-0 border border-border/60 shadow-sm dark:border-white/10">
				{avatar ? (
					<img src={avatar} alt={name} className="h-full w-full object-cover" />
				) : (
					<AvatarFallback className="bg-orange-500/15 text-sm font-semibold text-orange-600 dark:bg-orange-500/20 dark:text-orange-200">
						{getInitials()}
					</AvatarFallback>
				)}
			</Avatar>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-foreground dark:text-white">{name}</p>
				<p className="truncate text-xs text-muted-foreground dark:text-white/70">{role}</p>
			</div>

			<Badge variant="outline" className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${getStatusColor()}`}>
				{getStatusText()}
			</Badge>
		</div>
	);
}

