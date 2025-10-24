'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users } from 'lucide-react';

interface AddToProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	userName: string;
	projectName: string;
}

export function AddToProjectDialog({
	open,
	onOpenChange,
	onConfirm,
	userName,
	projectName,
}: AddToProjectDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 rounded-full bg-orange-100">
							<Users className="w-5 h-5 text-orange-600" />
						</div>
						<AlertDialogTitle className="text-xl">
							Lägg till i projektteam?
						</AlertDialogTitle>
					</div>
					<AlertDialogDescription className="text-base leading-relaxed pt-2">
						<span className="font-semibold text-foreground">{userName}</span> är inte medlem i projektet{' '}
						<span className="font-semibold text-foreground">{projectName}</span>.
						<br />
						<br />
						Vill du lägga till {userName.split(' ')[0]} i projektteamet så att de kan se och rapportera på detta projekt?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Avbryt</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						className="bg-orange-600 hover:bg-orange-700"
					>
						Ja, lägg till i teamet
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

