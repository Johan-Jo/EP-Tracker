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
				return 'bg-green-100 text-green-700 border-green-200';
			case 'busy':
				return 'bg-orange-100 text-orange-700 border-orange-200';
			case 'vacation':
				return 'bg-blue-100 text-blue-700 border-blue-200';
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
		<div className="flex items-center gap-3 p-3 border-b border-border bg-card">
			<Avatar className="w-10 h-10 shrink-0">
				{avatar ? (
					<img src={avatar} alt={name} className="w-full h-full object-cover" />
				) : (
					<AvatarFallback className="bg-accent text-primary text-sm">
						{getInitials()}
					</AvatarFallback>
				)}
			</Avatar>

			<div className="flex-1 min-w-0">
				<p className="truncate">{name}</p>
				<p className="text-xs text-muted-foreground truncate">{role}</p>
			</div>

			<Badge variant="outline" className={`text-xs shrink-0 ${getStatusColor()}`}>
				{getStatusText()}
			</Badge>
		</div>
	);
}

