'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, X, FolderKanban, Clock, Users, FileCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChecklistItem {
	id: string;
	title: string;
	description: string;
	icon: any;
	action: string;
	href?: string;
}

const checklistItems: ChecklistItem[] = [
	{
		id: 'create-project',
		title: 'Skapa ditt första projekt',
		description: 'Alla tidrapporter kopplas till ett projekt',
		icon: FolderKanban,
		action: 'Skapa projekt',
		href: '/dashboard/projects/new',
	},
	{
		id: 'log-time',
		title: 'Logga din första tid',
		description: 'Starta timern eller lägg till tid manuellt',
		icon: Clock,
		action: 'Rapportera tid',
		href: '/dashboard/time',
	},
	{
		id: 'invite-team',
		title: 'Bjud in ditt team',
		description: 'Lägg till kolleger i din organisation',
		icon: Users,
		action: 'Hantera användare',
		href: '/dashboard/settings/users',
	},
	{
		id: 'first-approval',
		title: 'Godkänn första veckan',
		description: 'Granska och godkänn tidrapporter för export',
		icon: FileCheck,
		action: 'Gå till godkännanden',
		href: '/dashboard/approvals',
	},
];

export function QuickStartChecklist() {
	const router = useRouter();
	const [completed, setCompleted] = useState<Record<string, boolean>>({});
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		// Load completed items from localStorage
		const stored = localStorage.getItem('quick-start-checklist');
		if (stored) {
			setCompleted(JSON.parse(stored));
		}

		// Check if dismissed
		const isDismissed = localStorage.getItem('quick-start-dismissed');
		if (isDismissed === 'true') {
			setDismissed(true);
		}
	}, []);

	function markComplete(itemId: string) {
		const newCompleted = { ...completed, [itemId]: true };
		setCompleted(newCompleted);
		localStorage.setItem('quick-start-checklist', JSON.stringify(newCompleted));
	}

	function handleDismiss() {
		setDismissed(true);
		localStorage.setItem('quick-start-dismissed', 'true');
	}

	const completedCount = Object.keys(completed).filter(key => completed[key]).length;
	const totalCount = checklistItems.length;
	const allComplete = completedCount === totalCount;

	// Don't show if dismissed or all complete
	if (dismissed || allComplete) {
		return null;
	}

	return (
		<Card className="border-2 border-primary/20 relative z-[1003]">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="flex items-center gap-2">
							Snabbstart
							<span className="text-sm font-normal text-muted-foreground">
								{completedCount}/{totalCount}
							</span>
						</CardTitle>
						<CardDescription>
							Kom igång med EP Tracker på några minuter
						</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={handleDismiss}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
				{/* Progress bar */}
				<div className="mt-4">
					<div className="h-2 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{ width: `${(completedCount / totalCount) * 100}%` }}
						/>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{checklistItems.map((item) => {
					const Icon = item.icon;
					const isComplete = completed[item.id];

					return (
						<div
							key={item.id}
							className={`flex items-start gap-3 p-3 rounded-lg border ${
								isComplete
									? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900'
									: 'bg-muted/50 hover:bg-muted'
							} transition-colors`}
						>
							<div className="flex-shrink-0 mt-0.5">
								{isComplete ? (
									<CheckCircle2 className="h-5 w-5 text-green-600" />
								) : (
									<Circle className="h-5 w-5 text-muted-foreground" />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-start gap-2">
									<Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
									<div className="flex-1">
										<p className={`font-medium ${isComplete ? 'line-through text-muted-foreground' : ''}`}>
											{item.title}
										</p>
										<p className="text-sm text-muted-foreground">
											{item.description}
										</p>
									</div>
								</div>
							</div>
							{!isComplete && item.href && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										markComplete(item.id);
										router.push(item.href!);
									}}
								>
									{item.action}
								</Button>
							)}
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

