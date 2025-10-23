'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Navigation, CheckCircle, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MobileJobCardProps {
	assignment: {
		id: string;
		project: {
			name: string;
			client_name?: string | null;
			color: string;
			site_address?: string | null;
		};
		start_ts: string;
		end_ts: string;
		all_day: boolean;
		status: string;
		address?: string | null;
		note?: string | null;
		mobile_notes?: Array<{ content: string; pinned: boolean }>;
	};
	onCheckIn: (assignmentId: string) => void;
	onCheckOut: (assignmentId: string) => void;
	isCheckingIn?: boolean;
	isCheckingOut?: boolean;
}

export function MobileJobCard({
	assignment,
	onCheckIn,
	onCheckOut,
	isCheckingIn,
	isCheckingOut,
}: MobileJobCardProps) {
	const startTime = assignment.all_day
		? 'Heldag'
		: format(new Date(assignment.start_ts), 'HH:mm', { locale: sv });
	const endTime = assignment.all_day
		? ''
		: format(new Date(assignment.end_ts), 'HH:mm', { locale: sv });
	const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime;

	const address = assignment.address || assignment.project.site_address || '';
	const customer = assignment.project.client_name || '';

	const getStatusBadge = () => {
		switch (assignment.status) {
			case 'planned':
				return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Planerad</Badge>;
			case 'in_progress':
				return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Pågående</Badge>;
			case 'done':
				return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Klar</Badge>;
			default:
				return null;
		}
	};

	const handleNavigate = () => {
		if (address) {
			const encodedAddress = encodeURIComponent(address);
			window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
		}
	};

	return (
		<Card className="border-l-4" style={{ borderLeftColor: assignment.project.color }}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg mb-1">{assignment.project.name}</CardTitle>
						{customer && (
							<p className="text-sm text-muted-foreground">{customer}</p>
						)}
					</div>
					{getStatusBadge()}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Time */}
				<div className="flex items-center gap-2 text-sm">
					<Clock className="w-4 h-4 text-muted-foreground" />
					<span>{timeDisplay}</span>
				</div>

				{/* Address */}
				{address && (
					<div className="flex items-center gap-2 text-sm">
						<MapPin className="w-4 h-4 text-muted-foreground" />
						<span>{address}</span>
					</div>
				)}

				{/* Pinned Notes */}
				{assignment.mobile_notes && assignment.mobile_notes.filter(n => n.pinned).length > 0 && (
					<div className="bg-amber-50 border border-amber-200 rounded-md p-2">
						<p className="text-xs font-medium text-amber-900 mb-1">Viktig information:</p>
						{assignment.mobile_notes.filter(n => n.pinned).map((note, idx) => (
							<p key={idx} className="text-sm text-amber-800">{note.content}</p>
						))}
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

					{assignment.status === 'planned' && (
						<Button
							size="sm"
							onClick={() => onCheckIn(assignment.id)}
							disabled={isCheckingIn}
							className="flex-1 bg-green-600 hover:bg-green-700"
						>
							{isCheckingIn ? (
								<>Checkar in...</>
							) : (
								<>
									<LogIn className="w-4 h-4 mr-2" />
									Checka in
								</>
							)}
						</Button>
					)}

					{assignment.status === 'in_progress' && (
						<Button
							size="sm"
							onClick={() => onCheckOut(assignment.id)}
							disabled={isCheckingOut}
							className="flex-1 bg-blue-600 hover:bg-blue-700"
						>
							{isCheckingOut ? (
								<>Checkar ut...</>
							) : (
								<>
									<CheckCircle className="w-4 h-4 mr-2" />
									Checka ut
								</>
							)}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

